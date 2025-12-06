# Missing AllowThis

## Overview

This example demonstrates the FHE encryption mechanism, showing how to convert external encrypted inputs to internal encrypted values using input proofs and shows how to manage FHE permissions for both contracts and users using external encrypted inputs with input proofs for verification.

## What You'll Learn

- **FHE.add operation** - How to perform this specific homomorphic operation on encrypted values
- **Off-chain encryption** - Encrypting values locally before sending to contract
- **FHE permissions** - Granting permissions for operations and decryption

## Key Concepts

### 1. FHE.add Operation

The `FHE.add()` function performs addition on encrypted values, computing the sum without ever decrypting the operands.

### 2. Off-Chain Encryption

Values are encrypted **locally** (on the client side) before being sent to the contract:
- Plaintext values never appear in transactions
- Encryption is cryptographically bound to [contract, user] pair
- Input proofs verify the binding

### 3. FHE Permissions

Permissions control who can:
- **Perform operations**: Contracts need `FHE.allowThis()`
- **Decrypt values**: Users need `FHE.allow()`

## Step-by-Step Walkthrough

### Step 1: Set Encrypted Values

Encrypt your values off-chain and send them to the contract using `setValueCorrect()`.

### Step 2: Perform FHE.add Operation

Call the function that performs `FHE.add` (e.g., `setValueWrong()`).

## Common Pitfalls

### ❌ Pitfall 1: should set value with wrong pattern (missing allowThis)

**The Problem:** This will set the value, but without allowThis

**Why it fails:** The operation fails due to incorrect usage, permissions, or signer mismatch.

**The Fix:** Ensure proper setup, matching signers, and correct permissions.

### ❌ Pitfall 2: should fail when trying to use value without allowThis

**The Problem:** Set value with wrong pattern (missing allowThis)

**Why it fails:** The operation fails due to incorrect usage, permissions, or signer mismatch.

**The Fix:** Ensure proper setup, matching signers, and correct permissions.

### ❌ Pitfall 3: should fail when trying to use value without allowThis permission

**The Problem:** Common pitfall: Forgetting to call FHE.allowThis() after setting value

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

