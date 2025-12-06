# FHE Add Operation

<!-- chapter: basic -->

## Overview

This example demonstrates adding encrypted values, converting external encrypted inputs using Fully Homomorphic Encryption and shows how to manage FHE permissions for both contracts and users using external encrypted inputs with input proofs for verification.

## What You'll Learn

- **FHE.add operation** - How to perform this specific homomorphic operation on encrypted values
- **Off-chain encryption** - Encrypting values locally before sending to contract
- **FHE permissions** - Granting permissions for operations and decryption
- **User decryption** - Decrypting results for authorized users

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

Encrypt your values off-chain and send them to the contract using `setA()`.

### Step 2: Perform FHE.add Operation

Call the function that performs `FHE.add` (e.g., `computeAPlusB()`).

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

{% tab title="FHEAdd.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint8, externalEuint8 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract FHEAdd is ZamaEthereumConfig {
  euint8 private _a;
  euint8 private _b;
  // solhint-disable-next-line var-name-mixedcase
  euint8 private _a_plus_b;

  // solhint-disable-next-line no-empty-blocks
  constructor() {}

  function setA(externalEuint8 inputA, bytes calldata inputProof) external {
    _a = FHE.fromExternal(inputA, inputProof);
    FHE.allowThis(_a);
  }

  function setB(externalEuint8 inputB, bytes calldata inputProof) external {
    _b = FHE.fromExternal(inputB, inputProof);
    FHE.allowThis(_b);
  }

  function computeAPlusB() external {
    // The sum `a + b` is computed by the contract itself (`address(this)`).
    // Since the contract has FHE permissions over both `a` and `b`,
    // it is authorized to perform the `FHE.add` operation on these values.
    // It does not matter if the contract caller (`msg.sender`) has FHE permission or not.
    _a_plus_b = FHE.add(_a, _b);

    // At this point the contract ifself (`address(this)`) has been granted ephemeral FHE permission
    // over `_a_plus_b`. This FHE permission will be revoked when the function exits.
    //
    // Now, to make sure `_a_plus_b` can be decrypted by the contract caller (`msg.sender`),
    // we need to grant permanent FHE permissions to both the contract ifself (`address(this)`)
    // and the contract caller (`msg.sender`)
    FHE.allowThis(_a_plus_b);
    FHE.allow(_a_plus_b, msg.sender);
  }

  function result() public view returns (euint8) {
    return _a_plus_b;
  }
}
```

{% endtab %}

{% tab title="FHEAdd.ts" %}

```typescript
import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import { FHEAdd, FHEAdd__factory } from "../../../types";
import type { Signers } from "../../types";

async function deployFixture() {
  // Contracts are deployed using the first signer/account by default
  const factory = (await ethers.getContractFactory("FHEAdd")) as FHEAdd__factory;
  const fheAdd = (await factory.deploy()) as FHEAdd;
  const fheAdd_address = await fheAdd.getAddress();

  return { fheAdd, fheAdd_address };
}

/**
 * @chapter basic
 * @title FHE Addition Operation Test
 * @notice This trivial example demonstrates the FHE encryption mechanism
 * and highlights a common pitfall developers may encounter.
 */
describe("FHEAdd", function () {
  let contract: FHEAdd;
  let contractAddress: string;
  let signers: Signers;
  let bob: HardhatEthersSigner;

  before(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!hre.fhevm.isMock) {
      throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`);
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { owner: ethSigners[0], alice: ethSigners[1] };
    bob = ethSigners[2];
  });

  beforeEach(async function () {
    // Deploy a new contract each time we run a new test
    const deployment = await deployFixture();
    contractAddress = deployment.fheAdd_address;
    contract = deployment.fheAdd;
  });

  it("a + b should succeed", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    let tx;

    // Let's compute 80 + 123 = 203
    const a = 80;
    const b = 123;

    // Alice encrypts and sets `a` as 80
    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    // Alice encrypts and sets `b` as 203
    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    // Why Bob has FHE permissions to execute the operation in this case ?
    // See `computeAPlusB()` in `FHEAdd.sol` for a detailed answer
    tx = await contract.connect(bob).computeAPlusB();
    await tx.wait();

    const encryptedAplusB = await contract.result();

    const clearAplusB = await fhevm.userDecryptEuint(
      FhevmType.euint8, // Specify the encrypted type
      encryptedAplusB,
      contractAddress, // The contract address
      bob, // The user wallet
    );

    expect(clearAplusB).to.equal(a + b);
  });

  // ❌ Common Pitfalls
  describe("❌ Common Pitfalls", function () {
    it("should compute zero when values are not set", async function () {
      // Common pitfall: Computing without setting values
      // FHE operations on uninitialized values return zero, they don't revert
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      const tx = await contract.connect(bob).computeAPlusB();
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
