# Encrypt Multiple Values

## Overview

This example demonstrates converting external encrypted inputs using Fully Homomorphic Encryption and shows how to manage FHE permissions for both contracts and users using external encrypted inputs with input proofs for verification.

## What You'll Learn

- **Off-chain encryption** - Encrypting values locally before sending to contract
- **FHE permissions** - Granting permissions for operations and decryption

## Key Concepts

### 1. Off-Chain Encryption

Values are encrypted locally (on the client side) before being sent to the contract: plaintext values never appear in transactions, encryption is cryptographically bound to [contract, user] pair, and input proofs verify the binding.

### 2. FHE Permissions

Permissions control who can perform operations (contracts need `FHE.allowThis()`) and decrypt values (users need `FHE.allow()`).

## Step-by-Step Walkthrough

### Step 1: Setup

Deploy the contract and prepare encrypted inputs.

### Step 2: Execute Operations

Call contract functions with encrypted values and proofs.

### Step 3: Decrypt Results

Use the appropriate decryption method to retrieve plaintext values.

## Common Pitfalls

### ❌ Pitfall 1: should fail when using wrong signer for encrypted input

**The Problem:** Wrong signer!

**Why it fails:** The operation fails due to incorrect usage, permissions, or signer mismatch.

**The Fix:** Ensure proper setup, matching signers, and correct permissions.

### ❌ Pitfall 2: should fail when input proof is invalid

**The Problem:** Invalid proof

**Why it fails:** The operation fails due to incorrect usage, permissions, or signer mismatch.

**The Fix:** Ensure proper setup, matching signers, and correct permissions.

## Best Practices

1. **Always match encryption signer with transaction signer**
2. **Grant permissions immediately after creating encrypted values**
3. **Use descriptive variable names** for clarity
4. **Validate inputs** before performing operations

## Real-World Use Cases

- **Confidential Voting**: Encrypt votes before submission
- **Private Auctions**: Encrypt bids to hide amounts
{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}

{% tab title="EncryptMultipleValues.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {
  FHE,
  externalEbool,
  externalEuint32,
  externalEaddress,
  ebool,
  euint32,
  eaddress
} from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * This trivial example demonstrates the FHE encryption mechanism.
 */
contract EncryptMultipleValues is ZamaEthereumConfig {
  ebool private _encryptedEbool;
  euint32 private _encryptedEuint32;
  eaddress private _encryptedEaddress;

  // solhint-disable-next-line no-empty-blocks
  constructor() {}

  function initialize(
    externalEbool inputEbool,
    externalEuint32 inputEuint32,
    externalEaddress inputEaddress,
    bytes calldata inputProof
  ) external {
    _encryptedEbool = FHE.fromExternal(inputEbool, inputProof);
    _encryptedEuint32 = FHE.fromExternal(inputEuint32, inputProof);
    _encryptedEaddress = FHE.fromExternal(inputEaddress, inputProof);

    // For each of the 3 values:
    // Grant FHE permission to both the contract itself (`address(this)`) and the caller (`msg.sender`),
    // to allow future decryption by the caller (`msg.sender`).

    FHE.allowThis(_encryptedEbool);
    FHE.allow(_encryptedEbool, msg.sender);

    FHE.allowThis(_encryptedEuint32);
    FHE.allow(_encryptedEuint32, msg.sender);

    FHE.allowThis(_encryptedEaddress);
    FHE.allow(_encryptedEaddress, msg.sender);
  }

  function encryptedBool() public view returns (ebool) {
    return _encryptedEbool;
  }

  function encryptedUint32() public view returns (euint32) {
    return _encryptedEuint32;
  }

  function encryptedAddress() public view returns (eaddress) {
    return _encryptedEaddress;
  }
}
```

{% endtab %}

{% tab title="EncryptMultipleValues.ts" %}

```typescript
//TODO;
import { EncryptMultipleValues, EncryptMultipleValues__factory } from "../../../types";
import type { Signers } from "../../types";
import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

