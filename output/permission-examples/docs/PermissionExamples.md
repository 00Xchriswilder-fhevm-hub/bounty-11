# Permission Examples

<!-- chapter: access-control -->

## Overview

Permissions are required for operations on encrypted values. This example demonstrates adding encrypted values, subtracting encrypted values, multiplying encrypted values using Fully Homomorphic Encryption and shows how to manage FHE permissions for both contracts and users using external encrypted inputs with input proofs for verification.

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

Encrypt your values off-chain and send them to the contract using `setValueA()`.

### Step 2: Perform FHE.add Operation

Call the function that performs `FHE.add` (e.g., `setValueB()`).

### Step 3: Decrypt Result

Use `userDecrypt` to retrieve the plaintext result.

## Common Pitfalls

### ❌ Pitfall: Signer Mismatch

**The Problem:** Using wrong signer for encrypted input.

**Why it fails:** The input proof binds the handle to a specific user address. If the transaction signer doesn't match, verification fails.

**The Fix:** Always match encryption signer with transaction signer:

```typescript
const enc = await fhevm.createEncryptedInput(contractAddress, user.address).encrypt();
await contract.connect(user).initialize(enc.handles[0], enc.inputProof);
```

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

{% tab title="PermissionExamples.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Permission Examples
/// @notice Demonstrates various FHE permission scenarios and patterns
/// @dev This example shows:
///      - Multiple permission scenarios
///      - Permission inheritance in operations
///      - When permissions are needed
///      - Common permission patterns
/// 
/// @dev Key Concepts:
///      - Permissions are required for operations on encrypted values
///      - Contract needs allowThis to perform operations
///      - Users need allow to decrypt values
///      - Operations inherit permissions from operands
contract PermissionExamples is ZamaEthereumConfig {
    /// @notice Encrypted value A
    euint32 private _valueA;
    
    /// @notice Encrypted value B
    euint32 private _valueB;
    
    /// @notice Encrypted result
    euint32 private _result;
    
    /// @notice Mapping to track users with permission
    mapping(address => bool) public hasPermission;
    
    /// @notice Event emitted when permission is granted
    event PermissionGranted(address indexed user);
    
    /// @notice Event emitted when operation is performed
    event OperationPerformed(string operation, address indexed operator);
    
    /// @notice Initialize value A
    /// @param _encryptedInput The encrypted input
    /// @param _inputProof The proof for the encrypted input
    function setValueA(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        _valueA = FHE.fromExternal(_encryptedInput, _inputProof);
        
        // ✅ DO: Grant both permissions
        FHE.allowThis(_valueA);
        FHE.allow(_valueA, msg.sender);
        
        hasPermission[msg.sender] = true;
        emit PermissionGranted(msg.sender);
    }
    
    /// @notice Initialize value B
    /// @param _encryptedInput The encrypted input
    /// @param _inputProof The proof for the encrypted input
    function setValueB(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        _valueB = FHE.fromExternal(_encryptedInput, _inputProof);
        
        // ✅ DO: Grant both permissions
        FHE.allowThis(_valueB);
        FHE.allow(_valueB, msg.sender);
        
        hasPermission[msg.sender] = true;
        emit PermissionGranted(msg.sender);
    }
    
    /// @notice Grant permission to another user for value A
    /// @param _user The user to grant permission to
    /// @dev This demonstrates granting permission to a new user
    function grantPermissionForA(address _user) external {
        require(hasPermission[msg.sender], "You don't have permission");
        require(_user != address(0), "Invalid user");
        
        // Grant permission to the new user
        FHE.allow(_valueA, _user);
        hasPermission[_user] = true;
        
        emit PermissionGranted(_user);
    }
    
    /// @notice Add value A and value B
    /// @dev This demonstrates that the contract can perform operations
    ///      because it has allowThis permission on both values
    function addValues() external {
        // The contract can perform this operation because:
        // 1. It has allowThis permission on _valueA
        // 2. It has allowThis permission on _valueB
        // 3. Operations inherit permissions from operands
        
        _result = FHE.add(_valueA, _valueB);
        
        // ✅ DO: Grant permissions for the result
        // The result needs permissions so it can be used/decrypted
        FHE.allowThis(_result);
        // Grant permission to the caller if they have permission
        if (hasPermission[msg.sender]) {
            FHE.allow(_result, msg.sender);
        }
        
        emit OperationPerformed("add", msg.sender);
    }
    
    /// @notice Subtract value B from value A
    /// @dev Similar to addValues, demonstrates subtraction
    function subtractValues() external {
        _result = FHE.sub(_valueA, _valueB);
        
        // Grant permissions for result
        FHE.allowThis(_result);
        if (hasPermission[msg.sender]) {
            FHE.allow(_result, msg.sender);
        }
        
        emit OperationPerformed("subtract", msg.sender);
    }
    
    /// @notice Multiply value A and value B
    /// @dev Demonstrates multiplication operation
    function multiplyValues() external {
        _result = FHE.mul(_valueA, _valueB);
        
        // Grant permissions for result
        FHE.allowThis(_result);
        if (hasPermission[msg.sender]) {
            FHE.allow(_result, msg.sender);
        }
        
        emit OperationPerformed("multiply", msg.sender);
    }
    
    /// @notice Get value A (only if user has permission)
    /// @return The encrypted value A
    /// @dev This will fail if caller doesn't have FHE permission
    function getValueA() external view returns (euint32) {
        require(hasPermission[msg.sender], "Permission denied");
        // FHE.allow() check is enforced by Zama framework
        return _valueA;
    }
    
    /// @notice Get value B (only if user has permission)
    /// @return The encrypted value B
    /// @dev This will fail if caller doesn't have FHE permission
    function getValueB() external view returns (euint32) {
        require(hasPermission[msg.sender], "Permission denied");
        return _valueB;
    }
    
    /// @notice Get result (only if user has permission)
    /// @return The encrypted result
    /// @dev This will fail if caller doesn't have FHE permission
    function getResult() external view returns (euint32) {
        require(hasPermission[msg.sender], "Permission denied");
        return _result;
    }
    
    /// @notice Example: Operation that requires both values to have allowThis
    /// @dev This demonstrates that operations require permissions on operands
    function complexOperation() external {
        // This operation requires:
        // - allowThis on _valueA (contract can use it)
        // - allowThis on _valueB (contract can use it)
        // - The contract performs: (A + B) * 2
        
        euint32 sum = FHE.add(_valueA, _valueB);
        euint32 two = FHE.asEuint32(2);
        _result = FHE.mul(sum, two);
        
        // Grant permissions for result
        FHE.allowThis(_result);
        if (hasPermission[msg.sender]) {
            FHE.allow(_result, msg.sender);
        }
        
        emit OperationPerformed("complex", msg.sender);
    }
}


```

{% endtab %}

{% tab title="PermissionExamples.ts" %}

```typescript
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { PermissionExamples, PermissionExamples__factory } from "../../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

/**
 * @chapter access-control
 * @title Permission Examples Test Suite
 * @notice Tests for PermissionExamples contract showing various permission scenarios
 * @dev This test suite demonstrates:
 *      - ✅ Multiple permission scenarios
 *      - ✅ Permission inheritance in operations
 *      - ✅ Granting permissions to multiple users
 */

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("PermissionExamples")) as PermissionExamples__factory;
  const contract = (await factory.deploy()) as PermissionExamples;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("PermissionExamples", function () {
  let signers: Signers;
  let contract: PermissionExamples;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      alice: ethSigners[1],
      bob: ethSigners[2],
    };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());
  });

  describe("✅ Setting Values", function () {
    it("should set value A", async function () {
      const valueA = 10;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(valueA)
        .encrypt();

      await contract
        .connect(signers.alice)
        .setValueA(encrypted.handles[0], encrypted.inputProof);

      expect(await contract.hasPermission(signers.alice.address)).to.be.true;

      const encryptedValue = await contract.connect(signers.alice).getValueA();
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedValue,
        contractAddress,
        signers.alice,
      );

      expect(decrypted).to.eq(valueA);
    });

    it("should set value B", async function () {
      const valueB = 20;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(valueB)
        .encrypt();

      await contract
        .connect(signers.alice)
        .setValueB(encrypted.handles[0], encrypted.inputProof);

      const encryptedValue = await contract.connect(signers.alice).getValueB();
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedValue,
        contractAddress,
        signers.alice,
      );

      expect(decrypted).to.eq(valueB);
    });
  });

  describe("✅ Operations", function () {
    beforeEach(async function () {
      // Set value A = 10
      const encryptedA = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(10)
        .encrypt();
      await contract
        .connect(signers.alice)
        .setValueA(encryptedA.handles[0], encryptedA.inputProof);

      // Set value B = 20
      const encryptedB = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(20)
        .encrypt();
      await contract
        .connect(signers.alice)
        .setValueB(encryptedB.handles[0], encryptedB.inputProof);
    });

    it("should add values A and B", async function () {
      await contract.connect(signers.alice).addValues();

      const encryptedResult = await contract.connect(signers.alice).getResult();
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(decrypted).to.eq(30); // 10 + 20
    });

    it("should subtract values (A - B)", async function () {
      await contract.connect(signers.alice).subtractValues();

      const encryptedResult = await contract.connect(signers.alice).getResult();
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      // FHE uint32 subtraction wraps on underflow: 10 - 20 = 2^32 - 10 = 4294967286
      // This is expected behavior for unsigned integers
      expect(decrypted).to.eq(4294967286); // 10 - 20 wraps to max uint32 - 10
    });

    it("should multiply values A and B", async function () {
      await contract.connect(signers.alice).multiplyValues();

      const encryptedResult = await contract.connect(signers.alice).getResult();
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(decrypted).to.eq(200); // 10 * 20
    });

    it("should perform complex operation (A + B) * 2", async function () {
      await contract.connect(signers.alice).complexOperation();

      const encryptedResult = await contract.connect(signers.alice).getResult();
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(decrypted).to.eq(60); // (10 + 20) * 2
    });
  });

  describe("✅ Permission Granting", function () {
    beforeEach(async function () {
      // Set value A with alice
      const encryptedA = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(10)
        .encrypt();
      await contract
        .connect(signers.alice)
        .setValueA(encryptedA.handles[0], encryptedA.inputProof);
    });

    it("should allow alice to grant permission to bob for value A", async function () {
      await contract.connect(signers.alice).grantPermissionForA(signers.bob.address);

      expect(await contract.hasPermission(signers.bob.address)).to.be.true;

      // Bob should now be able to access value A
      const encryptedValue = await contract.connect(signers.bob).getValueA();
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedValue,
        contractAddress,
        signers.bob,
      );

      expect(decrypted).to.eq(10);
    });
  });

  describe("❌ Permission Denied", function () {
    it("should deny access without permission", async function () {
      await expect(
        contract.connect(signers.bob).getValueA()
      ).to.be.revertedWith("Permission denied");
    });

    it("should deny granting permission without having permission", async function () {
      await expect(
        contract.connect(signers.bob).grantPermissionForA(signers.alice.address)
      ).to.be.revertedWith("You don't have permission");
    });
  });
});


```

{% endtab %}

{% endtabs %}
