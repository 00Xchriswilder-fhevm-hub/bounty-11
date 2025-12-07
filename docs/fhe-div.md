# FHE Div Operation

<!-- chapter: basic -->

## Overview

This example demonstrates the FHE encryption mechanism, showing how to convert external encrypted inputs to internal encrypted values using input proofs and shows how to manage FHE permissions for both contracts and users using external encrypted inputs with input proofs for verification.

## What You'll Learn

- **FHE.div operation** - How to perform this specific homomorphic operation on encrypted values
- **Off-chain encryption** - Encrypting values locally before sending to contract
- **FHE permissions** - Granting permissions for operations and decryption

## Key Concepts

### 1. FHE.div Operation

The `FHE.div()` function performs division on encrypted values, computing the quotient without decrypting.

### 2. Off-Chain Encryption

Values are encrypted locally (on the client side) before being sent to the contract: plaintext values never appear in transactions, encryption is cryptographically bound to [contract, user] pair, and input proofs verify the binding.

### 3. FHE Permissions

Permissions control who can perform operations (contracts need `FHE.allowThis()`) and decrypt values (users need `FHE.allow()`).

## Step-by-Step Walkthrough

### Step 1: Set Encrypted Values

Encrypt your values off-chain and send them to the contract using `setA()`.

### Step 2: Perform FHE.div Operation

Call the function that performs `FHE.div` (e.g., `computeDiv()`).

### Step 3: Decrypt Result

Use `userDecrypt` to retrieve the plaintext result.

## Common Pitfalls

### ❌ Pitfall 1: should fail when trying to compute without setting values

**The Problem:** Try to compute without setting a and divisor first

**Why it fails:** The operation fails due to incorrect usage, permissions, or signer mismatch.

**The Fix:** Ensure proper setup, matching signers, and correct permissions.

### ❌ Pitfall 2: should fail when using wrong signer for encrypted input

**The Problem:** Bob tries to set value with wrong signer (should use alice's encrypted input)

**Why it fails:** The operation fails due to incorrect usage, permissions, or signer mismatch.

**The Fix:** Ensure proper setup, matching signers, and correct permissions.

### ❌ Pitfall 3: should fail when divisor is zero

**The Problem:** Try to set divisor to zero (should fail or handle gracefully)

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

{% tab title="FHEDiv.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint32, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Division Operation Example
/// @notice Demonstrates FHE.div operation to divide an encrypted value by a plaintext value
/// @dev Note: FHE division requires the divisor to be a plaintext value, not encrypted
contract FHEDiv is ZamaEthereumConfig {
  euint32 private _a;
  uint32 private _divisor;
  euint32 private _div_result;

  constructor() {}

  function setA(externalEuint32 inputA, bytes calldata inputProof) external {
    _a = FHE.fromExternal(inputA, inputProof);
    FHE.allowThis(_a);
  }

  function setDivisor(uint32 divisor) external {
    require(divisor > 0, "Divisor must be greater than zero");
    _divisor = divisor;
  }

  function computeDiv() external {
    // Divide encrypted value by plaintext divisor (a / divisor)
    // The contract must have FHE permissions over `a`
    // Note: Division by zero is prevented by setDivisor check
    _div_result = FHE.div(_a, _divisor);

    // Grant permanent FHE permissions to contract and caller
    FHE.allowThis(_div_result);
    FHE.allow(_div_result, msg.sender);
  }

  function result() public view returns (euint32) {
    return _div_result;
  }
}


```

{% endtab %}

{% tab title="FHEDiv.ts" %}

```typescript
import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import type { FHEDiv, FHEDiv__factory } from "../../../types";

type Signers = {
  owner: HardhatEthersSigner;
  alice: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHEDiv")) as unknown as FHEDiv__factory;
  const fheDiv = (await factory.deploy()) as FHEDiv;
  const fheDiv_address = await fheDiv.getAddress();
  return { fheDiv, fheDiv_address };
}

/**
 * @chapter basic
 * @title FHE Division Operation Test
 * @notice Tests FHE.div operation to divide an encrypted value by a plaintext divisor
 */
describe("FHEDiv", function () {
  let contract: FHEDiv;
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
    contractAddress = deployment.fheDiv_address;
    contract = deployment.fheDiv;
  });

  it("should divide encrypted value by plaintext divisor", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
    let tx;

    // Test: 120 / 8 = 15
    const a = 120;
    const divisor = 8;

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    // Set plaintext divisor
    tx = await contract.connect(signers.alice).setDivisor(divisor);
    await tx.wait();

    tx = await contract.connect(bob).computeDiv();
    await tx.wait();

    const encryptedDiv = await contract.result();
    const clearDiv = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedDiv,
      contractAddress,
      bob,
    );

    expect(clearDiv).to.equal(Math.floor(a / divisor));
  });

  // ❌ Common Pitfalls
  describe("❌ Common Pitfalls", function () {
    it("should fail when trying to compute without setting values", async function () {
      // Try to compute without setting a and divisor first
      await expect(contract.connect(bob).computeDiv()).to.be.reverted;
    });

    it("should fail when using wrong signer for encrypted input", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

      // Bob tries to set value with wrong signer (should use alice's encrypted input)
      const inputA = await fhevm.createEncryptedInput(contractAddress, signers.owner.address).add32(120).encrypt();
      
      // Should fail because signer doesn't match
      await expect(
        contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof)
      ).to.be.reverted;
    });

    it("should fail when divisor is zero", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      let tx;

      const a = 120;
      const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(a).encrypt();
      tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
      await tx.wait();

      // Try to set divisor to zero (should fail or handle gracefully)
      await expect(
        contract.connect(signers.alice).setDivisor(0)
      ).to.be.reverted;
    });
  });
});


```

{% endtab %}

{% endtabs %}
