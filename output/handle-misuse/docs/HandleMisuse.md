# Handle Misuse - Anti-Pattern Example

## Overview

Handles are bound to specific contracts. This example demonstrates the FHE encryption mechanism, showing how to convert external encrypted inputs to internal encrypted values using input proofs and shows how to manage FHE permissions for both contracts and users using external encrypted inputs with input proofs for verification.

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

Call the function that performs `FHE.add` (e.g., `useHandleFromOtherContract()`).

## Common Pitfalls

### ❌ Pitfall 1: should fail when using handle without corresponding proof

**The Problem:** Common pitfall: Handle and proof must match

**Why it fails:** The input proof verification or permission check fails when requirements aren't met.

**The Fix:** Always ensure signers match and permissions are granted correctly.

### ❌ Pitfall 2: should fail when using handle from different encrypted input

**The Problem:** Common pitfall: Mixing handles and proofs from different inputs

**Why it fails:** The input proof verification or permission check fails when requirements aren't met.

**The Fix:** Always ensure signers match and permissions are granted correctly.

### ❌ Pitfall 3: should fail when wrong signer tries to use handle

**The Problem:** Common pitfall: Handle created for one signer but used by another

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

{% tab title="HandleMisuse.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Handle Misuse - Anti-Pattern Example
/// @notice Demonstrates incorrect handle usage patterns
/// @dev This example shows:
///      - How handles should be used
///      - Common mistakes with handles
///      - Why handles can't be reused across contracts
///      - Correct handle lifecycle management
/// 
/// @dev Key Concepts:
///      - Handles are bound to specific contracts
///      - Handles from one contract can't be used in another
///      - Each encryption creates a unique handle
///      - Handles must be used with their corresponding proofs
contract HandleMisuse is ZamaEthereumConfig {
    /// @notice Encrypted value
    euint32 private _encryptedValue;
    
    /// @notice Set value correctly
    /// @param _encryptedInput The encrypted input
    /// @param _inputProof The proof for the encrypted input
    /// @dev ✅ DO: Use handle with its corresponding proof
    function setValueCorrect(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        // ✅ DO: Use handle with its proof
        // The handle and proof are bound together
        _encryptedValue = FHE.fromExternal(_encryptedInput, _inputProof);
        
        FHE.allowThis(_encryptedValue);
        FHE.allow(_encryptedValue, msg.sender);
    }
    
    /// @notice ❌ DON'T: Try to use handle from different contract
    /// @param _handleFromOtherContract Handle from a different contract
    /// @dev This won't work - handles are contract-specific
    ///      This is commented out because it won't compile/work correctly
    /*
    function useHandleFromOtherContract(bytes32 _handleFromOtherContract) external {
        // ❌ DON'T: Handles are bound to specific contracts
        // A handle from Contract A cannot be used in Contract B
        // This will fail because the handle doesn't belong to this contract
        _encryptedValue = FHE.fromBytes32(_handleFromOtherContract); // ERROR
    }
    */
    
    /// @notice ❌ DON'T: Try to reuse handle without proof
    /// @dev Handles must always be used with their proofs
    ///      This is commented out because it won't work
    /*
    function reuseHandleWithoutProof(bytes32 _handle) external {
        // ❌ DON'T: Can't convert handle back to euint32 without proof
        // Handles are one-way - you can convert euint32 -> bytes32, but not back
        // You need the original encrypted input and proof
        _encryptedValue = FHE.fromBytes32(_handle); // ERROR: Doesn't exist
    }
    */
    
    /// @notice ✅ DO: Store handle for later reference (but can't use it directly)
    /// @dev You can store handles, but they're just references
    ///      They can't be used to recreate the encrypted value
    mapping(address => bytes32) public storedHandles;
    
    function storeHandle() external {
        // ✅ DO: Store handle as bytes32 for reference
        // But remember: you can't use this to recreate the encrypted value
        storedHandles[msg.sender] = FHE.toBytes32(_encryptedValue);
    }
    
    /// @notice Get the encrypted value
    /// @return The encrypted value
    function getEncryptedValue() external view returns (euint32) {
        return _encryptedValue;
    }
    
    /// @notice Get handle
    /// @return The handle as bytes32
    function getHandle() external view returns (bytes32) {
        return FHE.toBytes32(_encryptedValue);
    }
    
    /// @notice ✅ DO: Use handle correctly in operations
    /// @param _encryptedInput The encrypted input to add
    /// @param _inputProof The proof for the encrypted input
    /// @dev Handles are used internally in operations
    ///      You don't need to manually manage them for operations
    function addToValue(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        euint32 encryptedInput = FHE.fromExternal(_encryptedInput, _inputProof);
        
        // ✅ DO: Operations work on euint32 (handles are managed internally)
        _encryptedValue = FHE.add(_encryptedValue, encryptedInput);
        
        FHE.allowThis(_encryptedValue);
        FHE.allow(_encryptedValue, msg.sender);
    }
}


```

{% endtab %}

{% tab title="HandleMisuse.ts" %}

```typescript
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { HandleMisuse, HandleMisuse__factory } from "../../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

/**
 * @title Handle Misuse Test Suite
 * @notice Tests demonstrating correct handle usage
 */

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("HandleMisuse")) as unknown as HandleMisuse__factory;
  const contract = (await factory.deploy()) as HandleMisuse;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("HandleMisuse", function () {
  let signers: Signers;
  let contract: HandleMisuse;
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

  it("should set value correctly with handle and proof", async function () {
    const clearValue = 42;
    const encrypted = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(clearValue)
      .encrypt();

    await contract
      .connect(signers.alice)
      .setValueCorrect(encrypted.handles[0], encrypted.inputProof);

    const handle = await contract.getHandle();
    expect(handle).to.not.eq(ethers.ZeroHash);
  });

  it("should store handle for later reference", async function () {
    const clearValue = 100;
    const encrypted = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(clearValue)
      .encrypt();

    await contract
      .connect(signers.alice)
      .setValueCorrect(encrypted.handles[0], encrypted.inputProof);

    await contract.connect(signers.alice).storeHandle();

    const storedHandle = await contract.storedHandles(signers.alice.address);
    expect(storedHandle).to.not.eq(ethers.ZeroHash);
  });

  it("should allow operations on handles", async function () {
    // Set initial value
    const initialValue = 10;
    const encrypted1 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(initialValue)
      .encrypt();
    await contract.connect(signers.alice).setValueCorrect(encrypted1.handles[0], encrypted1.inputProof);

    // Add to value
    const addValue = 5;
    const encrypted2 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(addValue)
      .encrypt();
    await contract.connect(signers.alice).addToValue(encrypted2.handles[0], encrypted2.inputProof);

    const handle = await contract.getHandle();
    expect(handle).to.not.eq(ethers.ZeroHash);
  });

  // ❌ Common Pitfalls
  describe("❌ Common Pitfalls", function () {
    it("should fail when using handle without corresponding proof", async function () {
      // Common pitfall: Handle and proof must match
      const clearValue = 42;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      // Try to use handle with wrong/invalid proof
      const invalidProof = "0xdeadbeef";

      // Should fail because proof doesn't match handle
      await expect(
        contract
          .connect(signers.alice)
          .setValueCorrect(encrypted.handles[0], invalidProof)
      ).to.be.reverted;
    });

    it("should fail when using handle from different encrypted input", async function () {
      // Common pitfall: Mixing handles and proofs from different inputs
      const value1 = 10;
      const value2 = 20;
      
      const encrypted1 = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(value1)
        .encrypt();
      
      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(value2)
        .encrypt();

      // Try to use handle from encrypted2 with proof from encrypted1 (should fail)
      await expect(
        contract
          .connect(signers.alice)
          .setValueCorrect(encrypted2.handles[0], encrypted1.inputProof)
      ).to.be.reverted;
    });

    it("should fail when wrong signer tries to use handle", async function () {
      // Common pitfall: Handle created for one signer but used by another
      const clearValue = 100;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.deployer.address) // Proof for deployer
        .add32(clearValue)
        .encrypt();

      // Alice tries to use deployer's handle/proof (should fail)
      await expect(
        contract
          .connect(signers.alice)
          .setValueCorrect(encrypted.handles[0], encrypted.inputProof)
      ).to.be.reverted;
    });

    it("should fail when trying to use handle with mismatched proof", async function () {
      // Common pitfall: Handle and proof must be from the same encrypted input
      const value1 = 10;
      const value2 = 20;
      
      const encrypted1 = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(value1)
        .encrypt();
      
      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(value2)
        .encrypt();

      // First use encrypted1 correctly
      await contract.connect(signers.alice).setValueCorrect(encrypted1.handles[0], encrypted1.inputProof);

      // Try to use handle from encrypted1 with proof from encrypted2 (should fail)
      await expect(
        contract
          .connect(signers.alice)
          .setValueCorrect(encrypted1.handles[0], encrypted2.inputProof)
      ).to.be.reverted;
    });
  });
});


```

{% endtab %}

{% endtabs %}
