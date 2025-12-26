# FHE Subtraction Operation Example

<!-- chapter: basic -->

## Overview

Demonstrates FHE.sub operation to subtract two encrypted values. This example demonstrates the FHE encryption mechanism, showing how to convert external encrypted inputs to internal encrypted values using input proofs and shows how to manage FHE permissions for both contracts and users using external encrypted inputs with input proofs for verification.

## What You'll Learn

- **FHE.sub operation** - How to perform this specific homomorphic operation on encrypted values
- **Off-chain encryption** - Encrypting values locally before sending to contract
- **FHE permissions** - Granting permissions for operations and decryption
- **User decryption** - Decrypting results for authorized users

## Key Concepts

### 1. FHE.sub Operation

The `FHE.sub()` function performs subtraction on encrypted values, computing the difference without decrypting.

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

### Step 2: Perform FHE.sub Operation

Call the function that performs `FHE.sub` (e.g., `computeSub()`).

### Step 3: Decrypt Result

Use `userDecrypt` to retrieve the plaintext result.

## Common Pitfalls

### ❌ Pitfall 1: should fail when using wrong signer for encrypted input

**The Problem:** Bob tries to set value with wrong signer (should use alice's encrypted input)

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

{% tab title="FHESub.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint8, externalEuint8 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Subtraction Operation Example
/// @notice Demonstrates FHE.sub operation to subtract two encrypted values
/// @dev No underflow protection - in production, add range checks.
///      The subtraction is performed as: result = a - b
contract FHESub is ZamaEthereumConfig {
  euint8 private _a;
  euint8 private _b;
  euint8 private _sub_result;

  constructor() {}

  function setA(externalEuint8 inputA, bytes calldata inputProof) external {
    _a = FHE.fromExternal(inputA, inputProof);
    FHE.allowThis(_a);
  }

  function setB(externalEuint8 inputB, bytes calldata inputProof) external {
    _b = FHE.fromExternal(inputB, inputProof);
    FHE.allowThis(_b);
  }

  function computeSub() external {
    // Compute subtraction of two encrypted values: a - b
    // The contract must have FHE permissions over both `a` and `b`
    // Note: No underflow protection in FHE - ensure a >= b in production
    _sub_result = FHE.sub(_a, _b);

    // Grant permanent FHE permissions to contract and caller
    FHE.allowThis(_sub_result);
    FHE.allow(_sub_result, msg.sender);
  }

  function result() public view returns (euint8) {
    return _sub_result;
  }
}

```

{% endtab %}

{% tab title="FHESub.ts" %}

```typescript
import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import type { FHESub, FHESub__factory } from "../../../types";

type Signers = {
  owner: HardhatEthersSigner;
  alice: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHESub")) as unknown as FHESub__factory;
  const fheSub = (await factory.deploy()) as FHESub;
  const fheSub_address = await fheSub.getAddress();
  return { fheSub, fheSub_address };
}

/**
 * @chapter basic
 * @title FHE Subtraction Operation Test
 * @notice Tests FHE.sub operation to subtract two encrypted values
 */
describe("FHESub", function () {
  let contract: FHESub;
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
    contractAddress = deployment.fheSub_address;
    contract = deployment.fheSub;
  });

  it("should compute subtraction of two values", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
    let tx;

    // Test: 123 - 80 = 43
    const a = 123;
    const b = 80;

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    tx = await contract.connect(bob).computeSub();
    await tx.wait();

    const encryptedSub = await contract.result();
    const clearSub = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      encryptedSub,
      contractAddress,
      bob,
    );

    expect(clearSub).to.equal(a - b);
  });

  it("should compute subtraction resulting in zero", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
    let tx;

    // Test: 100 - 100 = 0
    const a = 100;
    const b = 100;

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    tx = await contract.connect(bob).computeSub();
    await tx.wait();

    const encryptedSub = await contract.result();
    const clearSub = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      encryptedSub,
      contractAddress,
      bob,
    );

    expect(clearSub).to.equal(0);
  });

  // ❌ Common Pitfalls
  describe("❌ Common Pitfalls", function () {
    it("should compute zero when values are not set", async function () {
      // Common pitfall: Computing without setting values
      // FHE operations on uninitialized values return zero, they don't revert
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      const tx = await contract.connect(bob).computeSub();
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
      const inputA = await fhevm.createEncryptedInput(contractAddress, signers.owner.address).add8(80).encrypt();
      
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
