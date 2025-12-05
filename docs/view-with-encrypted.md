# View With Encrypted

<!-- chapter: anti-patterns -->

## Overview

Why view functions cannot return encrypted values. Shows correct alternative patterns.

## What You'll Learn

- **Off-chain encryption** - Encrypting values locally before sending to contract
- **FHE permissions** - Granting permissions for operations and decryption

## Key Concepts

### 1. Off-Chain Encryption

Values are encrypted **locally** (on the client side) before being sent to the contract:
- Plaintext values never appear in transactions
- Encryption is cryptographically bound to [contract, user] pair
- Input proofs verify the binding

### 2. FHE Permissions

Permissions control who can:
- **Perform operations**: Contracts need `FHE.allowThis()`
- **Decrypt values**: Users need `FHE.allow()`

## Step-by-Step Walkthrough

### Step 1: Setup

Deploy the contract and prepare encrypted inputs.

### Step 2: Execute Operations

Call contract functions with encrypted values and proofs.

### Step 3: Decrypt Results

Use the appropriate decryption method to retrieve plaintext values.

## Common Pitfalls

### ❌ Pitfall 1: should fail when trying to return encrypted value from view function

**The Problem:** Common pitfall: View functions cannot return encrypted values

**Why it fails:** The operation fails due to incorrect usage, permissions, or signer mismatch.

**The Fix:** Ensure proper setup, matching signers, and correct permissions.

### ❌ Pitfall 2: should fail when trying to use handle without proper proof

**The Problem:** Common pitfall: Using handle without corresponding proof

**Why it fails:** The operation fails due to incorrect usage, permissions, or signer mismatch.

**The Fix:** Ensure proper setup, matching signers, and correct permissions.

### ❌ Pitfall 3: should fail when wrong signer tries to set value

**The Problem:** Common pitfall: Using wrong signer for encrypted input

**Why it fails:** The operation fails due to incorrect usage, permissions, or signer mismatch.

**The Fix:** Ensure proper setup, matching signers, and correct permissions.

## Best Practices

1. **Always match encryption signer with transaction signer**
2. **Grant permissions immediately after creating encrypted values**
3. **Use descriptive variable names** for clarity
4. **Validate inputs** before performing operations

## Real-World Use Cases

- **Confidential Smart Contracts**: Building privacy-preserving applications
- **Encrypted Data Processing**: Performing computations on sensitive data
{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}

