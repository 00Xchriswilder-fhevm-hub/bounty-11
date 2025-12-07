# Input Proof Usage

## Overview

Input proofs bind encryption to [contract, user] pair. This example demonstrates the FHE encryption mechanism, showing how to convert external encrypted inputs to internal encrypted values using input proofs and shows how to manage FHE permissions for both contracts and users using external encrypted inputs with input proofs for verification.

## What You'll Learn

- **Off-chain encryption** - Encrypting values locally before sending to contract
- **FHE permissions** - Granting permissions for operations and decryption
- **User decryption** - Decrypting results for authorized users

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

### ❌ Pitfall 1: should fail when signer doesn

**The Problem:** Common pitfall: Proof created for one signer but transaction from another

**Why it fails:** The input proof verification or permission check fails when requirements aren't met.

**The Fix:** Always ensure signers match and permissions are granted correctly.

### ❌ Pitfall 2: should fail when reusing old proof

**The Problem:** Set initial value

**Why it fails:** The input proof verification or permission check fails when requirements aren't met.

**The Fix:** Always ensure signers match and permissions are granted correctly.

### ❌ Pitfall 3: should fail with corrupted input proof

**The Problem:** Corrupt the proof by modifying the last byte

**Why it fails:** The input proof verification or permission check fails when requirements aren't met.

**The Fix:** Always ensure signers match and permissions are granted correctly.

## Best Practices

1. **Always match encryption signer with transaction signer**
2. **Grant permissions immediately after creating encrypted values**
3. **Use descriptive variable names** for clarity
4. **Validate inputs** before performing operations

## Real-World Use Cases

- **Confidential Voting**: Encrypt votes before submission
- **Private Auctions**: Encrypt bids to hide amounts
- **Confidential Tokens**: Encrypt token amounts in transfers
{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}

