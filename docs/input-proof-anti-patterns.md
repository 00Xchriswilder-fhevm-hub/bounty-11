# Input Proof Anti-Patterns

## Overview

Common mistakes with input proofs and how to avoid them. Shows what happens with invalid proofs.

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

Encrypt your values off-chain and send them to the contract using `correctPattern()`.

### Step 2: Perform FHE.add Operation

Call the function that performs `FHE.add` (e.g., `wrongPatternMissingProof()`).

## Common Pitfalls

### ❌ Pitfall 1: should fail when using wrong signer for proof

**The Problem:** Anti-pattern: Proof created for wrong signer

**Why it fails:** The operation fails due to incorrect usage, permissions, or signer mismatch.

**The Fix:** Ensure proper setup, matching signers, and correct permissions.

### ❌ Pitfall 2: should fail when mixing proofs from different inputs

**The Problem:** Anti-pattern: Using proof from one input with handle from another

**Why it fails:** The operation fails due to incorrect usage, permissions, or signer mismatch.

**The Fix:** Ensure proper setup, matching signers, and correct permissions.

### ❌ Pitfall 3: should fail with invalid proof format

**The Problem:** Use completely invalid proof

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

{% tab title="InputProofAntiPatterns.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Input Proof Anti-Patterns
/// @notice Demonstrates common mistakes with input proofs
/// @dev This example shows:
///      - What happens when proofs are missing
///      - What happens when proofs are invalid
///      - Common mistakes to avoid
///      - Why proofs are necessary
/// 
/// @dev Key Anti-Patterns:
///      - ❌ DON'T: Try to use encrypted input without proof (will revert)
///      - ❌ DON'T: Use proof from different contract/user (will revert)
///      - ❌ DON'T: Reuse proofs (each encryption needs fresh proof)
///      - ❌ DON'T: Mismatch encryption signer with transaction signer
contract InputProofAntiPatterns is ZamaEthereumConfig {
    /// @notice Encrypted value
    euint32 private _encryptedValue;
    
    /// @notice This function demonstrates the CORRECT pattern
    /// @param _encryptedInput The encrypted input
    /// @param _inputProof The proof for the encrypted input
    /// @dev ✅ DO: Always provide proof with encrypted input
    function correctPattern(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        // ✅ DO: Provide proof with encrypted input
        _encryptedValue = FHE.fromExternal(_encryptedInput, _inputProof);
        
        FHE.allowThis(_encryptedValue);
        FHE.allow(_encryptedValue, msg.sender);
    }
    
    /// @notice This function would fail - missing proof
    /// @param _encryptedInput The encrypted input (without proof)
    /// @dev ❌ DON'T: Try to use encrypted input without proof
    ///      This function is commented out because it won't compile
    ///      FHE.fromExternal() requires both encrypted input AND proof
    /*
    function wrongPatternMissingProof(externalEuint32 _encryptedInput) external {
        // ❌ DON'T: This won't compile - FHE.fromExternal requires proof
        // _encryptedValue = FHE.fromExternal(_encryptedInput); // ERROR: Missing proof parameter
    }
    */
    
    /// @notice This function demonstrates what happens with invalid proof
    /// @param _encryptedInput The encrypted input
    /// @param _invalidProof An invalid proof (wrong contract/user)
    /// @dev ❌ DON'T: Use proof from different contract or user
    ///      This will revert when called with mismatched proof
    ///      The proof must match the encryption's [contract, user] binding
    function wrongPatternInvalidProof(
        externalEuint32 _encryptedInput,
        bytes calldata _invalidProof
    ) external {
        // ❌ DON'T: This will revert if _invalidProof doesn't match
        // The proof must attest that _encryptedInput was encrypted for [this contract, msg.sender]
        // If it was encrypted for a different contract or user, this will fail
        
        // This will revert if proof is invalid
        _encryptedValue = FHE.fromExternal(_encryptedInput, _invalidProof);
        
        FHE.allowThis(_encryptedValue);
        FHE.allow(_encryptedValue, msg.sender);
    }
    
    /// @notice Get the encrypted value
    /// @return The encrypted value
    function getEncryptedValue() external view returns (euint32) {
        return _encryptedValue;
    }
    
    /// @notice Example showing why each encryption needs fresh proof
    /// @param _encryptedInput1 First encrypted input
    /// @param _proof1 Proof for first input
    /// @param _encryptedInput2 Second encrypted input (different value)
    /// @param _proof2 Proof for second input
    /// @dev ✅ DO: Each encrypted input needs its own proof
    ///      Even if from the same user, each encryption is unique
    function correctMultipleInputs(
        externalEuint32 _encryptedInput1,
        bytes calldata _proof1,
        externalEuint32 _encryptedInput2,
        bytes calldata _proof2
    ) external {
        // ✅ DO: Each input has its own proof
        euint32 value1 = FHE.fromExternal(_encryptedInput1, _proof1);
        euint32 value2 = FHE.fromExternal(_encryptedInput2, _proof2);
        
        // Perform operation
        _encryptedValue = FHE.add(value1, value2);
        
        FHE.allowThis(_encryptedValue);
        FHE.allow(_encryptedValue, msg.sender);
    }
    
    /// @notice This would fail - reusing proof for different input
    /// @dev ❌ DON'T: Reuse proofs
    ///      Each encryption is unique and needs its own proof
    ///      Reusing a proof for a different encrypted value will fail
    /*
    function wrongPatternReuseProof(
        externalEuint32 _encryptedInput1,
        bytes calldata _proof,
        externalEuint32 _encryptedInput2
    ) external {
        // ❌ DON'T: Reusing proof for different input
        // This will fail because _proof was generated for _encryptedInput1, not _encryptedInput2
        euint32 value1 = FHE.fromExternal(_encryptedInput1, _proof);
        euint32 value2 = FHE.fromExternal(_encryptedInput2, _proof); // ERROR: Wrong proof
    }
    */
}


```

{% endtab %}

{% tab title="InputProofAntiPatterns.ts" %}

```typescript
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { InputProofAntiPatterns, InputProofAntiPatterns__factory } from "../../types";
import { expect } from "chai";

/**
 * @title Input Proof Anti-Patterns Test Suite
 * @notice Tests showing what happens with invalid proofs
 */

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("InputProofAntiPatterns")) as InputProofAntiPatterns__factory;
  const contract = (await factory.deploy()) as InputProofAntiPatterns;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("InputProofAntiPatterns", function () {
  let signers: Signers;
  let contract: InputProofAntiPatterns;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      this.skip();
    }
    ({ contract, contractAddress } = await deployFixture());
  });

  it("should work with correct proof", async function () {
    const clearValue = 42;
    const encrypted = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(clearValue)
      .encrypt();

    await contract
      .connect(signers.alice)
      .correctPattern(encrypted.handles[0], encrypted.inputProof);

    // Should succeed
    const encryptedValue = await contract.getEncryptedValue();
    expect(encryptedValue).to.not.eq(ethers.ZeroHash);
  });

  it("should handle multiple inputs correctly", async function () {
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

    await contract
      .connect(signers.alice)
      .correctMultipleInputs(
        encrypted1.handles[0],
        encrypted1.inputProof,
        encrypted2.handles[0],
        encrypted2.inputProof
      );

    // Should succeed
    const encryptedValue = await contract.getEncryptedValue();
    expect(encryptedValue).to.not.eq(ethers.ZeroHash);
  });

  // ❌ Common Pitfalls - These tests demonstrate anti-patterns that should fail
  describe("❌ Common Pitfalls", function () {
    it("should fail when using wrong signer for proof", async function () {
      // Anti-pattern: Proof created for wrong signer
      const clearValue = 42;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address) // Proof for bob
        .add32(clearValue)
        .encrypt();

      // Alice tries to use bob's proof (should fail)
      await expect(
        contract
          .connect(signers.alice)
          .correctPattern(encrypted.handles[0], encrypted.inputProof)
      ).to.be.reverted;
    });

    it("should fail when mixing proofs from different inputs", async function () {
      // Anti-pattern: Using proof from one input with handle from another
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

      // Mix proof from encrypted1 with handle from encrypted2 (should fail)
      await expect(
        contract
          .connect(signers.alice)
          .correctMultipleInputs(
            encrypted2.handles[0],
            encrypted1.inputProof, // Wrong proof!
            encrypted2.handles[0],
            encrypted2.inputProof
          )
      ).to.be.reverted;
    });

    it("should fail with invalid proof format", async function () {
      const clearValue = 42;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      // Use completely invalid proof
      const invalidProof = "0xdeadbeef";

      // Should fail with invalid proof
      await expect(
        contract
          .connect(signers.alice)
          .correctPattern(encrypted.handles[0], invalidProof)
      ).to.be.reverted;
    });
  });
});


```

{% endtab %}

{% endtabs %}
