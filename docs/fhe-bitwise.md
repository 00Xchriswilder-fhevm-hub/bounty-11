# FHE Bitwise Operations

<!-- chapter: basic -->

## Overview

This example demonstrates FHE.and, FHE.or, and FHE.not operations.

## What You'll Learn

- **FHE.and operation** - How to perform this specific homomorphic operation on encrypted values
- **Off-chain encryption** - Encrypting values locally before sending to contract
- **FHE permissions** - Granting permissions for operations and decryption
- **User decryption** - Decrypting results for authorized users

## Key Concepts

### 1. FHE.and Operation

The `FHE.and()` function performs bitwise AND on encrypted values.

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

Encrypt your values off-chain and send them to the contract using `setA()`.

### Step 2: Perform FHE.and Operation

Call the function that performs `FHE.and` (e.g., `computeAnd()`).

### Step 3: Decrypt Result

Use `userDecrypt` to retrieve the plaintext result.

## Common Pitfalls

### ❌ Pitfall 1: should fail when using wrong signer for encrypted input

**The Problem:** Bob tries to set value with wrong signer (should use alice's encrypted input)

**Why it fails:** The operation fails due to incorrect usage, permissions, or signer mismatch.

**The Fix:** Ensure proper setup, matching signers, and correct permissions.

### ❌ Pitfall 2: should fail when using wrong signer for NOT operation

**The Problem:** Alice tries to use encrypted input created for bob

**Why it fails:** The operation fails due to incorrect usage, permissions, or signer mismatch.

**The Fix:** Ensure proper setup, matching signers, and correct permissions.

## Best Practices

1. **Always match encryption signer with transaction signer**
2. **Grant permissions immediately after creating encrypted values**
3. **Use descriptive variable names** for clarity
4. **Validate inputs** before performing operations

## Real-World Use Cases

- **Encrypted Flags**: Set/check boolean flags without revealing state
- **Privacy-Preserving Logic**: Perform bitwise operations on encrypted data
{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}

{% tab title="FHEBitwise.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint8, externalEuint8, ebool, externalEbool } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Bitwise Operations Example
/// @notice Demonstrates FHE.and, FHE.or, and FHE.not operations
contract FHEBitwise is ZamaEthereumConfig {
  euint8 private _a;
  euint8 private _b;
  euint8 private _and_result;
  euint8 private _or_result;
  ebool private _not_result;

  constructor() {}

  function setA(externalEuint8 inputA, bytes calldata inputProof) external {
    _a = FHE.fromExternal(inputA, inputProof);
    FHE.allowThis(_a);
  }

  function setB(externalEuint8 inputB, bytes calldata inputProof) external {
    _b = FHE.fromExternal(inputB, inputProof);
    FHE.allowThis(_b);
  }

  function computeAnd() external {
    // Compute bitwise AND of two encrypted values
    _and_result = FHE.and(_a, _b);
    FHE.allowThis(_and_result);
    FHE.allow(_and_result, msg.sender);
  }

  function computeOr() external {
    // Compute bitwise OR of two encrypted values
    _or_result = FHE.or(_a, _b);
    FHE.allowThis(_or_result);
    FHE.allow(_or_result, msg.sender);
  }

  function computeNot(externalEbool inputBool, bytes calldata inputProof) external {
    ebool temp = FHE.fromExternal(inputBool, inputProof);
    FHE.allowThis(temp);
    // Compute NOT operation
    _not_result = FHE.not(temp);
    // Grant permanent FHE permissions to contract and caller
    FHE.allowThis(_not_result);
    FHE.allow(_not_result, msg.sender);
  }

  function getAndResult() public view returns (euint8) {
    return _and_result;
  }

  function getOrResult() public view returns (euint8) {
    return _or_result;
  }

  function getNotResult() public view returns (ebool) {
    return _not_result;
  }
}


```

{% endtab %}

{% tab title="FHEBitwise.ts" %}

```typescript
import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import type { FHEBitwise, FHEBitwise__factory } from "../../../types";

type Signers = {
  owner: HardhatEthersSigner;
  alice: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHEBitwise")) as unknown as FHEBitwise__factory;
  const fheBitwise = (await factory.deploy()) as FHEBitwise;
  const fheBitwise_address = await fheBitwise.getAddress();
  return { fheBitwise, fheBitwise_address };
}

/**
 * @chapter basic
 * @title FHE Bitwise Operations Test
 * @notice Tests FHE.and, FHE.or, and FHE.not operations
 */
describe("FHEBitwise", function () {
  let contract: FHEBitwise;
  let contractAddress: string;
  let signers: Signers;
  let bob: HardhatEthersSigner;

  before(async function () {
    if (!hre.fhevm.isMock) {
      throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`);
    }
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { owner: ethSigners[0], alice: ethSigners[1] };
    bob = ethSigners[2];
  });

  beforeEach(async function () {
    const deployment = await deployFixture();
    contractAddress = deployment.fheBitwise_address;
    contract = deployment.fheBitwise;
  });

  it("should compute AND of two values", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
    let tx;

    // Test: 0b1010 (10) AND 0b1100 (12) = 0b1000 (8)
    const a = 10;
    const b = 12;

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    tx = await contract.connect(bob).computeAnd();
    await tx.wait();

    const encryptedAnd = await contract.getAndResult();
    const clearAnd = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      encryptedAnd,
      contractAddress,
      bob,
    );

    expect(clearAnd).to.equal(a & b);
  });

  it("should compute OR of two values", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
    let tx;

    // Test: 0b1010 (10) OR 0b1100 (12) = 0b1110 (14)
    const a = 10;
    const b = 12;

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    tx = await contract.connect(bob).computeOr();
    await tx.wait();

    const encryptedOr = await contract.getOrResult();
    const clearOr = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      encryptedOr,
      contractAddress,
      bob,
    );

    expect(clearOr).to.equal(a | b);
  });

  it("should compute NOT of a boolean value", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
    let tx;

    // Test: NOT(true) = false, NOT(false) = true
    const boolValue = true;

    // Create encrypted input for bob since bob will call computeNot
    const inputBool = await fhevm.createEncryptedInput(contractAddress, await bob.getAddress()).addBool(boolValue).encrypt();
    tx = await contract.connect(bob).computeNot(inputBool.handles[0], inputBool.inputProof);
    await tx.wait();

    const encryptedNot = await contract.getNotResult();
    const clearNot = await fhevm.userDecryptEbool(
      encryptedNot,
      contractAddress,
      bob,
    );

    expect(clearNot).to.equal(!boolValue);
  });

  // ❌ Common Pitfalls
  describe("❌ Common Pitfalls", function () {
    it("should compute zero when values are not set for AND", async function () {
      // Common pitfall: Computing without setting values
      // FHE operations on uninitialized values return zero, they don't revert
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      const tx = await contract.connect(bob).computeAnd();
      await tx.wait();

      const encryptedResult = await contract.getAndResult();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint8,
        encryptedResult,
        contractAddress,
        bob,
      );

      // Uninitialized values result in zero
      expect(clearResult).to.equal(0);
    });

    it("should compute zero when values are not set for OR", async function () {
      // Common pitfall: Computing without setting values
      // FHE operations on uninitialized values return zero, they don't revert
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      const tx = await contract.connect(bob).computeOr();
      await tx.wait();

      const encryptedResult = await contract.getOrResult();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint8,
        encryptedResult,
        contractAddress,
        bob,
      );

      // Uninitialized values result in zero
      expect(clearResult).to.equal(0);
    });

    it("should fail when using wrong signer for encrypted input", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

      // Bob tries to set value with wrong signer (should use alice's encrypted input)
      const inputA = await fhevm.createEncryptedInput(contractAddress, signers.owner.address).add8(10).encrypt();
      
      // Should fail because signer doesn't match
      await expect(
        contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof)
      ).to.be.reverted;
    });

    it("should fail when using wrong signer for NOT operation", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

      // Alice tries to use encrypted input created for bob
      const inputBool = await fhevm.createEncryptedInput(contractAddress, await bob.getAddress()).addBool(true).encrypt();
      
      // Should fail because signer doesn't match
      await expect(
        contract.connect(signers.alice).computeNot(inputBool.handles[0], inputBool.inputProof)
      ).to.be.reverted;
    });
  });
});


```

{% endtab %}

{% endtabs %}
