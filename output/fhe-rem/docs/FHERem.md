# FHE Remainder Operation Example

<!-- chapter: basic -->

## Overview

Demonstrates FHE.rem operation to compute remainder of encrypted value divided by plaintext. This example demonstrates the FHE encryption mechanism, showing how to convert external encrypted inputs to internal encrypted values using input proofs and shows how to manage FHE permissions for both contracts and users using external encrypted inputs with input proofs for verification.

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

### ❌ Pitfall 1: should fail when trying to compute without setting values

**The Problem:** Try to compute without setting a and modulus first

**Why it fails:** The input proof verification or permission check fails when requirements aren't met.

**The Fix:** Always ensure signers match and permissions are granted correctly.

### ❌ Pitfall 2: should fail when using wrong signer for encrypted input

**The Problem:** Bob tries to set value with wrong signer (should use alice's encrypted input)

**Why it fails:** The input proof verification or permission check fails when requirements aren't met.

**The Fix:** Always ensure signers match and permissions are granted correctly.

### ❌ Pitfall 3: should fail when modulus is zero

**The Problem:** Try to set modulus to zero (should fail)

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

{% tab title="FHERem.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint32, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Remainder Operation Example
/// @notice Demonstrates FHE.rem operation to compute remainder of encrypted value divided by plaintext
/// @dev Note: FHE remainder requires the modulus to be a plaintext value, not encrypted.
///      The operation computes: result = a % modulus
contract FHERem is ZamaEthereumConfig {
  euint32 private _a;
  uint32 private _modulus;
  euint32 private _rem_result;

  constructor() {}

  function setA(externalEuint32 inputA, bytes calldata inputProof) external {
    _a = FHE.fromExternal(inputA, inputProof);
    FHE.allowThis(_a);
  }

  function setModulus(uint32 modulus) external {
    require(modulus > 0, "Modulus must be greater than zero");
    _modulus = modulus;
  }

  function computeRem() external {
    // Compute remainder: a % modulus
    // The contract must have FHE permissions over `a`
    // Note: Modulus must be a plaintext value
    _rem_result = FHE.rem(_a, _modulus);

    // Grant permanent FHE permissions to contract and caller
    FHE.allowThis(_rem_result);
    FHE.allow(_rem_result, msg.sender);
  }

  function result() public view returns (euint32) {
    return _rem_result;
  }
}

```

{% endtab %}

{% tab title="FHERem.ts" %}

```typescript
import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import type { FHERem, FHERem__factory } from "../../../types";

type Signers = {
  owner: HardhatEthersSigner;
  alice: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHERem")) as unknown as FHERem__factory;
  const fheRem = (await factory.deploy()) as FHERem;
  const fheRem_address = await fheRem.getAddress();
  return { fheRem, fheRem_address };
}

/**
 * @chapter basic
 * @title FHE Remainder Operation Test
 * @notice Tests FHE.rem operation to compute remainder of encrypted value divided by plaintext modulus
 */
describe("FHERem", function () {
  let contract: FHERem;
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
    contractAddress = deployment.fheRem_address;
    contract = deployment.fheRem;
  });

  it("should compute remainder of encrypted value by plaintext modulus", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
    let tx;

    // Test: 125 % 7 = 6
    const a = 125;
    const modulus = 7;

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    // Set plaintext modulus
    tx = await contract.connect(signers.alice).setModulus(modulus);
    await tx.wait();

    tx = await contract.connect(bob).computeRem();
    await tx.wait();

    const encryptedRem = await contract.result();
    const clearRem = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedRem,
      contractAddress,
      bob,
    );

    expect(clearRem).to.equal(a % modulus);
  });

  it("should compute zero remainder when perfectly divisible", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
    let tx;

    // Test: 120 % 8 = 0
    const a = 120;
    const modulus = 8;

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    tx = await contract.connect(signers.alice).setModulus(modulus);
    await tx.wait();

    tx = await contract.connect(bob).computeRem();
    await tx.wait();

    const encryptedRem = await contract.result();
    const clearRem = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedRem,
      contractAddress,
      bob,
    );

    expect(clearRem).to.equal(0);
  });

  // ❌ Common Pitfalls
  describe("❌ Common Pitfalls", function () {
    it("should fail when trying to compute without setting values", async function () {
      // Try to compute without setting a and modulus first
      await expect(contract.connect(bob).computeRem()).to.be.reverted;
    });

    it("should fail when using wrong signer for encrypted input", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

      // Bob tries to set value with wrong signer (should use alice's encrypted input)
      const inputA = await fhevm.createEncryptedInput(contractAddress, signers.owner.address).add32(125).encrypt();
      
      // Should fail because signer doesn't match
      await expect(
        contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof)
      ).to.be.reverted;
    });

    it("should fail when modulus is zero", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      let tx;

      const a = 125;
      const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(a).encrypt();
      tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
      await tx.wait();

      // Try to set modulus to zero (should fail)
      await expect(
        contract.connect(signers.alice).setModulus(0)
      ).to.be.reverted;
    });
  });
});


```

{% endtab %}

{% endtabs %}
