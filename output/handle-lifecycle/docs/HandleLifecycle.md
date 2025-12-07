# Handle Lifecycle

## Overview

Handles are symbolic representations of encrypted values. This example demonstrates adding encrypted values, converting external encrypted inputs using Fully Homomorphic Encryption and shows how to manage FHE permissions for both contracts and users using external encrypted inputs with input proofs for verification.

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

Encrypt your values off-chain and send them to the contract using `setValue()`.

### Step 2: Perform FHE.add Operation

Call the function that performs `FHE.add` (e.g., `getEncryptedValue()`).

## Common Pitfalls

### ❌ Pitfall 1: should fail when using wrong signer for handle creation

**The Problem:** Common pitfall: Handle created with wrong signer

**Why it fails:** The input proof verification or permission check fails when requirements aren't met.

**The Fix:** Always ensure signers match and permissions are granted correctly.

### ❌ Pitfall 2: should fail when trying to use handle without proof

**The Problem:** Common pitfall: Trying to use handle directly without proof

**Why it fails:** The input proof verification or permission check fails when requirements aren't met.

**The Fix:** Always ensure signers match and permissions are granted correctly.

### ❌ Pitfall 3: should fail when handle and proof don

**The Problem:** Set initial value to get a valid handle

**Why it fails:** The input proof verification or permission check fails when requirements aren't met.

**The Fix:** Always ensure signers match and permissions are granted correctly.

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

