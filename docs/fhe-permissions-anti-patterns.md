# FHE Permissions Anti-Patterns

<!-- chapter: anti-patterns -->

## Overview

This example demonstrates common FHE permission anti-patterns that developers encounter. Learn what happens when you forget FHE.allowThis() after computation, when you miss FHE.allow(user) preventing decryption, when view functions return handles without proper permissions, and when transfers fail to propagate permissions to recipients. Each anti-pattern shows the WRONG way and the CORRECT fix.

## What You'll Learn

- **Missing allowThis()** - What happens when you forget to grant contract permission after FHE operations
- **Missing allow(user)** - Why users can't decrypt values without explicit permission
- **View function permissions** - View functions CAN return handles, but users need permission to decrypt
- **Transfer permission propagation** - Why recipients can't use transferred balances without permission grants
- **Cross-contract delegation** - Using allowTransient for temporary access in cross-contract calls

## Key Concepts

### 1. FHE.allowThis() Permission

After any FHE computation that produces a new encrypted value, the contract must call `FHE.allowThis(value)` to grant itself permission to use that value in future operations. Without this, the contract loses access to its own computed values.

### 2. FHE.allow(user) Permission

For users to decrypt encrypted values, they must be explicitly granted permission via `FHE.allow(value, userAddress)`. Without this, even if the value is stored correctly, no one can decrypt it.

### 3. View Functions and Encrypted Handles

**Important clarification**: View functions CAN return encrypted handles (euint32, ebool, etc.). This is explicitly supported in FHEVM. However, the caller must have been granted permission to decrypt the handle. The common misconception is that view functions can't return encrypted values - they can, but ACL modifications (allow, allowThis) cannot happen in view functions.

### 4. Permission Propagation in Transfers

When transferring encrypted values between users, both sender and recipient need permission updates. The sender's new balance and the recipient's new balance are both new encrypted values that require fresh permission grants.

### 5. Cross-Contract Permissions with allowTransient

When calling another contract that needs to operate on your encrypted values, use `FHE.allowTransient(value, targetContract)` to grant temporary permission that expires at the end of the transaction. This is more gas-efficient than permanent permissions for single-use delegations.

## Step-by-Step Walkthrough

### Step 1: Understand the Anti-Pattern

Each function in this contract demonstrates a common permission mistake. The "wrong" functions show what NOT to do, while the "correct" functions show the proper implementation.

### Step 2: Compare Wrong vs Correct Implementations

Study the pairs of functions:
- `wrongMissingAllowThis()` vs `correctWithAllowThis()`
- `wrongMissingUserAllow()` vs `correctWithUserAllow()`
- `wrongStoreWithoutPermission()` vs `correctStoreWithPermission()`
- `wrongTransferWithoutPermission()` vs `correctTransferWithPermission()`
- `wrongCrossContractCall()` vs `correctCrossContractCall()`

### Step 3: Test Each Scenario

Run the test suite to see how each anti-pattern manifests:
- "Correct" functions allow successful decryption
- "Wrong" functions store values but users can't access them

### Step 4: Apply to Your Code

When writing your own contracts:
1. Always call `FHE.allowThis()` after any FHE computation
2. Call `FHE.allow(value, user)` for each user who needs to decrypt
3. Update permissions for all parties in transfers
4. Use `FHE.allowTransient()` for cross-contract calls

## Common Pitfalls

### ❌ Pitfall 1: ❌ wrongMissingAllowThis stores value but contract loses access