{% tab title="MissingAllowThis.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Missing AllowThis - Anti-Pattern Example
/// @notice Demonstrates what happens when FHE.allowThis() is missing
/// @dev This example shows:
///      - Why FHE.allowThis() is required
///      - What happens when it's missing
///      - The correct pattern with both permissions
/// 
/// @dev Key Concept:
///      - FHE.allowThis() grants permission to the contract itself
///      - FHE.allow() grants permission to a specific user
///      - Both are typically needed for operations to work
contract MissingAllowThis is ZamaEthereumConfig {
    /// @notice Encrypted value with correct permissions
    euint32 private _encryptedValueCorrect;
    
    /// @notice Encrypted value with missing allowThis (will fail)
    euint32 private _encryptedValueWrong;
    
    /// @notice Set value with CORRECT pattern
    /// @param _encryptedInput The encrypted input
    /// @param _inputProof The proof for the encrypted input
    /// @dev ✅ DO: Grant both permissions
    function setValueCorrect(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        _encryptedValueCorrect = FHE.fromExternal(_encryptedInput, _inputProof);
        
        // ✅ DO: Grant both permissions
        FHE.allowThis(_encryptedValueCorrect);        // Contract permission
        FHE.allow(_encryptedValueCorrect, msg.sender); // User permission
        
        // This will work correctly
    }
    
    /// @notice Set value with WRONG pattern (missing allowThis)
    /// @param _encryptedInput The encrypted input
    /// @param _inputProof The proof for the encrypted input
    /// @dev ❌ DON'T: Forget allowThis
    ///      This will fail when trying to perform operations
    function setValueWrong(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        _encryptedValueWrong = FHE.fromExternal(_encryptedInput, _inputProof);
        
        // ❌ DON'T: Only grant user permission, forget allowThis
        // FHE.allowThis(_encryptedValueWrong); // MISSING!
        FHE.allow(_encryptedValueWrong, msg.sender); // Only user permission
        
        // This will fail when trying to use _encryptedValueWrong in operations
        // because the contract doesn't have permission
    }
    
    /// @notice Try to use value with correct permissions
    /// @param _encryptedInput The encrypted input to add
    /// @param _inputProof The proof for the encrypted input
    /// @dev This should work because allowThis was granted
    function useValueCorrect(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        euint32 encryptedInput = FHE.fromExternal(_encryptedInput, _inputProof);
        FHE.allowThis(encryptedInput);
        FHE.allow(encryptedInput, msg.sender);
        
        // ✅ This works because _encryptedValueCorrect has allowThis
        _encryptedValueCorrect = FHE.add(_encryptedValueCorrect, encryptedInput);
        
        FHE.allowThis(_encryptedValueCorrect);
        FHE.allow(_encryptedValueCorrect, msg.sender);
    }
    
    /// @notice Try to use value with missing allowThis
    /// @param _encryptedInput The encrypted input to add
    /// @param _inputProof The proof for the encrypted input
    /// @dev This will FAIL because allowThis was not granted to _encryptedValueWrong
    ///      The contract cannot perform operations on values it doesn't have permission for
    function useValueWrong(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        euint32 encryptedInput = FHE.fromExternal(_encryptedInput, _inputProof);
        FHE.allowThis(encryptedInput);
        FHE.allow(encryptedInput, msg.sender);
        
        // ❌ This will FAIL because _encryptedValueWrong doesn't have allowThis
        // The contract cannot add to a value it doesn't have permission for
        // This will revert with a permission error
        _encryptedValueWrong = FHE.add(_encryptedValueWrong, encryptedInput);
        
        FHE.allowThis(_encryptedValueWrong);
        FHE.allow(_encryptedValueWrong, msg.sender);
    }
    
    /// @notice Get handle for correct value
    /// @return The handle
    function getHandleCorrect() external view returns (bytes32) {
        return FHE.toBytes32(_encryptedValueCorrect);
    }
    
    /// @notice Get handle for wrong value
    /// @return The handle
    function getHandleWrong() external view returns (bytes32) {
        return FHE.toBytes32(_encryptedValueWrong);
    }
}


```

{% endtab %}

{% tab title="MissingAllowThis.ts" %}

```typescript
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { MissingAllowThis, MissingAllowThis__factory } from "../../types";
import { expect } from "chai";

/**
 * @title Missing AllowThis Test Suite
 * @notice Tests demonstrating what happens when FHE.allowThis() is missing
 */

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("MissingAllowThis")) as MissingAllowThis__factory;
  const contract = (await factory.deploy()) as MissingAllowThis;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("MissingAllowThis", function () {
  let signers: Signers;
  let contract: MissingAllowThis;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      this.skip();
    }
    ({ contract, contractAddress } = await deployFixture());
  });

  it("should work with correct pattern (allowThis + allow)", async function () {
    const clearValue = 42;
    const encrypted = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(clearValue)
      .encrypt();

    await contract
      .connect(signers.alice)
      .setValueCorrect(encrypted.handles[0], encrypted.inputProof);

    const handle = await contract.getHandleCorrect();
    expect(handle).to.not.eq(ethers.ZeroHash);
  });

  it("should allow operations with correct permissions", async function () {
    // Set value correctly
    const initialValue = 10;
    const encrypted1 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(initialValue)
      .encrypt();
    await contract.connect(signers.alice).setValueCorrect(encrypted1.handles[0], encrypted1.inputProof);

    // Add to value (should work)
    const addValue = 5;
    const encrypted2 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(addValue)
      .encrypt();
    
    // This should work because allowThis was granted
    await contract
      .connect(signers.alice)
      .useValueCorrect(encrypted2.handles[0], encrypted2.inputProof);

    const handle = await contract.getHandleCorrect();
    expect(handle).to.not.eq(ethers.ZeroHash);
  });

  it("should set value with wrong pattern (missing allowThis)", async function () {
    const clearValue = 100;
    const encrypted = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(clearValue)
      .encrypt();

    // This will set the value, but without allowThis
    await contract
      .connect(signers.alice)
      .setValueWrong(encrypted.handles[0], encrypted.inputProof);

    const handle = await contract.getHandleWrong();
    expect(handle).to.not.eq(ethers.ZeroHash);
  });

  it("should fail when trying to use value without allowThis", async function () {
    // Set value with wrong pattern (missing allowThis)
    const initialValue = 10;
    const encrypted1 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(initialValue)
      .encrypt();
    await contract.connect(signers.alice).setValueWrong(encrypted1.handles[0], encrypted1.inputProof);

    // Try to use the value (should fail)
    const addValue = 5;
    const encrypted2 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(addValue)
      .encrypt();

    // ❌ This should fail because allowThis was not granted
    // The contract cannot perform operations on values it doesn't have permission for
    await expect(
      contract
        .connect(signers.alice)
        .useValueWrong(encrypted2.handles[0], encrypted2.inputProof)
    ).to.be.reverted; // Will revert with permission error
  });

  // ❌ Common Pitfalls
  describe("❌ Common Pitfalls", function () {
    it("should fail when trying to use value without allowThis permission", async function () {
      // Common pitfall: Forgetting to call FHE.allowThis() after setting value
      const clearValue = 200;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      // Set value without allowThis
      await contract.connect(signers.alice).setValueWrong(encrypted.handles[0], encrypted.inputProof);

      // Try to use the value in an operation (should fail)
      const addValue = 10;
      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(addValue)
        .encrypt();

      await expect(
        contract
          .connect(signers.alice)
          .useValueWrong(encrypted2.handles[0], encrypted2.inputProof)
      ).to.be.reverted;
    });

    it("should fail when trying to grant permission after value is already set", async function () {
      // Common pitfall: Trying to grant permissions after the fact
      // Permissions must be granted immediately after creating/using encrypted values
      const clearValue = 150;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      // Set value without allowThis
      await contract.connect(signers.alice).setValueWrong(encrypted.handles[0], encrypted.inputProof);

      // The value is now stored but contract doesn't have permission
      // Trying to use it will fail - you can't grant permission retroactively
      const useValue = 20;
      const encrypted3 = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(useValue)
        .encrypt();

      await expect(
        contract
          .connect(signers.alice)
          .useValueWrong(encrypted3.handles[0], encrypted3.inputProof)
      ).to.be.reverted;
    });

    it("should fail when contract tries to use value it doesn't have permission for", async function () {
      // Common pitfall: Contract operations fail without proper permissions
      const initialValue = 30;
      const encrypted1 = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(initialValue)
        .encrypt();
      
      // Set with wrong pattern (no allowThis)
      await contract.connect(signers.alice).setValueWrong(encrypted1.handles[0], encrypted1.inputProof);

      // Contract cannot perform operations on values without allowThis
      const operationValue = 5;
      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(operationValue)
        .encrypt();

      // This will fail because the contract doesn't have permission to use the stored value
      await expect(
        contract
          .connect(signers.alice)
          .useValueWrong(encrypted2.handles[0], encrypted2.inputProof)
      ).to.be.reverted;
    });
  });
});


```

{% endtab %}

{% endtabs %}
