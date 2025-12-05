# User Decrypt Multiple Values

## Overview

This example shows how to decrypt multiple encrypted values for a user.

## What You'll Learn

- **FHE.add operation** - How to perform this specific homomorphic operation on encrypted values
- **FHE permissions** - Granting permissions for operations and decryption
- **User decryption** - Decrypting results for authorized users

## Key Concepts

### 1. FHE.add Operation

The `FHE.add()` function performs addition on encrypted values, computing the sum without ever decrypting the operands.

### 2. FHE Permissions

Permissions control who can:
- **Perform operations**: Contracts need `FHE.allowThis()`
- **Decrypt values**: Users need `FHE.allow()`

## Step-by-Step Walkthrough

### Step 1: Set Encrypted Values

Encrypt your values off-chain and send them to the contract using `initialize()`.

### Step 2: Perform FHE.add Operation

Call the function that performs `FHE.add` (e.g., `encryptedBool()`).

### Step 3: Decrypt Result

Use `userDecrypt` to retrieve the plaintext result.

## Common Pitfalls

### ❌ Pitfall 1: should fail when wrong user tries to decrypt

**The Problem:** Bob tries to decrypt Alice's encrypted values (should fail)

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

{% tab title="UserDecryptMultipleValues.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, ebool, euint32, euint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract UserDecryptMultipleValues is ZamaEthereumConfig {
  ebool private _encryptedBool; // = 0 (uninitizalized)
  euint32 private _encryptedUint32; // = 0 (uninitizalized)
  euint64 private _encryptedUint64; // = 0 (uninitizalized)

  // solhint-disable-next-line no-empty-blocks
  constructor() {}

  function initialize(bool a, uint32 b, uint64 c) external {
    // Compute 3 trivial FHE formulas

    // _encryptedBool = a ^ false
    _encryptedBool = FHE.xor(FHE.asEbool(a), FHE.asEbool(false));

    // _encryptedUint32 = b + 1
    _encryptedUint32 = FHE.add(FHE.asEuint32(b), FHE.asEuint32(1));

    // _encryptedUint64 = c + 1
    _encryptedUint64 = FHE.add(FHE.asEuint64(c), FHE.asEuint64(1));

    // see `DecryptSingleValue.sol` for more detailed explanations
    // about FHE permissions and asynchronous user decryption requests.
    FHE.allowThis(_encryptedBool);
    FHE.allowThis(_encryptedUint32);
    FHE.allowThis(_encryptedUint64);

    FHE.allow(_encryptedBool, msg.sender);
    FHE.allow(_encryptedUint32, msg.sender);
    FHE.allow(_encryptedUint64, msg.sender);
  }

  function encryptedBool() public view returns (ebool) {
    return _encryptedBool;
  }

  function encryptedUint32() public view returns (euint32) {
    return _encryptedUint32;
  }

  function encryptedUint64() public view returns (euint64) {
    return _encryptedUint64;
  }
}
```

{% endtab %}

{% tab title="UserDecryptMultipleValues.ts" %}

```typescript
import { UserDecryptMultipleValues, UserDecryptMultipleValues__factory } from "../../../types";
import type { Signers } from "../../types";
import { HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { utils as fhevm_utils } from "@fhevm/mock-utils";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { DecryptedResults } from "@zama-fhe/relayer-sdk";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

async function deployFixture() {
  // Contracts are deployed using the first signer/account by default
  const factory = (await ethers.getContractFactory("UserDecryptMultipleValues")) as UserDecryptMultipleValues__factory;
  const userDecryptMultipleValues = (await factory.deploy()) as UserDecryptMultipleValues;
  const userDecryptMultipleValues_address = await userDecryptMultipleValues.getAddress();

  return { userDecryptMultipleValues, userDecryptMultipleValues_address };
}

/**
 * This trivial example demonstrates the FHE user decryption mechanism
 * and highlights a common pitfall developers may encounter.
 */
describe("UserDecryptMultipleValues", function () {
  let contract: UserDecryptMultipleValues;
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
    contractAddress = deployment.userDecryptMultipleValues_address;
    contract = deployment.userDecryptMultipleValues;
  });

  // ✅ Test should succeed
  it("user decryption should succeed", async function () {
    const tx = await contract.connect(signers.alice).initialize(true, 123456, 78901234567);
    await tx.wait();

    const encryptedBool = await contract.encryptedBool();
    const encryptedUint32 = await contract.encryptedUint32();
    const encryptedUint64 = await contract.encryptedUint64();

    // The FHEVM Hardhat plugin provides a set of convenient helper functions
    // that make it easy to perform FHEVM operations within your Hardhat environment.
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const aliceKeypair = fhevm.generateKeypair();

    const startTimestamp = fhevm_utils.timestampNow();
    const durationDays = 365;

    const aliceEip712 = fhevm.createEIP712(aliceKeypair.publicKey, [contractAddress], startTimestamp, durationDays);
    const aliceSignature = await signers.alice.signTypedData(
      aliceEip712.domain,
      { UserDecryptRequestVerification: aliceEip712.types.UserDecryptRequestVerification },
      aliceEip712.message,
    );

    const decrytepResults: DecryptedResults = await fhevm.userDecrypt(
      [
        { handle: encryptedBool, contractAddress: contractAddress },
        { handle: encryptedUint32, contractAddress: contractAddress },
        { handle: encryptedUint64, contractAddress: contractAddress },
      ],
      aliceKeypair.privateKey,
      aliceKeypair.publicKey,
      aliceSignature,
      [contractAddress],
      signers.alice.address,
      startTimestamp,
      durationDays,
    );

    expect(decrytepResults[encryptedBool]).to.equal(true);
    expect(decrytepResults[encryptedUint32]).to.equal(123456 + 1);
    expect(decrytepResults[encryptedUint64]).to.equal(78901234567 + 1);
  });

  // ❌ Common Pitfalls
  describe("❌ Common Pitfalls", function () {
    it("should fail when wrong user tries to decrypt", async function () {
      const tx = await contract.connect(signers.alice).initialize(true, 123456, 78901234567);
      await tx.wait();

      const encryptedBool = await contract.encryptedBool();
      const encryptedUint32 = await contract.encryptedUint32();
      const encryptedUint64 = await contract.encryptedUint64();

      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

      // Bob tries to decrypt Alice's encrypted values (should fail)
      // Bob doesn't have permission to decrypt values encrypted for Alice
      const bobKeypair = fhevm.generateKeypair();
      const startTimestamp = fhevm_utils.timestampNow();
      const durationDays = 365;

      const bobEip712 = fhevm.createEIP712(bobKeypair.publicKey, [contractAddress], startTimestamp, durationDays);
      const bobSignature = await signers.owner.signTypedData(
        bobEip712.domain,
        { UserDecryptRequestVerification: bobEip712.types.UserDecryptRequestVerification },
        bobEip712.message,
      );

      // Should fail because Bob is not authorized to decrypt Alice's encrypted values
      // The error is thrown by the mock FHEVM instance, not a contract revert
      // Use Chai's rejectedWith to properly catch async errors
      await expect(
        fhevm.userDecrypt(
          [
            { handle: encryptedBool, contractAddress: contractAddress },
            { handle: encryptedUint32, contractAddress: contractAddress },
            { handle: encryptedUint64, contractAddress: contractAddress },
          ],
          bobKeypair.privateKey,
          bobKeypair.publicKey,
          bobSignature,
          [contractAddress],
          signers.owner.address, // Wrong address - trying to decrypt Alice's values
          startTimestamp,
          durationDays,
        )
      ).to.be.rejectedWith(/is not authorized to user decrypt handle/);
    });
  });
});
```

{% endtab %}

{% endtabs %}