{% tab title="HandleLifecycle.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Handle Lifecycle
/// @notice Explains how handles are generated and their lifecycle
/// @dev This example demonstrates:
///      - How handles are generated
///      - Handle lifecycle (creation, use, decryption)
///      - Symbolic execution
///      - How handles represent encrypted values
/// 
/// @dev Key Concepts:
///      - Handles are symbolic representations of encrypted values
///      - Generated during encryption (client-side)
///      - Used in contract operations
///      - Converted to bytes32 for storage/events
///      - Used for decryption
contract HandleLifecycle is ZamaEthereumConfig {
    /// @notice Encrypted value
    euint32 private _encryptedValue;
    
    /// @notice Handle stored as bytes32 (for demonstration)
    bytes32 public storedHandle;
    
    /// @notice Event emitted with handle
    event ValueStored(bytes32 indexed handle);
    
    /// @notice Set value and demonstrate handle lifecycle
    /// @param _encryptedInput The encrypted input (contains handle)
    /// @param _inputProof The proof for the encrypted input
    /// @dev This demonstrates the handle lifecycle:
    ///      1. Handle is generated client-side during encryption
    ///      2. Handle is passed to contract via externalEuint32
    ///      3. Contract converts to euint32 (internal handle)
    ///      4. Handle can be converted to bytes32 for storage/events
    ///      5. Handle is used for operations and decryption
    function setValue(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        // Step 1: Convert external encrypted input to internal format
        // This creates an internal handle from the external handle
        _encryptedValue = FHE.fromExternal(_encryptedInput, _inputProof);
        
        // Step 2: Convert handle to bytes32 for storage/events
        // Handles are internally managed, but can be converted to bytes32
        storedHandle = FHE.toBytes32(_encryptedValue);
        
        // Grant permissions
        FHE.allowThis(_encryptedValue);
        FHE.allow(_encryptedValue, msg.sender);
        
        emit ValueStored(storedHandle);
    }
    
    /// @notice Get the encrypted value (returns handle)
    /// @return The encrypted value (handle)
    /// @dev The handle can be used for decryption off-chain
    function getEncryptedValue() external view returns (euint32) {
        return _encryptedValue;
    }
    
    /// @notice Get the handle as bytes32
    /// @return The handle as bytes32
    /// @dev Useful for events, storage, or passing to other contracts
    function getHandle() external view returns (bytes32) {
        return FHE.toBytes32(_encryptedValue);
    }
    
    /// @notice Perform operation and demonstrate handle transformation
    /// @param _encryptedInput The encrypted input to add
    /// @param _inputProof The proof for the encrypted input
    /// @dev This demonstrates that operations create new handles
    ///      The result has a new handle, different from the operands
    function addToValue(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        euint32 encryptedInput = FHE.fromExternal(_encryptedInput, _inputProof);
        
        // Operation creates a new handle for the result
        // The result handle is different from _encryptedValue and encryptedInput
        _encryptedValue = FHE.add(_encryptedValue, encryptedInput);
        
        // Update stored handle
        storedHandle = FHE.toBytes32(_encryptedValue);
        
        // Grant permissions for new handle
        FHE.allowThis(_encryptedValue);
        FHE.allow(_encryptedValue, msg.sender);
        
        emit ValueStored(storedHandle);
    }
    
    /// @notice Demonstrate handle in operations
    /// @dev This shows that handles are used in symbolic execution
    ///      The FHEVM framework performs operations on handles symbolically
    function demonstrateHandleOperations() external returns (bytes32) {
        // Handles are used in operations
        // The framework performs symbolic execution
        // Operations don't decrypt values, they operate on encrypted handles
        
        // Example: Create a constant encrypted value
        euint32 constantValue = FHE.asEuint32(10);
        
        // Operations work on handles, not decrypted values
        // This is symbolic execution
        euint32 result = FHE.add(_encryptedValue, constantValue);
        
        // Return handle as bytes32
        return FHE.toBytes32(result);
    }
}


```

{% endtab %}

{% tab title="HandleLifecycle.ts" %}

```typescript
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { HandleLifecycle, HandleLifecycle__factory } from "../../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

/**
 * @title Handle Lifecycle Test Suite
 * @notice Tests demonstrating handle generation and lifecycle
 */

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("HandleLifecycle")) as HandleLifecycle__factory;
  const contract = (await factory.deploy()) as HandleLifecycle;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("HandleLifecycle", function () {
  let signers: Signers;
  let contract: HandleLifecycle;
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

  it("should store handle when setting value", async function () {
    const clearValue = 42;
    const encrypted = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(clearValue)
      .encrypt();

    await contract
      .connect(signers.alice)
      .setValue(encrypted.handles[0], encrypted.inputProof);

    const storedHandle = await contract.storedHandle();
    expect(storedHandle).to.not.eq(ethers.ZeroHash);
  });

  it("should return handle as bytes32", async function () {
    const clearValue = 100;
    const encrypted = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(clearValue)
      .encrypt();

    await contract
      .connect(signers.alice)
      .setValue(encrypted.handles[0], encrypted.inputProof);

    const handle = await contract.getHandle();
    expect(handle).to.not.eq(ethers.ZeroHash);
  });

  it("should update handle after operation", async function () {
    // Set initial value
    const initialValue = 10;
    const encrypted1 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(initialValue)
      .encrypt();
    await contract.connect(signers.alice).setValue(encrypted1.handles[0], encrypted1.inputProof);
    const handle1 = await contract.getHandle();

    // Add to value (creates new handle)
    const addValue = 5;
    const encrypted2 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(addValue)
      .encrypt();
    await contract.connect(signers.alice).addToValue(encrypted2.handles[0], encrypted2.inputProof);
    const handle2 = await contract.getHandle();

    // Handles should be different (new operation creates new handle)
    expect(handle2).to.not.eq(handle1);
  });

  // ❌ Common Pitfalls
  describe("❌ Common Pitfalls", function () {
    it("should fail when using wrong signer for handle creation", async function () {
      // Common pitfall: Handle created with wrong signer
      const clearValue = 42;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.deployer.address) // Wrong signer!
        .add32(clearValue)
        .encrypt();

      // Should fail because signer doesn't match
      await expect(
        contract
          .connect(signers.alice)
          .setValue(encrypted.handles[0], encrypted.inputProof)
      ).to.be.reverted;
    });

    it("should fail when trying to use handle without proof", async function () {
      // Common pitfall: Trying to use handle directly without proof
      const clearValue = 42;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      // Try to use handle with empty/invalid proof
      const emptyProof = "0x";

      // Should fail without valid proof
      await expect(
        contract
          .connect(signers.alice)
          .setValue(encrypted.handles[0], emptyProof)
      ).to.be.reverted;
    });

    it("should fail when handle and proof don't match", async function () {
      // Set initial value to get a valid handle
      const value1 = 10;
      const encrypted1 = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(value1)
        .encrypt();
      await contract.connect(signers.alice).setValue(encrypted1.handles[0], encrypted1.inputProof);

      // Create new encrypted input
      const value2 = 20;
      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(value2)
        .encrypt();

      // Try to use handle from encrypted2 with proof from encrypted1 (should fail)
      await expect(
        contract
          .connect(signers.alice)
          .setValue(encrypted2.handles[0], encrypted1.inputProof)
      ).to.be.reverted;
    });
  });
});


```

{% endtab %}

{% endtabs %}