{% tab title="InputProofUsage.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Input Proof Usage
/// @notice Demonstrates correct usage of input proofs
/// @dev This example shows:
///      - How to correctly use input proofs
///      - Matching encryption signer with transaction signer
///      - Why the signer must match
///      - Best practices for input proof usage
/// 
/// @dev Key Concepts:
///      - Input proofs bind encryption to [contract, user] pair
///      - The user who encrypts must be the same as msg.sender
///      - Proofs are generated automatically by FHEVM client
///      - Proofs are verified on-chain automatically
contract InputProofUsage is ZamaEthereumConfig {
    /// @notice Encrypted value
    euint32 private _encryptedValue;
    
    /// @notice Mapping to track who set the value
    mapping(address => bool) public hasSetValue;
    
    /// @notice Event emitted when value is set
    event ValueSet(address indexed setter);
    
    /// @notice Set value with encrypted input and proof
    /// @param _encryptedInput The encrypted input
    /// @param _inputProof The proof for the encrypted input
    /// @dev ✅ DO: Match encryption signer with transaction signer
    ///      The proof attests that _encryptedInput was encrypted for [this contract, msg.sender]
    ///      If msg.sender doesn't match the encryption signer, the proof will be invalid
    function setValue(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        // The proof verifies that _encryptedInput was encrypted for:
        // - Contract: address(this)
        // - User: msg.sender
        // If these don't match, FHE.fromExternal() will revert
        
        _encryptedValue = FHE.fromExternal(_encryptedInput, _inputProof);
        
        // Grant permissions
        FHE.allowThis(_encryptedValue);
        FHE.allow(_encryptedValue, msg.sender);
        
        hasSetValue[msg.sender] = true;
        emit ValueSet(msg.sender);
    }
    
    /// @notice Update value (only if you previously set it)
    /// @param _encryptedInput The new encrypted value
    /// @param _inputProof The proof for the encrypted input
    /// @dev This demonstrates that each operation needs a fresh proof
    function updateValue(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        require(hasSetValue[msg.sender], "Must have set value before");
        
        // Each encrypted input needs its own proof
        // Even if it's the same user, each encryption is unique
        _encryptedValue = FHE.fromExternal(_encryptedInput, _inputProof);
        
        // Grant permissions
        FHE.allowThis(_encryptedValue);
        FHE.allow(_encryptedValue, msg.sender);
    }
    
    /// @notice Get the encrypted value
    /// @return The encrypted value
    function getEncryptedValue() external view returns (euint32) {
        return _encryptedValue;
    }
    
    /// @notice Example: Multiple users can set values (each with their own proof)
    /// @param _encryptedInput The encrypted input
    /// @param _inputProof The proof for the encrypted input
    /// @dev Each user encrypts with their own key, so each needs their own proof
    function setValueForUser(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        // Each user's encryption is unique
        // Each user's proof is unique
        // The proof binds the encryption to [contract, msg.sender]
        
        euint32 userValue = FHE.fromExternal(_encryptedInput, _inputProof);
        
        // Grant permissions to this user
        FHE.allowThis(userValue);
        FHE.allow(userValue, msg.sender);
        
        // In a real scenario, you might store per-user values
        // For this example, we just update the global value
        _encryptedValue = userValue;
        
        hasSetValue[msg.sender] = true;
        emit ValueSet(msg.sender);
    }
}


```

{% endtab %}

{% tab title="InputProofUsage.ts" %}

```typescript
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { InputProofUsage, InputProofUsage__factory } from "../../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

/**
 * @title Input Proof Usage Test Suite
 * @notice Tests demonstrating correct usage of input proofs
 */

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("InputProofUsage")) as unknown as InputProofUsage__factory;
  const contract = (await factory.deploy()) as InputProofUsage;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("InputProofUsage", function () {
  let signers: Signers;
  let contract: InputProofUsage;
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

  it("should set value with matching signer", async function () {
    const clearValue = 100;
    const encrypted = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(clearValue)
      .encrypt();

    await contract
      .connect(signers.alice)
      .setValue(encrypted.handles[0], encrypted.inputProof);

    expect(await contract.hasSetValue(signers.alice.address)).to.be.true;
  });

  it("should update value with fresh proof", async function () {
    // Set initial value
    const initialValue = 50;
    const encrypted1 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(initialValue)
      .encrypt();
    await contract.connect(signers.alice).setValue(encrypted1.handles[0], encrypted1.inputProof);

    // Update with new value and fresh proof
    const newValue = 75;
    const encrypted2 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(newValue)
      .encrypt();
    await contract.connect(signers.alice).updateValue(encrypted2.handles[0], encrypted2.inputProof);

    const encryptedValue = await contract.connect(signers.alice).getEncryptedValue();
    const decrypted = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedValue,
      contractAddress,
      signers.alice,
    );

    expect(decrypted).to.eq(newValue);
  });

  // ❌ Common Pitfalls
  describe("❌ Common Pitfalls", function () {
    it("should fail when signer doesn't match encrypted input", async function () {
      // Common pitfall: Proof created for one signer but transaction from another
      const clearValue = 100;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address) // Proof for bob
        .add32(clearValue)
        .encrypt();

      // Alice tries to use bob's proof (should fail)
      await expect(
        contract
          .connect(signers.alice)
          .setValue(encrypted.handles[0], encrypted.inputProof)
      ).to.be.reverted;
    });

    it("should fail when reusing old proof", async function () {
      // Set initial value
      const initialValue = 50;
      const encrypted1 = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(initialValue)
        .encrypt();
      await contract.connect(signers.alice).setValue(encrypted1.handles[0], encrypted1.inputProof);

      // Try to reuse the old proof with a new handle (should fail)
      const newValue = 75;
      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(newValue)
        .encrypt();

      // Reusing old proof with new handle should fail
      await expect(
        contract.connect(signers.alice).updateValue(encrypted2.handles[0], encrypted1.inputProof)
      ).to.be.reverted;
    });

    it("should fail with corrupted input proof", async function () {
      const clearValue = 100;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      // Corrupt the proof by modifying the last byte
      const proofBytes = ethers.getBytes(encrypted.inputProof);
      proofBytes[proofBytes.length - 1] = (proofBytes[proofBytes.length - 1] + 1) % 256;
      const corruptedProof = ethers.hexlify(proofBytes);

      // Should fail with corrupted proof
      await expect(
        contract
          .connect(signers.alice)
          .setValue(encrypted.handles[0], corruptedProof)
      ).to.be.reverted;
    });
  });
});


```

{% endtab %}

{% endtabs %}
