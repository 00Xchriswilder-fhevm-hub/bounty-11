# FHE Mul Operation

<!-- chapter: basic -->

## Overview

This example demonstrates the FHE encryption mechanism, showing how to convert external encrypted inputs to internal encrypted values using input proofs and shows how to manage FHE permissions for both contracts and users using external encrypted inputs with input proofs for verification.

## What You'll Learn

- **FHE.mul operation** - How to perform this specific homomorphic operation on encrypted values
- **Off-chain encryption** - Encrypting values locally before sending to contract
- **FHE permissions** - Granting permissions for operations and decryption
- **User decryption** - Decrypting results for authorized users

## Key Concepts

### 1. FHE.mul Operation

The `FHE.mul()` function performs multiplication on encrypted values, computing the product without decrypting.

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

### Step 2: Perform FHE.mul Operation

Call the function that performs `FHE.mul` (e.g., `computeMul()`).

### Step 3: Decrypt Result

Use `userDecrypt` to retrieve the plaintext result.

## Common Pitfalls

### ❌ Pitfall 1: should fail when using wrong signer for encrypted input

**The Problem:** Bob tries to set value with wrong signer (should use alice's encrypted input)

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

{% tab title="FHEMul.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint8, externalEuint8 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Multiplication Operation Example
/// @notice Demonstrates FHE.mul operation to multiply two encrypted values
contract FHEMul is ZamaEthereumConfig {
  euint8 private _a;
  euint8 private _b;
  euint8 private _mul_result;

  constructor() {}

  function setA(externalEuint8 inputA, bytes calldata inputProof) external {
    _a = FHE.fromExternal(inputA, inputProof);
    FHE.allowThis(_a);
  }

  function setB(externalEuint8 inputB, bytes calldata inputProof) external {
    _b = FHE.fromExternal(inputB, inputProof);
    FHE.allowThis(_b);
  }

  function computeMul() external {
    // Multiply two encrypted values
    // The contract must have FHE permissions over both `a` and `b`
    _mul_result = FHE.mul(_a, _b);

    // Grant permanent FHE permissions to contract and caller
    FHE.allowThis(_mul_result);
    FHE.allow(_mul_result, msg.sender);
  }

  function result() public view returns (euint8) {
    return _mul_result;
  }
}


```

{% endtab %}

{% tab title="FHEMul.ts" %}

```typescript
import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import type { FHEMul, FHEMul__factory } from "../../../types";

type Signers = {
  owner: HardhatEthersSigner;
  alice: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHEMul")) as unknown as FHEMul__factory;
  const fheMul = (await factory.deploy()) as FHEMul;
  const fheMul_address = await fheMul.getAddress();
  return { fheMul, fheMul_address };
}

/**
 * @chapter basic
 * @title FHE Multiplication Operation Test
 * @notice Tests FHE.mul operation to multiply two encrypted values
 */
describe("FHEMul", function () {
  let contract: FHEMul;
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
    contractAddress = deployment.fheMul_address;
    contract = deployment.fheMul;
  });

  it("should multiply two values", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
    let tx;

    // Test: 8 * 15 = 120
    const a = 8;
    const b = 15;

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    tx = await contract.connect(bob).computeMul();
    await tx.wait();

    const encryptedMul = await contract.result();
    const clearMul = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      encryptedMul,
      contractAddress,
      bob,
    );

    expect(clearMul).to.equal(a * b);
  });

  // ❌ Common Pitfalls
  describe("❌ Common Pitfalls", function () {
    it("should compute zero when values are not set", async function () {
      // Common pitfall: Computing without setting values
      // FHE operations on uninitialized values return zero, they don't revert
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      const tx = await contract.connect(bob).computeMul();
      await tx.wait();

      const encryptedResult = await contract.result();
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
      const inputA = await fhevm.createEncryptedInput(contractAddress, signers.owner.address).add8(8).encrypt();
      
      // Should fail because signer doesn't match
      await expect(
        contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof)
      ).to.be.reverted;
    });
  });
});


```

{% endtab %}

{% endtabs %}
