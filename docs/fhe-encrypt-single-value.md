# Encrypt Single Value

<!-- chapter: basic -->

## Overview

This example demonstrates converting external encrypted inputs using Fully Homomorphic Encryption and shows how to manage FHE permissions for both contracts and users using external encrypted inputs with input proofs for verification.

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

### ❌ Pitfall 1: encryption should fail

**The Problem:** const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const enc = await fhevm.createEncryptedInput(contractAddress, signers.alice.addr...

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

{% tab title="EncryptSingleValue.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, externalEuint32, euint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * This trivial example demonstrates the FHE encryption mechanism.
 */
contract EncryptSingleValue is ZamaEthereumConfig {
  euint32 private _encryptedEuint32;

  // solhint-disable-next-line no-empty-blocks
  constructor() {}

  function initialize(externalEuint32 inputEuint32, bytes calldata inputProof) external {
    _encryptedEuint32 = FHE.fromExternal(inputEuint32, inputProof);

    // Grant FHE permission to both the contract itself (`address(this)`) and the caller (`msg.sender`),
    // to allow future decryption by the caller (`msg.sender`).
    FHE.allowThis(_encryptedEuint32);
    FHE.allow(_encryptedEuint32, msg.sender);
  }

  function encryptedUint32() public view returns (euint32) {
    return _encryptedEuint32;
  }
}
```

{% endtab %}

{% tab title="EncryptSingleValue.ts" %}

```typescript
import { EncryptSingleValue, EncryptSingleValue__factory } from "../../../types";
import type { Signers } from "../../types";
import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

async function deployFixture() {
  // Contracts are deployed using the first signer/account by default
  const factory = (await ethers.getContractFactory("EncryptSingleValue")) as EncryptSingleValue__factory;
  const encryptSingleValue = (await factory.deploy()) as EncryptSingleValue;
  const encryptSingleValue_address = await encryptSingleValue.getAddress();

  return { encryptSingleValue, encryptSingleValue_address };
}

/**
 * @chapter basic
 * @title Encrypt Single Value Test Suite
 * @notice This trivial example demonstrates the FHE encryption mechanism
 * and highlights a common pitfall developers may encounter.
 */
describe("EncryptSingleValue", function () {
  let contract: EncryptSingleValue;
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
    contractAddress = deployment.encryptSingleValue_address;
    contract = deployment.encryptSingleValue;
  });

  // ✅ Test should succeed
  it("encryption should succeed", async function () {
    // Use the FHEVM Hardhat plugin runtime environment
    // to perform FHEVM input encryptions.
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    // 🔐 Encryption Process:
    // Values are encrypted locally and bound to a specific contract/user pair.
    // This grants the bound contract FHE permissions to receive and process the encrypted value,
    // but only when it is sent by the bound user.
    const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);

    // Add a uint32 value to the list of values to encrypt locally.
    input.add32(123456);

    // Perform the local encryption. This operation produces two components:
    // 1. `handles`: an array of FHEVM handles. In this case, a single handle associated with the
    //    locally encrypted uint32 value `123456`.
    // 2. `inputProof`: a zero-knowledge proof that attests the `handles` are cryptographically
    //    bound to the pair `[contractAddress, signers.alice.address]`.
    const enc = await input.encrypt();

    // a 32-bytes FHEVM handle that represents a future Solidity `euint32` value.
    const inputEuint32 = enc.handles[0];
    const inputProof = enc.inputProof;

    // Now `signers.alice.address` can send the encrypted value and its associated zero-knowledge proof
    // to the smart contract deployed at `contractAddress`.
    const tx = await contract.connect(signers.alice).initialize(inputEuint32, inputProof);
    await tx.wait();

    // Let's try to decrypt it to check that everything is ok!
    const encryptedUint32 = await contract.encryptedUint32();

    const clearUint32 = await fhevm.userDecryptEuint(
      FhevmType.euint32, // Specify the encrypted type
      encryptedUint32,
      contractAddress, // The contract address
      signers.alice, // The user wallet
    );

    expect(clearUint32).to.equal(123456);
  });

  // ❌ This test illustrates a very common pitfall
  it("encryption should fail", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const enc = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(123456).encrypt();

    const inputEuint32 = enc.handles[0];
    const inputProof = enc.inputProof;

    try {
      // Here is a very common error !
      // `contract.initialize` will sign the Ethereum transaction using user `signers.owner`
      // instead of `signers.alice`.
      //
      // In the Solidity contract the following is checked:
      // - Is the contract allowed to manipulate `inputEuint32`? Answer is: ✅ yes!
      // - Is the sender allowed to manipulate `inputEuint32`? Answer is: ❌ no! Only `signers.alice` is!
      const tx = await contract.initialize(inputEuint32, inputProof);
      await tx.wait();
    } catch {
      //console.log(e);
    }
  });
});
```

{% endtab %}

{% endtabs %}
