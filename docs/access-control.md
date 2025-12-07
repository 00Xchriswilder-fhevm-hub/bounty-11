# Access Control

<!-- chapter: access-control -->

## Overview

FHE.allowThis() grants permission to the contract (address(this)). This example demonstrates adding encrypted values, converting external encrypted inputs using Fully Homomorphic Encryption and shows how to manage FHE permissions for both contracts and users using external encrypted inputs with input proofs for verification.

## What You'll Learn

- **FHE.add operation** - How to perform this specific homomorphic operation on encrypted values
- **Off-chain encryption** - Encrypting values locally before sending to contract
- **FHE permissions** - Granting permissions for operations and decryption

## Key Concepts

### 1. FHE.allowThis()

grants permission to the contract (address(this))

### 2. FHE.allow(encryptedValue,

user) grants permission to a specific user

### 3. Both

permissions are typically needed for operations

### 4. Permissions

are checked when decrypting or performing operations

## Step-by-Step Walkthrough

### Step 1: Set Encrypted Values

Encrypt your values off-chain and send them to the contract using `initialize()`.

### Step 2: Perform FHE.add Operation

Call the function that performs `FHE.add` (e.g., `updateValue()`).

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

{% tab title="AccessControl.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Access Control Example
/// @notice Demonstrates FHE access control using FHE.allow() and FHE.allowThis()
/// @dev This example shows:
///      - How to grant permissions to the contract itself (FHE.allowThis)
///      - How to grant permissions to specific users (FHE.allow)
///      - Why both permissions are needed
///      - How access control works in FHEVM
/// 
/// @dev Key Concepts:
///      - FHE.allowThis() grants permission to the contract (address(this))
///      - FHE.allow(encryptedValue, user) grants permission to a specific user
///      - Both permissions are typically needed for operations
///      - Permissions are checked when decrypting or performing operations
contract AccessControl is ZamaEthereumConfig {
    /// @notice Encrypted value stored in the contract
    euint32 private _encryptedValue;
    
    /// @notice Mapping to track which users have been granted access
    mapping(address => bool) public hasAccess;
    
    /// @notice Event emitted when access is granted
    event AccessGranted(address indexed user);
    
    /// @notice Event emitted when value is updated
    event ValueUpdated(address indexed updater);
    
    /// @notice Initialize the contract with an encrypted value
    /// @param _encryptedInput The encrypted input value
    /// @param _inputProof The proof for the encrypted input
    /// @dev This demonstrates the correct pattern:
    ///      ✅ DO: Grant both permissions
    ///      FHE.allowThis(_encryptedValue);        // Contract permission
    ///      FHE.allow(_encryptedValue, msg.sender); // User permission
    function initialize(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        _encryptedValue = FHE.fromExternal(_encryptedInput, _inputProof);
        
        // ✅ DO: Grant both permissions
        // Contract needs permission to perform operations
        FHE.allowThis(_encryptedValue);
        // User needs permission to decrypt the value
        FHE.allow(_encryptedValue, msg.sender);
        
        hasAccess[msg.sender] = true;
        emit AccessGranted(msg.sender);
    }
    
    /// @notice Update the encrypted value (only if user has access)
    /// @param _encryptedInput The new encrypted value
    /// @param _inputProof The proof for the encrypted input
    /// @dev This function requires the caller to have been granted access
    function updateValue(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        require(hasAccess[msg.sender], "Access denied");
        
        _encryptedValue = FHE.fromExternal(_encryptedInput, _inputProof);
        
        // ✅ DO: Grant both permissions for the new value
        FHE.allowThis(_encryptedValue);
        FHE.allow(_encryptedValue, msg.sender);
        
        emit ValueUpdated(msg.sender);
    }
    
    /// @notice Grant access to another user
    /// @param _user The address to grant access to
    /// @dev This demonstrates granting permission to a new user
    ///      The user must have access to grant access to others
    function grantAccess(address _user) external {
        require(hasAccess[msg.sender], "Access denied");
        require(_user != address(0), "Invalid user address");
        require(!hasAccess[_user], "User already has access");
        
        // Grant FHE permission to the new user
        // Note: allowThis is already set, we just need to allow the new user
        FHE.allow(_encryptedValue, _user);
        hasAccess[_user] = true;
        
        emit AccessGranted(_user);
    }
    
    /// @notice Get the encrypted value (only if user has access)
    /// @return The encrypted value
    /// @dev This will fail if the caller doesn't have FHE permission
    ///      Access control is enforced by the FHEVM framework
    function getEncryptedValue() external view returns (euint32) {
        require(hasAccess[msg.sender], "Access denied");
        // FHE.allow() check is enforced by Zama framework
        // If user doesn't have permission, this will revert
        return _encryptedValue;
    }
    
    /// @notice Perform an operation on the encrypted value (only if user has access)
    /// @param _encryptedInput The encrypted input to add
    /// @param _inputProof The proof for the encrypted input
    /// @dev This demonstrates that the contract can perform operations
    ///      because it has allowThis permission
    function addToValue(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        require(hasAccess[msg.sender], "Access denied");
        
        euint32 encryptedInput = FHE.fromExternal(_encryptedInput, _inputProof);
        
        // The contract can perform this operation because it has allowThis permission
        _encryptedValue = FHE.add(_encryptedValue, encryptedInput);
        
        // ✅ DO: Grant permissions for the result
        FHE.allowThis(_encryptedValue);
        FHE.allow(_encryptedValue, msg.sender);
        
        emit ValueUpdated(msg.sender);
    }
}


```

{% endtab %}

{% tab title="AccessControl.ts" %}

```typescript
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { AccessControl, AccessControl__factory } from "../../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

/**
 * @chapter access-control
 * @title Access Control Test Suite
 * @notice Tests for AccessControl contract demonstrating FHE permission patterns
 * @dev This test suite shows:
 *      - ✅ How to properly grant permissions (allowThis + allow)
 *      - ✅ How access control works in FHEVM
 *      - ✅ How to grant access to multiple users
 *      - ❌ What happens when permissions are missing
 */

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  charlie: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("AccessControl")) as unknown as AccessControl__factory;
  const contract = (await factory.deploy()) as AccessControl;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("AccessControl", function () {
  let signers: Signers;
  let contract: AccessControl;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      alice: ethSigners[1],
      bob: ethSigners[2],
      charlie: ethSigners[3],
    };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());
  });

  describe("✅ Initialization", function () {
    it("should initialize with encrypted value", async function () {
      const clearValue = 42;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      await contract
        .connect(signers.alice)
        .initialize(encrypted.handles[0], encrypted.inputProof);

      // Check that alice has access
      expect(await contract.hasAccess(signers.alice.address)).to.be.true;

      // Get encrypted value and decrypt
      const encryptedValue = await contract.connect(signers.alice).getEncryptedValue();
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedValue,
        contractAddress,
        signers.alice,
      );

      expect(decrypted).to.eq(clearValue);
    });
  });

  describe("✅ Access Control", function () {
    beforeEach(async function () {
      // Initialize with alice
      const clearValue = 100;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      await contract
        .connect(signers.alice)
        .initialize(encrypted.handles[0], encrypted.inputProof);
    });

    it("should allow alice to get encrypted value", async function () {
      const encryptedValue = await contract.connect(signers.alice).getEncryptedValue();
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedValue,
        contractAddress,
        signers.alice,
      );

      expect(decrypted).to.eq(100);
    });

    it("should allow alice to grant access to bob", async function () {
      await contract.connect(signers.alice).grantAccess(signers.bob.address);

      expect(await contract.hasAccess(signers.bob.address)).to.be.true;

      // Bob should now be able to get the encrypted value
      const encryptedValue = await contract.connect(signers.bob).getEncryptedValue();
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedValue,
        contractAddress,
        signers.bob,
      );

      expect(decrypted).to.eq(100);
    });

    it("should allow alice to update the value", async function () {
      const newValue = 200;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(newValue)
        .encrypt();

      await contract
        .connect(signers.alice)
        .updateValue(encrypted.handles[0], encrypted.inputProof);

      const encryptedValue = await contract.connect(signers.alice).getEncryptedValue();
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedValue,
        contractAddress,
        signers.alice,
      );

      expect(decrypted).to.eq(newValue);
    });

    it("should allow alice to add to the value", async function () {
      const addValue = 50;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(addValue)
        .encrypt();

      await contract
        .connect(signers.alice)
        .addToValue(encrypted.handles[0], encrypted.inputProof);

      const encryptedValue = await contract.connect(signers.alice).getEncryptedValue();
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedValue,
        contractAddress,
        signers.alice,
      );

      expect(decrypted).to.eq(150); // 100 + 50
    });
  });

  describe("❌ Access Denied Cases", function () {
    beforeEach(async function () {
      // Initialize with alice
      const clearValue = 100;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      await contract
        .connect(signers.alice)
        .initialize(encrypted.handles[0], encrypted.inputProof);
    });

    it("should deny bob access before being granted", async function () {
      expect(await contract.hasAccess(signers.bob.address)).to.be.false;

      await expect(
        contract.connect(signers.bob).getEncryptedValue()
      ).to.be.revertedWith("Access denied");
    });

    it("should deny bob from updating value without access", async function () {
      const newValue = 200;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .add32(newValue)
        .encrypt();

      await expect(
        contract
          .connect(signers.bob)
          .updateValue(encrypted.handles[0], encrypted.inputProof)
      ).to.be.revertedWith("Access denied");
    });

    it("should deny bob from granting access without having access", async function () {
      await expect(
        contract.connect(signers.bob).grantAccess(signers.charlie.address)
      ).to.be.revertedWith("Access denied");
    });

    it("should deny zero address from being granted access", async function () {
      await expect(
        contract.connect(signers.alice).grantAccess(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid user address");
    });
  });

  describe("✅ Multiple Users", function () {
    beforeEach(async function () {
      // Initialize with alice
      const clearValue = 100;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      await contract
        .connect(signers.alice)
        .initialize(encrypted.handles[0], encrypted.inputProof);
    });

    it("should allow multiple users to access after being granted", async function () {
      // Grant access to bob and charlie
      await contract.connect(signers.alice).grantAccess(signers.bob.address);
      await contract.connect(signers.alice).grantAccess(signers.charlie.address);

      // Both should be able to access
      const encryptedValueBob = await contract.connect(signers.bob).getEncryptedValue();
      const encryptedValueCharlie = await contract.connect(signers.charlie).getEncryptedValue();

      const decryptedBob = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedValueBob,
        contractAddress,
        signers.bob,
      );

      const decryptedCharlie = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedValueCharlie,
        contractAddress,
        signers.charlie,
      );

      expect(decryptedBob).to.eq(100);
      expect(decryptedCharlie).to.eq(100);
    });
  });
});


```

{% endtab %}

{% endtabs %}