async function deployFixture() {
  // Contracts are deployed using the first signer/account by default
  const factory = (await ethers.getContractFactory("EncryptMultipleValues")) as EncryptMultipleValues__factory;
  const encryptMultipleValues = (await factory.deploy()) as EncryptMultipleValues;
  const encryptMultipleValues_address = await encryptMultipleValues.getAddress();

  return { encryptMultipleValues, encryptMultipleValues_address };
}

/**
 * This trivial example demonstrates the FHE encryption mechanism
 * and highlights a common pitfall developers may encounter.
 */
describe("EncryptMultipleValues", function () {
  let contract: EncryptMultipleValues;
  let contractAddress: string;
  let signers: Signers;

  before(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!hre.fhevm.isMock) {
      throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`);
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { owner: ethSigners[0], alice: ethSigners[1] };
  });

  beforeEach(async function () {
    // Deploy a new contract each time we run a new test
    const deployment = await deployFixture();
    contractAddress = deployment.encryptMultipleValues_address;
    contract = deployment.encryptMultipleValues;
  });

  // ✅ Test should succeed
  it("encryption should succeed", async function () {
    // Use the FHEVM Hardhat plugin runtime environment
    // to perform FHEVM input encryptions.
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);

    input.addBool(true);
    input.add32(123456);
    input.addAddress(signers.owner.address);

    const enc = await input.encrypt();

    const inputEbool = enc.handles[0];
    const inputEuint32 = enc.handles[1];
    const inputEaddress = enc.handles[2];
    const inputProof = enc.inputProof;

    // Don't forget to call `connect(signers.alice)` to make sure
    // the Solidity `msg.sender` is `signers.alice.address`.
    const tx = await contract.connect(signers.alice).initialize(inputEbool, inputEuint32, inputEaddress, inputProof);
    await tx.wait();

    const encryptedBool = await contract.encryptedBool();
    const encryptedUint32 = await contract.encryptedUint32();
    const encryptedAddress = await contract.encryptedAddress();

    const clearBool = await fhevm.userDecryptEbool(
      encryptedBool,
      contractAddress, // The contract address
      signers.alice, // The user wallet
    );

    const clearUint32 = await fhevm.userDecryptEuint(
      FhevmType.euint32, // Specify the encrypted type
      encryptedUint32,
      contractAddress, // The contract address
      signers.alice, // The user wallet
    );

    const clearAddress = await fhevm.userDecryptEaddress(
      encryptedAddress,
      contractAddress, // The contract address
      signers.alice, // The user wallet
    );

    expect(clearBool).to.equal(true);
    expect(clearUint32).to.equal(123456);
    expect(clearAddress).to.equal(signers.owner.address);
  });

  // ❌ Common Pitfalls
  describe("❌ Common Pitfalls", function () {
    it("should fail when using wrong signer for encrypted input", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

      const input = fhevm.createEncryptedInput(contractAddress, signers.owner.address); // Wrong signer!

      input.addBool(true);
      input.add32(123456);
      input.addAddress(signers.owner.address);

      const enc = await input.encrypt();

      const inputEbool = enc.handles[0];
      const inputEuint32 = enc.handles[1];
      const inputEaddress = enc.handles[2];
      const inputProof = enc.inputProof;

      // Should fail because signer doesn't match the one used to create encrypted input
      await expect(
        contract.connect(signers.alice).initialize(inputEbool, inputEuint32, inputEaddress, inputProof)
      ).to.be.reverted;
    });

    it("should fail when input proof is invalid", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);

      input.addBool(true);
      input.add32(123456);
      input.addAddress(signers.owner.address);

      const enc = await input.encrypt();

      const inputEbool = enc.handles[0];
      const inputEuint32 = enc.handles[1];
      const inputEaddress = enc.handles[2];
      const invalidProof = "0x" + "00".repeat(32); // Invalid proof

      // Should fail with invalid proof
      await expect(
        contract.connect(signers.alice).initialize(inputEbool, inputEuint32, inputEaddress, invalidProof)
      ).to.be.reverted;
    });
  });
});
```

{% endtab %}

{% endtabs %}
