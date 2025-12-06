# Allow Transient

<!-- chapter: access-control -->

## Overview

Demonstrates FHE.allowTransient() for temporary permissions. FHE.allowTransient() grants permission for a single operation only. This example demonstrates adding encrypted values, converting external encrypted inputs using Fully Homomorphic Encryption and shows how to manage FHE permissions for both contracts and users using external encrypted inputs with input proofs for verification.

## What You'll Learn

- **FHE.add operation** - How to perform this specific homomorphic operation on encrypted values
- **Off-chain encryption** - Encrypting values locally before sending to contract
- **FHE permissions** - Granting permissions for operations and decryption
- **User decryption** - Decrypting results for authorized users

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

Encrypt your values off-chain and send them to the contract using `initialize()`.

### Step 2: Perform FHE.add Operation

Call the function that performs `FHE.add` (e.g., `addWithPermanentPermission()`).

### Step 3: Decrypt Result

Use `userDecrypt` to retrieve the plaintext result.

## Common Pitfalls

### ❌ Pitfall: Signer Mismatch

**The Problem:** Using wrong signer for encrypted input.

**Why it fails:** The input proof binds the handle to a specific user address. If the transaction signer doesn't match, verification fails.

**The Fix:** Always match encryption signer with transaction signer:

```typescript
const enc = await fhevm.createEncryptedInput(contractAddress, user.address).encrypt();
await contract.connect(user).initialize(enc.handles[0], enc.inputProof);
```

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