**The Problem:** const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      const value = 50;

      const input = await fhevm.createEncryptedInput(cont...

**Why it fails:** The operation fails due to incorrect usage, permissions, or signer mismatch.

**The Fix:** Ensure proper setup, matching signers, and correct permissions.

### ❌ Pitfall 2: ❌ wrongMissingUserAllow prevents user from decrypting

**The Problem:** const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      const value = 100;

      const input = await fhevm.createEncryptedInput(con...

**Why it fails:** The operation fails due to incorrect usage, permissions, or signer mismatch.

**The Fix:** Ensure proper setup, matching signers, and correct permissions.

### ❌ Pitfall 3: ❌ wrongStoreWithoutPermission - view returns handle but user can

**The Problem:** const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      const value = 42;

      const input = await fhevm.createEncryptedInput(cont...

**Why it fails:** The operation fails due to incorrect usage, permissions, or signer mismatch.

**The Fix:** Ensure proper setup, matching signers, and correct permissions.

## Best Practices

1. **Always match encryption signer with transaction signer**
2. **Grant permissions immediately after creating encrypted values**
3. **Use descriptive variable names** for clarity
4. **Validate inputs** before performing operations

## Real-World Use Cases

- **Confidential Accounting**: Sum or multiply encrypted balances
- **Privacy-Preserving Analytics**: Aggregate encrypted data points
- **Confidential Calculations**: Perform financial computations on encrypted values
{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}

{% tab title="FHEPermissionsAntiPatterns.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint32, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Permissions Anti-Patterns
/// @notice Permission management anti-patterns in FHE development.
///         Covers mistakes with allowThis, allow, and permission propagation
///         across transfers and cross-contract calls.
/// @dev Explores missing permissions, view function failures, and delegation issues.
contract FHEPermissionsAntiPatterns is ZamaEthereumConfig {
  euint32 private _secretValue;
  mapping(address => euint32) private _balances;

  // ═══════════════════════════════════════════════════════════════════════
  // ANTI-PATTERN 1: Missing allowThis After Computation
  // ═══════════════════════════════════════════════════════════════════════

  /// @notice ❌ WRONG: Compute but forget allowThis
  /// @dev Result exists but contract can't use it in future operations
  function wrongMissingAllowThis(
    externalEuint32 input,
    bytes calldata inputProof
  ) external {
    _secretValue = FHE.fromExternal(input, inputProof);
    euint32 doubled = FHE.mul(_secretValue, FHE.asEuint32(2));
    _secretValue = doubled;

    // ❌ Missing FHE.allowThis! Contract can't use this value later
    FHE.allow(_secretValue, msg.sender);
  }

  /// @notice ✅ CORRECT: Always grant allowThis after computation
  /// @dev Contract needs permission to use encrypted values
  function correctWithAllowThis(
    externalEuint32 input,
    bytes calldata inputProof
  ) external {
    _secretValue = FHE.fromExternal(input, inputProof);
    euint32 doubled = FHE.mul(_secretValue, FHE.asEuint32(2));
    _secretValue = doubled;

    FHE.allowThis(_secretValue);
    FHE.allow(_secretValue, msg.sender);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ANTI-PATTERN 2: Missing allow(user)
  // ═══════════════════════════════════════════════════════════════════════

  /// @notice ❌ WRONG: Only allowThis without user permission
  /// @dev No one can decrypt the value
  function wrongMissingUserAllow(
    externalEuint32 input,
    bytes calldata inputProof
  ) external {
    _secretValue = FHE.fromExternal(input, inputProof);

    // ❌ Contract can compute but no one can decrypt!
    FHE.allowThis(_secretValue);
  }

  /// @notice ✅ CORRECT: Grant both allowThis and allow(user)
  /// @dev User can decrypt after contract operations
  function correctWithUserAllow(
    externalEuint32 input,
    bytes calldata inputProof
  ) external {
    _secretValue = FHE.fromExternal(input, inputProof);

    FHE.allowThis(_secretValue);
    FHE.allow(_secretValue, msg.sender);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ANTI-PATTERN 3: View Function Without Permissions
  // ═══════════════════════════════════════════════════════════════════════

  /// @notice ❌ WRONG: Store value without granting permission to caller
  /// @dev When caller tries to get value via view, they can't decrypt it
  function wrongStoreWithoutPermission(
    externalEuint32 input,
    bytes calldata inputProof
  ) external {
    _secretValue = FHE.fromExternal(input, inputProof);

    // ❌ Only allowThis, caller has no permission!
    FHE.allowThis(_secretValue);
  }

  /// @notice ✅ CORRECT: Grant permission to caller when storing
  /// @dev Caller can now decrypt value returned from view function
  function correctStoreWithPermission(
    externalEuint32 input,
    bytes calldata inputProof
  ) external {
    _secretValue = FHE.fromExternal(input, inputProof);

    FHE.allowThis(_secretValue);
    FHE.allow(_secretValue, msg.sender); // ✅ Grant permission!
  }

  /// @notice View function to get stored value
  /// @dev View functions CAN return encrypted handles - they just can't modify ACL
  function getValue() external view returns (euint32) {
    return _secretValue;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ANTI-PATTERN 4: Transfer Without Permission Propagation
  // ═══════════════════════════════════════════════════════════════════════

  /// @notice Initialize balance for msg.sender
  /// @dev Required before using transfer functions
  function initializeBalance(
    externalEuint32 initialBalance,
    bytes calldata inputProof
  ) external {
    _balances[msg.sender] = FHE.fromExternal(initialBalance, inputProof);
    FHE.allowThis(_balances[msg.sender]);
    FHE.allow(_balances[msg.sender], msg.sender);
  }

  /// @notice ❌ WRONG: Transfer without granting permissions
  /// @dev Recipient gets balance but can't use or decrypt it
  function wrongTransferWithoutPermission(
    address recipient,
    externalEuint32 amount,
    bytes calldata inputProof
  ) external {
    euint32 transferAmount = FHE.fromExternal(amount, inputProof);

    _balances[msg.sender] = FHE.sub(_balances[msg.sender], transferAmount);
    _balances[recipient] = FHE.add(_balances[recipient], transferAmount);

    // ❌ Recipient has no permission to use their new balance!
  }

  /// @notice ✅ CORRECT: Grant permissions after transfer
  /// @dev Both parties can use and decrypt their updated balances
  function correctTransferWithPermission(
    address recipient,
    externalEuint32 amount,
    bytes calldata inputProof
  ) external {
    euint32 transferAmount = FHE.fromExternal(amount, inputProof);

    _balances[msg.sender] = FHE.sub(_balances[msg.sender], transferAmount);
    _balances[recipient] = FHE.add(_balances[recipient], transferAmount);

    // ✅ Grant permissions to both parties
    FHE.allowThis(_balances[msg.sender]);
    FHE.allow(_balances[msg.sender], msg.sender);
    FHE.allowThis(_balances[recipient]);
    FHE.allow(_balances[recipient], recipient);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ANTI-PATTERN 5: Cross-Contract Permission Delegation
  // ═══════════════════════════════════════════════════════════════════════

  /// @notice ❌ WRONG: Call another contract without granting permission
  /// @dev Other contract can't use the encrypted value
  function wrongCrossContractCall(address processor) external returns (bool) {
    // ❌ processor contract has no permission to use _secretValue!
    // This call will fail or return garbage
    (bool success, ) = processor.call(
      abi.encodeWithSignature("process(uint256)", _secretValue)
    );
    return success;
  }

  /// @notice ✅ CORRECT: Grant temporary permission before cross-contract call
  /// @dev Use allowTransient for gas-efficient temporary access
  function correctCrossContractCall(address processor) external returns (bool) {
    // ✅ Grant temporary permission (expires at end of transaction)
    FHE.allowTransient(_secretValue, processor);

    // Now processor can use _secretValue in this transaction
    (bool success, ) = processor.call(
      abi.encodeWithSignature("process(uint256)", _secretValue)
    );

    return success;
  }

  /// @notice Helper to get balance for testing
  function getBalance(address user) external view returns (euint32) {
    return _balances[user];
  }
}


```

{% endtab %}

{% tab title="FHEPermissionsAntiPatterns.ts" %}

```typescript
import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import type { FHEPermissionsAntiPatterns, FHEPermissionsAntiPatterns__factory } from "../../types";

type Signers = {
  owner: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHEPermissionsAntiPatterns")) as unknown as FHEPermissionsAntiPatterns__factory;
  const contract = (await factory.deploy()) as FHEPermissionsAntiPatterns;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

/**
 * @chapter anti-patterns
 * @title FHE Permissions Anti-Patterns Test
 * @notice Tests demonstrating common permission mistakes in FHE development
 */
describe("FHEPermissionsAntiPatterns", function () {
  let contract: FHEPermissionsAntiPatterns;
  let contractAddress: string;
  let signers: Signers;

  before(async function () {
    if (!hre.fhevm.isMock) {
      throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`);
    }
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { owner: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    const deployment = await deployFixture();
    contractAddress = deployment.contractAddress;
    contract = deployment.contract;
  });

  describe("Anti-Pattern 1: Missing allowThis After Computation", function () {
    it("should work correctly when using correctWithAllowThis", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      const value = 50;

      const input = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(value).encrypt();
      const tx = await contract.connect(signers.alice).correctWithAllowThis(input.handles[0], input.inputProof);
      await tx.wait();

      // Should be able to get the value
      const encryptedResult = await contract.getValue();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      // Value should be doubled (50 * 2 = 100)
      expect(clearResult).to.equal(value * 2);
    });

    it("❌ wrongMissingAllowThis stores value but contract loses access", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      const value = 50;

      const input = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(value).encrypt();
      
      // This call succeeds but the contract won't be able to use the value later
      const tx = await contract.connect(signers.alice).wrongMissingAllowThis(input.handles[0], input.inputProof);
      await tx.wait();

      // The value is stored but without allowThis, the contract can't use it
      // This demonstrates the anti-pattern - operation succeeds but creates unusable state
    });
  });

  describe("Anti-Pattern 2: Missing allow(user)", function () {
    it("should work correctly when using correctWithUserAllow", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      const value = 100;

      const input = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(value).encrypt();
      const tx = await contract.connect(signers.alice).correctWithUserAllow(input.handles[0], input.inputProof);
      await tx.wait();

      // User should be able to decrypt
      const encryptedResult = await contract.getValue();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.equal(value);
    });

    it("❌ wrongMissingUserAllow prevents user from decrypting", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      const value = 100;

      const input = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(value).encrypt();
      const tx = await contract.connect(signers.alice).wrongMissingUserAllow(input.handles[0], input.inputProof);
      await tx.wait();

      // Value is stored but user can't decrypt it without allow(user) permission
      // The contract has allowThis but user has no permission
    });
  });

  describe("Anti-Pattern 3: View Function Without Permissions", function () {
    it("view functions CAN return encrypted handles", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      const value = 42;

      // First store with correct permissions
      const input = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(value).encrypt();
      const tx = await contract.connect(signers.alice).correctStoreWithPermission(input.handles[0], input.inputProof);
      await tx.wait();

      // View function returns the handle - this is ALLOWED
      const encryptedResult = await contract.getValue();
      
      // User can decrypt because they have permission
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.equal(value);
    });

    it("❌ wrongStoreWithoutPermission - view returns handle but user can't decrypt", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      const value = 42;

      const input = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(value).encrypt();
      const tx = await contract.connect(signers.alice).wrongStoreWithoutPermission(input.handles[0], input.inputProof);
      await tx.wait();

      // View function still returns the handle (this works!)
      const encryptedResult = await contract.getValue();
      expect(encryptedResult).to.not.equal(0n);

      // But user can't decrypt without permission
      // This demonstrates: view CAN return handles, but user needs permission to decrypt
    });
  });

  describe("Anti-Pattern 4: Transfer Without Permission Propagation", function () {
    it("should work correctly with correctTransferWithPermission", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

      // Initialize Alice's balance
      const aliceBalance = 1000;
      const aliceInput = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(aliceBalance).encrypt();
      let tx = await contract.connect(signers.alice).initializeBalance(aliceInput.handles[0], aliceInput.inputProof);
      await tx.wait();

      // Initialize Bob's balance
      const bobBalance = 500;
      const bobInput = await fhevm.createEncryptedInput(contractAddress, signers.bob.address).add32(bobBalance).encrypt();
      tx = await contract.connect(signers.bob).initializeBalance(bobInput.handles[0], bobInput.inputProof);
      await tx.wait();

      // Transfer from Alice to Bob with correct permissions
      const transferAmount = 200;
      const transferInput = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(transferAmount).encrypt();
      tx = await contract.connect(signers.alice).correctTransferWithPermission(
        signers.bob.address,
        transferInput.handles[0],
        transferInput.inputProof
      );
      await tx.wait();

      // Both should be able to decrypt their balances
      const aliceEncryptedBalance = await contract.getBalance(signers.alice.address);
      const aliceClearBalance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        aliceEncryptedBalance,
        contractAddress,
        signers.alice,
      );
      expect(aliceClearBalance).to.equal(aliceBalance - transferAmount);

      const bobEncryptedBalance = await contract.getBalance(signers.bob.address);
      const bobClearBalance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        bobEncryptedBalance,
        contractAddress,
        signers.bob,
      );
      expect(bobClearBalance).to.equal(bobBalance + transferAmount);
    });

    it("❌ wrongTransferWithoutPermission - recipient can't use their balance", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

      // Initialize Alice's balance
      const aliceBalance = 1000;
      const aliceInput = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(aliceBalance).encrypt();
      let tx = await contract.connect(signers.alice).initializeBalance(aliceInput.handles[0], aliceInput.inputProof);
      await tx.wait();

      // Transfer without proper permissions
      const transferAmount = 200;
      const transferInput = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(transferAmount).encrypt();
      tx = await contract.connect(signers.alice).wrongTransferWithoutPermission(
        signers.bob.address,
        transferInput.handles[0],
        transferInput.inputProof
      );
      await tx.wait();

      // Transfer happened but Bob has no permission to use his new balance
      // This demonstrates the anti-pattern
    });
  });

  // ❌ Common Pitfalls
  describe("❌ Common Pitfalls", function () {
    it("should fail when using wrong signer for encrypted input", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

      // Create input with Alice's address but try to use with Bob
      const input = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(100).encrypt();
      
      // Bob tries to use Alice's proof
      await expect(
        contract.connect(signers.bob).correctWithUserAllow(input.handles[0], input.inputProof)
      ).to.be.reverted;
    });

    it("should fail with invalid proof", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      const input = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(100).encrypt();
      
      // Use invalid proof
      const invalidProof = "0x" + "00".repeat(32);
      
      await expect(
        contract.connect(signers.alice).correctWithUserAllow(input.handles[0], invalidProof)
      ).to.be.reverted;
    });
  });
});


```

{% endtab %}

{% endtabs %}
