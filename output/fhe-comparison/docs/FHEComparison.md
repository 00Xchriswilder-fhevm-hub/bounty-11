# FHE Comparison Operations Example

<!-- chapter: basic -->

## Overview

Demonstrates all FHE comparison operations on encrypted integers. This example demonstrates the FHE encryption mechanism, showing how to convert external encrypted inputs to internal encrypted values using input proofs and shows how to manage FHE permissions for both contracts and users using external encrypted inputs with input proofs for verification.

## What You'll Learn

- **FHE.select operation** - How to perform this specific homomorphic operation on encrypted values
- **Off-chain encryption** - Encrypting values locally before sending to contract
- **FHE permissions** - Granting permissions for operations and decryption
- **User decryption** - Decrypting results for authorized users

## Key Concepts

### 1. FHE.select Operation

The `FHE.select()` function performs conditional selection (if-then-else) on encrypted values based on an encrypted boolean condition.

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

### Step 2: Perform FHE.select Operation

Call the function that performs `FHE.select` (e.g., `computeEq()`).

### Step 3: Decrypt Result

Use `userDecrypt` to retrieve the plaintext result.

## Common Pitfalls

### ❌ Pitfall 1: should fail when using wrong signer for encrypted input

**The Problem:** Bob tries to set value with wrong signer

**Why it fails:** The input proof verification or permission check fails when requirements aren't met.

**The Fix:** Always ensure signers match and permissions are granted correctly.

## Best Practices

1. **Always match encryption signer with transaction signer**
2. **Grant permissions immediately after creating encrypted values**
3. **Use descriptive variable names** for clarity
4. **Validate inputs** before performing operations

## Real-World Use Cases

- **Conditional Transfers**: Transfer based on encrypted conditions
- **Privacy-Preserving Branching**: Implement if-then-else logic on encrypted values
{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}