{% tab title="AllowTransient.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Allow Transient Example
/// @notice Demonstrates FHE.allowTransient() for temporary permissions
/// @dev This example shows:
///      - How to use FHE.allowTransient() for single-operation permissions
///      - When to use transient vs permanent permissions
///      - The difference between allow(), allowThis(), and allowTransient()
/// 
/// @dev Key Concepts:
///      - FHE.allowTransient() grants permission for a single operation only
///      - Permission is automatically revoked after the operation
///      - Useful when you don't want to grant permanent access
///      - More secure for one-time operations
contract AllowTransient is ZamaEthereumConfig {
    /// @notice Encrypted value stored in the contract
    euint32 private _encryptedValue;
    
    /// @notice Encrypted temporary value (for transient example)
    euint32 private _tempValue;
    
    /// @notice Event emitted when value is updated
    event ValueUpdated(address indexed updater);
    
    /// @notice Event emitted when transient operation is performed
    event TransientOperationPerformed(address indexed operator);
    
    /// @notice Initialize the contract with an encrypted value
    /// @param _encryptedInput The encrypted input value
    /// @param _inputProof The proof for the encrypted input
    function initialize(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        _encryptedValue = FHE.fromExternal(_encryptedInput, _inputProof);
        
        // Grant permanent permissions (standard pattern)
        FHE.allowThis(_encryptedValue);
        FHE.allow(_encryptedValue, msg.sender);
    }
    
    /// @notice Perform an operation using permanent permissions
    /// @param _encryptedInput The encrypted input to add
    /// @param _inputProof The proof for the encrypted input
    /// @dev This uses permanent permissions (allow + allowThis)
    function addWithPermanentPermission(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        euint32 encryptedInput = FHE.fromExternal(_encryptedInput, _inputProof);
        
        // Grant permanent permissions to the input
        FHE.allowThis(encryptedInput);
        FHE.allow(encryptedInput, msg.sender);
        
        // Perform operation
        _encryptedValue = FHE.add(_encryptedValue, encryptedInput);
        
        // Grant permissions for result
        FHE.allowThis(_encryptedValue);
        FHE.allow(_encryptedValue, msg.sender);
        
        emit ValueUpdated(msg.sender);
    }
    
    /// @notice Perform an operation using transient permission
    /// @param _encryptedInput The encrypted input to add
    /// @param _inputProof The proof for the encrypted input
    /// @dev This demonstrates FHE.allowTransient()
    ///      The permission is automatically revoked after the operation
    function addWithTransientPermission(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        euint32 encryptedInput = FHE.fromExternal(_encryptedInput, _inputProof);
        
        // ✅ DO: Use allowTransient for one-time operations
        // This grants permission only for this single operation
        // Permission is automatically revoked after the operation completes
        // allowTransient(value, address) - grants permission to address for this operation
        FHE.allowTransient(encryptedInput, address(this));
        
        // Perform operation
        // The transient permission allows this operation
        _encryptedValue = FHE.add(_encryptedValue, encryptedInput);
        
        // Grant permissions for result (permanent)
        FHE.allowThis(_encryptedValue);
        FHE.allow(_encryptedValue, msg.sender);
        
        // Note: encryptedInput's transient permission is now revoked
        // If we tried to use it again, it would fail
        
        emit TransientOperationPerformed(msg.sender);
    }
    
    /// @notice Example: Compare two values using transient permission
    /// @param _encryptedInput The encrypted input to compare
    /// @param _inputProof The proof for the encrypted input
    /// @return The comparison result (encrypted boolean)
    /// @dev This shows transient permission for a comparison operation
    ///      Note: Returns encrypted boolean - must be decrypted off-chain
    function compareWithTransient(externalEuint32 _encryptedInput, bytes calldata _inputProof) 
        external 
        returns (ebool) 
    {
        euint32 encryptedInput = FHE.fromExternal(_encryptedInput, _inputProof);
        
        // Use transient permission for comparison
        // We don't need permanent access to the input, just for this comparison
        FHE.allowTransient(encryptedInput, address(this));
        
        // Perform comparison (returns encrypted boolean)
        // This operation is allowed due to transient permission
        ebool result = FHE.eq(_encryptedValue, encryptedInput);
        
        // Grant permissions for result so it can be decrypted
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
        
        // Transient permission is automatically revoked after this function
        return result;
    }
    
    /// @notice Get the encrypted value
    /// @return The encrypted value
    function getEncryptedValue() external view returns (euint32) {
        return _encryptedValue;
    }
    
    /// @notice Example showing when NOT to use transient
    /// @param _encryptedInput The encrypted input
    /// @param _inputProof The proof for the encrypted input
    /// @dev This stores the value, so we need permanent permission
    function storeValue(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        _tempValue = FHE.fromExternal(_encryptedInput, _inputProof);
        
        // ❌ DON'T: Use transient if you need to store the value
        // Transient permission is revoked after the function, so stored value becomes unusable
        // ✅ DO: Use permanent permissions for stored values
        FHE.allowThis(_tempValue);
        FHE.allow(_tempValue, msg.sender);
    }
}


```

{% endtab %}

{% tab title="AllowTransient.ts" %}

```typescript
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { AllowTransient, AllowTransient__factory } from "../../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

/**
 * @chapter access-control
 * @title Allow Transient Test Suite
 * @notice Tests for AllowTransient contract demonstrating temporary permissions
 * @dev This test suite shows:
 *      - ✅ How to use FHE.allowTransient() for one-time operations
 *      - ✅ Difference between transient and permanent permissions
 *      - ✅ When to use transient vs permanent permissions
 */

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("AllowTransient")) as unknown as AllowTransient__factory;
  const contract = (await factory.deploy()) as AllowTransient;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("AllowTransient", function () {
  let signers: Signers;
  let contract: AllowTransient;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      alice: ethSigners[1],
      bob: ethSigners[2],
    };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());

    // Initialize with a value
    const clearValue = 50;
    const encrypted = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(clearValue)
      .encrypt();

    await contract
      .connect(signers.alice)
      .initialize(encrypted.handles[0], encrypted.inputProof);
  });

  describe("✅ Permanent Permissions", function () {
    it("should allow adding with permanent permission", async function () {
      const addValue = 25;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(addValue)
        .encrypt();

      await contract
        .connect(signers.alice)
        .addWithPermanentPermission(encrypted.handles[0], encrypted.inputProof);

      const encryptedValue = await contract.connect(signers.alice).getEncryptedValue();
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedValue,
        contractAddress,
        signers.alice,
      );

      expect(decrypted).to.eq(75); // 50 + 25
    });
  });

  describe("✅ Transient Permissions", function () {
    it("should allow adding with transient permission", async function () {
      const addValue = 30;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(addValue)
        .encrypt();

      await contract
        .connect(signers.alice)
        .addWithTransientPermission(encrypted.handles[0], encrypted.inputProof);

      const encryptedValue = await contract.connect(signers.alice).getEncryptedValue();
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedValue,
        contractAddress,
        signers.alice,
      );

      expect(decrypted).to.eq(80); // 50 + 30
    });

    it("should allow comparison with transient permission", async function () {
      const compareValue = 50;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(compareValue)
        .encrypt();

      // compareWithTransient returns ebool - get return value using staticCall first
      // This gives us the handle without executing a transaction
      const resultHandle = await contract
        .connect(signers.alice)
        .compareWithTransient.staticCall(encrypted.handles[0], encrypted.inputProof);

      // Now call it normally to grant permissions to the result
      // The result handle already has permissions granted in the function
      await contract
        .connect(signers.alice)
        .compareWithTransient(encrypted.handles[0], encrypted.inputProof);

      // Convert result to string handle - handle BigNumber or other types
      let handle: string;
      if (typeof resultHandle === 'string') {
        handle = resultHandle;
      } else if (resultHandle && typeof resultHandle === 'object' && 'toHexString' in resultHandle) {
        // Handle BigNumber or similar objects
        handle = (resultHandle as any).toHexString();
      } else {
        handle = ethers.hexlify(resultHandle);
      }
      
      const decrypted = await fhevm.userDecryptEbool(
        handle,
        contractAddress,
        signers.alice,
      );

      expect(decrypted).to.be.true; // 50 == 50
    });

    it("should allow comparison with different value using transient", async function () {
      const compareValue = 100;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(compareValue)
        .encrypt();

      // compareWithTransient returns ebool - get return value using staticCall first
      // This gives us the handle without executing a transaction
      const resultHandle = await contract
        .connect(signers.alice)
        .compareWithTransient.staticCall(encrypted.handles[0], encrypted.inputProof);

      // Now call it normally to grant permissions to the result
      // The result handle already has permissions granted in the function
      await contract
        .connect(signers.alice)
        .compareWithTransient(encrypted.handles[0], encrypted.inputProof);

      // Convert result to string handle - handle BigNumber or other types
      let handle: string;
      if (typeof resultHandle === 'string') {
        handle = resultHandle;
      } else if (resultHandle && typeof resultHandle === 'object' && 'toHexString' in resultHandle) {
        // Handle BigNumber or similar objects
        handle = (resultHandle as any).toHexString();
      } else {
        handle = ethers.hexlify(resultHandle);
      }
      
      const decrypted = await fhevm.userDecryptEbool(
        handle,
        contractAddress,
        signers.alice,
      );

      expect(decrypted).to.be.false; // 50 != 100
    });
  });

  describe("✅ Stored Values", function () {
    it("should store value with permanent permission", async function () {
      const storeValue = 200;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(storeValue)
        .encrypt();

      await contract
        .connect(signers.alice)
        .storeValue(encrypted.handles[0], encrypted.inputProof);

      // Value should be stored and accessible
      // Note: The contract doesn't expose getTempValue, but the operation should succeed
      // This demonstrates that stored values need permanent permissions, not transient
    });
  });
});


```

{% endtab %}

{% endtabs %}