{% tab title="ViewWithEncrypted.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title View With Encrypted - Anti-Pattern Example
/// @notice Demonstrates why view functions cannot return encrypted values
/// @dev This example shows:
///      - Why view functions can't return encrypted values
///      - What happens when you try
///      - The correct alternative patterns
/// 
/// @dev Key Concept:
///      - View functions in Solidity cannot return encrypted types (euint32, etc.)
///      - Encrypted values must be decrypted before returning
///      - Use events or separate decryption flow instead
contract ViewWithEncrypted is ZamaEthereumConfig {
    /// @notice Encrypted value
    euint32 private _encryptedValue;
    
    /// @notice Event to emit encrypted value (correct pattern)
    event EncryptedValueEvent(bytes32 indexed handle);
    
    /// @notice Set encrypted value
    /// @param _encryptedInput The encrypted input
    /// @param _inputProof The proof for the encrypted input
    function setValue(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        _encryptedValue = FHE.fromExternal(_encryptedInput, _inputProof);
        
        FHE.allowThis(_encryptedValue);
        FHE.allow(_encryptedValue, msg.sender);
        
        // ✅ DO: Emit event with handle if you need to expose it
        emit EncryptedValueEvent(FHE.toBytes32(_encryptedValue));
    }
    
    /// @notice ❌ DON'T: This won't compile - view functions can't return encrypted types
    /// @return The encrypted value
    /// @dev This is commented out because it won't compile
    ///      Solidity view functions cannot return encrypted types (euint32, etc.)
    /*
    function getEncryptedValue() external view returns (euint32) {
        // ❌ ERROR: View functions cannot return encrypted types
        return _encryptedValue;
    }
    */
    
    /// @notice ✅ DO: Return handle as bytes32 (this works)
    /// @return The handle as bytes32
    /// @dev Handles can be returned, but they're not the encrypted value itself
    ///      They're just references that can be used for decryption off-chain
    function getHandle() external view returns (bytes32) {
        // ✅ DO: Return handle, not encrypted value
        return FHE.toBytes32(_encryptedValue);
    }
    
    /// @notice ✅ DO: Use events to expose encrypted values
    /// @dev Emit event with handle, then decrypt off-chain
    function exposeValueViaEvent() external {
        emit EncryptedValueEvent(FHE.toBytes32(_encryptedValue));
    }
    
    /// @notice ✅ DO: Store handle in mapping for later retrieval
    /// @dev Store handle, retrieve it, then decrypt off-chain
    mapping(address => bytes32) public userHandles;
    
    function storeHandleForUser(address user) external {
        userHandles[user] = FHE.toBytes32(_encryptedValue);
    }
}


```

{% endtab %}

{% tab title="ViewWithEncrypted.ts" %}

```typescript
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { ViewWithEncrypted, ViewWithEncrypted__factory } from "../../types";
import { expect } from "chai";

/**
 * @chapter anti-patterns
 * @title View With Encrypted Test Suite
 * @notice Tests demonstrating why view functions can't return encrypted values
 */

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("ViewWithEncrypted")) as ViewWithEncrypted__factory;
  const contract = (await factory.deploy()) as ViewWithEncrypted;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("ViewWithEncrypted", function () {
  let signers: Signers;
  let contract: ViewWithEncrypted;
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

  it("should set value and emit event", async function () {
    const clearValue = 42;
    const encrypted = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(clearValue)
      .encrypt();

    await expect(
      contract.connect(signers.alice).setValue(encrypted.handles[0], encrypted.inputProof)
    ).to.emit(contract, "EncryptedValueEvent");
  });

  it("should return handle as bytes32", async function () {
    const clearValue = 100;
    const encrypted = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(clearValue)
      .encrypt();

    await contract.connect(signers.alice).setValue(encrypted.handles[0], encrypted.inputProof);

    const handle = await contract.getHandle();
    expect(handle).to.not.eq(ethers.ZeroHash);
  });

  it("should store handle for user", async function () {
    const clearValue = 50;
    const encrypted = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(clearValue)
      .encrypt();

    await contract.connect(signers.alice).setValue(encrypted.handles[0], encrypted.inputProof);
    await contract.connect(signers.alice).storeHandleForUser(signers.alice.address);

    const storedHandle = await contract.userHandles(signers.alice.address);
    expect(storedHandle).to.not.eq(ethers.ZeroHash);
  });

  // ❌ Common Pitfalls
  describe("❌ Common Pitfalls", function () {
    it("should fail when trying to return encrypted value from view function", async function () {
      // Common pitfall: View functions cannot return encrypted values
      // This demonstrates why view functions can't work with encrypted data
      const clearValue = 42;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      await contract.connect(signers.alice).setValue(encrypted.handles[0], encrypted.inputProof);

      // View functions can only return handles (bytes32), not encrypted values
      // Attempting to return encrypted values from view functions will fail at compile time
      // This test demonstrates that we must use handles or events instead
      const handle = await contract.getHandle();
      expect(handle).to.not.eq(ethers.ZeroHash);
      // Note: The contract doesn't have a view function that returns encrypted values
      // because Solidity doesn't allow it - this is the anti-pattern being demonstrated
    });

    it("should fail when trying to use handle without proper proof", async function () {
      // Common pitfall: Using handle without corresponding proof
      const clearValue = 100;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      // Try to use handle with invalid proof
      const invalidProof = "0x" + "00".repeat(32);

      // Should fail because proof is invalid
      await expect(
        contract
          .connect(signers.alice)
          .setValue(encrypted.handles[0], invalidProof)
      ).to.be.reverted;
    });

    it("should fail when wrong signer tries to set value", async function () {
      // Common pitfall: Using wrong signer for encrypted input
      const clearValue = 50;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.deployer.address) // Wrong signer!
        .add32(clearValue)
        .encrypt();

      // Alice tries to use deployer's proof (should fail)
      await expect(
        contract
          .connect(signers.alice)
          .setValue(encrypted.handles[0], encrypted.inputProof)
      ).to.be.reverted;
    });
  });
});


```

{% endtab %}

{% endtabs %}