{% tab title="FHEComparison.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, ebool, euint32, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Comparison Operations Example
/// @notice Demonstrates all FHE comparison operations on encrypted integers
/// @dev Comparison results are returned as encrypted booleans (ebool).
///      These operations are fundamental for building conditional logic in FHE applications.
///
/// Available operations:
/// - FHE.eq(a, b)   : Equal (a == b) - Returns ebool true if values are equal
/// - FHE.ne(a, b)   : Not equal (a != b) - Returns ebool true if values differ
/// - FHE.gt(a, b)   : Greater than (a > b) - Returns ebool true if a exceeds b
/// - FHE.lt(a, b)   : Less than (a < b) - Returns ebool true if a is below b
/// - FHE.ge(a, b)   : Greater or equal (a >= b) - Returns ebool true if a >= b
/// - FHE.le(a, b)   : Less or equal (a <= b) - Returns ebool true if a <= b
/// - FHE.select(cond, a, b) : Conditional selection - Returns a if cond is true, else b
contract FHEComparison is ZamaEthereumConfig {
  euint32 private _a;
  euint32 private _b;
  ebool private _boolResult;
  euint32 private _selectedResult;

  // solhint-disable-next-line no-empty-blocks
  constructor() {}

  /// @notice Sets the first operand (encrypted)
  function setA(externalEuint32 inputA, bytes calldata inputProof) external {
    _a = FHE.fromExternal(inputA, inputProof);
    FHE.allowThis(_a);
  }

  /// @notice Sets the second operand (encrypted)
  function setB(externalEuint32 inputB, bytes calldata inputProof) external {
    _b = FHE.fromExternal(inputB, inputProof);
    FHE.allowThis(_b);
  }

  /// @notice Computes encrypted equality: result = (a == b)
  function computeEq() external {
    _boolResult = FHE.eq(_a, _b);
    _grantBoolPermissions();
  }

  /// @notice Computes encrypted inequality: result = (a != b)
  function computeNe() external {
    _boolResult = FHE.ne(_a, _b);
    _grantBoolPermissions();
  }

  /// @notice Computes encrypted greater than: result = (a > b)
  function computeGt() external {
    _boolResult = FHE.gt(_a, _b);
    _grantBoolPermissions();
  }

  /// @notice Computes encrypted less than: result = (a < b)
  function computeLt() external {
    _boolResult = FHE.lt(_a, _b);
    _grantBoolPermissions();
  }

  /// @notice Computes encrypted greater or equal: result = (a >= b)
  function computeGe() external {
    _boolResult = FHE.ge(_a, _b);
    _grantBoolPermissions();
  }

  /// @notice Computes encrypted less or equal: result = (a <= b)
  function computeLe() external {
    _boolResult = FHE.le(_a, _b);
    _grantBoolPermissions();
  }

  /// @notice Computes encrypted maximum using select: result = (a > b) ? a : b
  /// @dev Demonstrates FHE.select for conditional logic on encrypted values
  function computeMaxViaSelect() external {
    ebool aGtB = FHE.gt(_a, _b);
    _selectedResult = FHE.select(aGtB, _a, _b);
    FHE.allowThis(_selectedResult);
    FHE.allow(_selectedResult, msg.sender);
  }

  /// @notice Computes encrypted minimum using select: result = (a < b) ? a : b
  function computeMinViaSelect() external {
    ebool aLtB = FHE.lt(_a, _b);
    _selectedResult = FHE.select(aLtB, _a, _b);
    FHE.allowThis(_selectedResult);
    FHE.allow(_selectedResult, msg.sender);
  }

  /// @notice Returns the encrypted boolean result
  function getBoolResult() public view returns (ebool) {
    return _boolResult;
  }

  /// @notice Returns the encrypted selected result
  function getSelectedResult() public view returns (euint32) {
    return _selectedResult;
  }

  /// @dev Grants FHE permissions for boolean result
  function _grantBoolPermissions() internal {
    FHE.allowThis(_boolResult);
    FHE.allow(_boolResult, msg.sender);
  }
}

```

{% endtab %}

{% tab title="FHEComparison.ts" %}

```typescript
import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import type { FHEComparison, FHEComparison__factory } from "../../../types";

type Signers = {
  owner: HardhatEthersSigner;
  alice: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHEComparison")) as unknown as FHEComparison__factory;
  const fheComparison = (await factory.deploy()) as FHEComparison;
  const fheComparison_address = await fheComparison.getAddress();
  return { fheComparison, fheComparison_address };
}

/**
 * @chapter basic
 * @title FHE Comparison Operations Test
 * @notice Tests all FHE comparison operations (eq, ne, gt, lt, ge, le, select)
 */
describe("FHEComparison", function () {
  let contract: FHEComparison;
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
    contractAddress = deployment.fheComparison_address;
    contract = deployment.fheComparison;
  });

  describe("Equality comparisons", function () {
    it("should compute equality (eq) - equal values", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      let tx;

      const a = 100;
      const b = 100;

      const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(a).encrypt();
      tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
      await tx.wait();

      const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(b).encrypt();
      tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
      await tx.wait();

      tx = await contract.connect(bob).computeEq();
      await tx.wait();

      const encryptedResult = await contract.getBoolResult();
      const clearResult = await fhevm.userDecryptEbool(encryptedResult, contractAddress, bob);

      expect(clearResult).to.equal(true);
    });

    it("should compute equality (eq) - different values", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      let tx;

      const a = 100;
      const b = 200;

      const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(a).encrypt();
      tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
      await tx.wait();

      const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(b).encrypt();
      tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
      await tx.wait();

      tx = await contract.connect(bob).computeEq();
      await tx.wait();

      const encryptedResult = await contract.getBoolResult();
      const clearResult = await fhevm.userDecryptEbool(encryptedResult, contractAddress, bob);

      expect(clearResult).to.equal(false);
    });

    it("should compute inequality (ne)", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      let tx;

      const a = 100;
      const b = 200;

      const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(a).encrypt();
      tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
      await tx.wait();

      const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(b).encrypt();
      tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
      await tx.wait();

      tx = await contract.connect(bob).computeNe();
      await tx.wait();

      const encryptedResult = await contract.getBoolResult();
      const clearResult = await fhevm.userDecryptEbool(encryptedResult, contractAddress, bob);

      expect(clearResult).to.equal(true);
    });
  });

  describe("Ordering comparisons", function () {
    it("should compute greater than (gt)", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      let tx;

      const a = 200;
      const b = 100;

      const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(a).encrypt();
      tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
      await tx.wait();

      const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(b).encrypt();
      tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
      await tx.wait();

      tx = await contract.connect(bob).computeGt();
      await tx.wait();

      const encryptedResult = await contract.getBoolResult();
      const clearResult = await fhevm.userDecryptEbool(encryptedResult, contractAddress, bob);

      expect(clearResult).to.equal(true);
    });

    it("should compute less than (lt)", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      let tx;

      const a = 50;
      const b = 100;

      const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(a).encrypt();
      tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
      await tx.wait();

      const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(b).encrypt();
      tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
      await tx.wait();

      tx = await contract.connect(bob).computeLt();
      await tx.wait();

      const encryptedResult = await contract.getBoolResult();
      const clearResult = await fhevm.userDecryptEbool(encryptedResult, contractAddress, bob);

      expect(clearResult).to.equal(true);
    });

    it("should compute greater or equal (ge)", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      let tx;

      const a = 100;
      const b = 100;

      const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(a).encrypt();
      tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
      await tx.wait();

      const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(b).encrypt();
      tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
      await tx.wait();

      tx = await contract.connect(bob).computeGe();
      await tx.wait();

      const encryptedResult = await contract.getBoolResult();
      const clearResult = await fhevm.userDecryptEbool(encryptedResult, contractAddress, bob);

      expect(clearResult).to.equal(true);
    });

    it("should compute less or equal (le)", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      let tx;

      const a = 100;
      const b = 100;

      const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(a).encrypt();
      tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
      await tx.wait();

      const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(b).encrypt();
      tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
      await tx.wait();

      tx = await contract.connect(bob).computeLe();
      await tx.wait();

      const encryptedResult = await contract.getBoolResult();
      const clearResult = await fhevm.userDecryptEbool(encryptedResult, contractAddress, bob);

      expect(clearResult).to.equal(true);
    });
  });

  describe("Select operations", function () {
    it("should compute max via select", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      let tx;

      const a = 80;
      const b = 200;

      const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(a).encrypt();
      tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
      await tx.wait();

      const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(b).encrypt();
      tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
      await tx.wait();

      tx = await contract.connect(bob).computeMaxViaSelect();
      await tx.wait();

      const encryptedResult = await contract.getSelectedResult();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedResult,
        contractAddress,
        bob,
      );

      expect(clearResult).to.equal(Math.max(a, b));
    });

    it("should compute min via select", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      let tx;

      const a = 80;
      const b = 200;

      const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(a).encrypt();
      tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
      await tx.wait();

      const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(b).encrypt();
      tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
      await tx.wait();

      tx = await contract.connect(bob).computeMinViaSelect();
      await tx.wait();

      const encryptedResult = await contract.getSelectedResult();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedResult,
        contractAddress,
        bob,
      );

      expect(clearResult).to.equal(Math.min(a, b));
    });
  });

  // ❌ Common Pitfalls
  describe("❌ Common Pitfalls", function () {
    it("should fail when using wrong signer for encrypted input", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

      // Bob tries to set value with wrong signer
      const inputA = await fhevm.createEncryptedInput(contractAddress, signers.owner.address).add32(100).encrypt();
      
      await expect(
        contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof)
      ).to.be.reverted;
    });
  });
});


```

{% endtab %}

{% endtabs %}
