# FHE Legacy Vault

## Overview

Secure vault system with time-locked access using FHEVM and IPFS. Demonstrates access control patterns.

## What You'll Learn

- **Off-chain encryption** - Encrypting values locally before sending to contract
- **FHE permissions** - Granting permissions for operations and decryption

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

### ❌ Pitfall 1: should fail to create vault with empty ID

**The Problem:** const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.owner.address)
        .add256(1234567890)
        .encryp...

**Why it fails:** The operation fails due to incorrect usage, permissions, or signer mismatch.

**The Fix:** Ensure proper setup, matching signers, and correct permissions.

### ❌ Pitfall 2: should fail to create duplicate vault

**The Problem:** const vaultId = "vault-1";
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.owner.address)
        .a...

**Why it fails:** The operation fails due to incorrect usage, permissions, or signer mismatch.

**The Fix:** Ensure proper setup, matching signers, and correct permissions.

### ❌ Pitfall 3: should fail to grant access after release time

**The Problem:** Fast forward past release time

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

{% tab title="FHELegacyVault.sol" %}

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint256, externalEuint256} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Legacy Vault
/// @notice Secure vault system with time-locked access using FHEVM and IPFS
/// @dev Files are encrypted client-side, stored on IPFS, and decryption keys are encrypted with FHEVM
/// @dev Updated to use euint256 to store full 32-byte AES-256 keys
/// @dev This example demonstrates:
///      - Access control with FHE.allow() and FHE.allowThis()
///      - Time-based access control
///      - Multiple user permissions
///      - Proper FHE permission management
contract FHELegacyVault is ZamaEthereumConfig {
    /// @notice Struct to store vault information
    struct Vault {
        string cid;                    // IPFS CID of encrypted data
        euint256 encryptedKey;         // FHE-encrypted AES decryption key (256-bit for full 32-byte key)
        uint256 releaseTimestamp;      // When heirs can access
        address owner;                 // Vault creator
        uint256 createdAt;             // Creation timestamp
        bool exists;                   // Vault existence flag
    }
    
    /// @notice Mapping from vault ID (string) to Vault struct
    mapping(string => Vault) private vaults;
    
    /// @notice Mapping to track authorized heirs: vaultId => address => authorized
    mapping(string => mapping(address => bool)) public authorizedHeirs;
    
    /// @notice Mapping to track user's vaults: user => array of vault IDs
    mapping(address => string[]) private userVaults;
    
    /// @notice Mapping to track heir's vaults: heir => array of vault IDs
    mapping(address => string[]) private heirVaults;
    
    /// @notice Event emitted when a new vault is created
    event VaultCreated(
        string indexed vaultId,
        address indexed owner,
        string cid,
        uint256 releaseTimestamp
    );
    
    /// @notice Event emitted when access is granted to a heir
    event AccessGranted(
        string indexed vaultId,
        address indexed heir
    );
    
    /// @notice Event emitted when access is revoked from a heir
    event AccessRevoked(
        string indexed vaultId,
        address indexed heir
    );
    
    /// @notice Event emitted when release time is extended
    event ReleaseTimeExtended(
        string indexed vaultId,
        uint256 newTimestamp
    );
    
    /// @notice Create a new vault with encrypted data on IPFS
    /// @param _vaultId The unique vault ID (alphanumeric string, e.g., "x5gsyts")
    /// @param _cid The IPFS CID of the encrypted file
    /// @param _encryptedKey The FHE-encrypted AES decryption key (256-bit for full 32-byte key)
    /// @param _inputProof The proof for the encrypted key
    /// @param _releaseTimestamp When heirs can access the vault
    function createVault(
        string calldata _vaultId,
        string calldata _cid,
        externalEuint256 _encryptedKey,
        bytes calldata _inputProof,
        uint256 _releaseTimestamp
    ) external {
        require(bytes(_vaultId).length > 0, "Vault ID cannot be empty");
        require(bytes(_vaultId).length <= 32, "Vault ID too long");
        require(bytes(_cid).length > 0, "CID cannot be empty");
        require(_releaseTimestamp > block.timestamp, "Release time must be in future");
        require(!vaults[_vaultId].exists, "Vault ID already exists");
        
        // Convert external encrypted key to internal format (256-bit)
        euint256 encryptedKey = FHE.fromExternal(_encryptedKey, _inputProof);
        
        vaults[_vaultId] = Vault({
            cid: _cid,
            encryptedKey: encryptedKey,
            releaseTimestamp: _releaseTimestamp,
            owner: msg.sender,
            createdAt: block.timestamp,
            exists: true
        });
        
        userVaults[msg.sender].push(_vaultId);
        
        // Set up ACL: contract and owner can access
        // ✅ DO: Grant both permissions
        FHE.allowThis(encryptedKey);        // Contract permission
        FHE.allow(encryptedKey, msg.sender); // User permission
        
        emit VaultCreated(_vaultId, msg.sender, _cid, _releaseTimestamp);
    }
    
    /// @notice Grant access to a heir (only before release time)
    /// @param _vaultId The vault ID
    /// @param _heir The address to grant access to
    function grantAccess(string calldata _vaultId, address _heir) external {
        Vault storage vault = vaults[_vaultId];
        require(vault.exists, "Vault does not exist");
        require(vault.owner == msg.sender, "Only owner can grant access");
        require(block.timestamp < vault.releaseTimestamp, "Cannot grant access after release");
        require(_heir != address(0), "Invalid heir address");
        require(_heir != msg.sender, "Cannot grant access to yourself");
        
        // Grant FHE ACL permission
        FHE.allow(vault.encryptedKey, _heir);
        authorizedHeirs[_vaultId][_heir] = true;
        
        // Track vault for heir
        heirVaults[_heir].push(_vaultId);
        
        emit AccessGranted(_vaultId, _heir);
    }
    
    /// @notice Grant access to multiple heirs at once (only before release time)
    /// @param _vaultId The vault ID
    /// @param _heirs Array of addresses to grant access to
    function grantAccessToMultiple(string calldata _vaultId, address[] calldata _heirs) external {
        Vault storage vault = vaults[_vaultId];
        require(vault.exists, "Vault does not exist");
        require(vault.owner == msg.sender, "Only owner can grant access");
        require(block.timestamp < vault.releaseTimestamp, "Cannot grant access after release");
        
        for (uint256 i = 0; i < _heirs.length; i++) {
            address _heir = _heirs[i];
            require(_heir != address(0), "Invalid heir address");
            require(_heir != msg.sender, "Cannot grant access to yourself");
            
            // Grant FHE ACL permission
            FHE.allow(vault.encryptedKey, _heir);
            authorizedHeirs[_vaultId][_heir] = true;
            
            // Track vault for heir
            heirVaults[_heir].push(_vaultId);
            
            emit AccessGranted(_vaultId, _heir);
        }
    }
    
    /// @notice Revoke access from a heir
    /// @param _vaultId The vault ID
    /// @param _heir The address to revoke access from
    /// @dev Note: FHE ACL doesn't support direct revocation, so we track in mapping
    function revokeAccess(string calldata _vaultId, address _heir) external {
        Vault storage vault = vaults[_vaultId];
        require(vault.exists, "Vault does not exist");
        require(vault.owner == msg.sender, "Only owner can revoke access");
        require(block.timestamp < vault.releaseTimestamp, "Cannot revoke after release");
        
        authorizedHeirs[_vaultId][_heir] = false;
        emit AccessRevoked(_vaultId, _heir);
    }
    
    /// @notice Get encrypted key (only after release time and if authorized)
    /// @param _vaultId The vault ID
    /// @return The encrypted key (256-bit, will fail if caller doesn't have ACL permission)
    /// @dev Access control is enforced by Zama ACL system during decryption
    function getEncryptedKey(string calldata _vaultId) external view returns (euint256) {
        Vault storage vault = vaults[_vaultId];
        require(vault.exists, "Vault does not exist");
        require(
            block.timestamp >= vault.releaseTimestamp,
            "Release time not reached"
        );
        require(
            vault.owner == msg.sender || authorizedHeirs[_vaultId][msg.sender],
            "Not authorized"
        );
        // FHE.allow() check is enforced by Zama framework
        return vault.encryptedKey;
    }
    
    /// @notice Owner can always access (before or after release)
    /// @param _vaultId The vault ID
    /// @return The encrypted key (256-bit)
    function getEncryptedKeyAsOwner(string calldata _vaultId) external view returns (euint256) {
        Vault storage vault = vaults[_vaultId];
        require(vault.exists, "Vault does not exist");
        require(vault.owner == msg.sender, "Only owner can access");
        return vault.encryptedKey;
    }
    
    /// @notice Update the release time (owner has full control)
    /// @param _vaultId The vault ID
    /// @param _newTimestamp The new release timestamp
    /// @dev Owner can set release time to any value they want (extend, shorten, or even set to past to release immediately)
    function extendReleaseTime(string calldata _vaultId, uint256 _newTimestamp) external {
        Vault storage vault = vaults[_vaultId];
        require(vault.exists, "Vault does not exist");
        require(vault.owner == msg.sender, "Only owner can update release time");
        // Owner has full liberty - no restrictions on timestamp value
        // They can extend, shorten, or even set to past to release immediately
        
        vault.releaseTimestamp = _newTimestamp;
        emit ReleaseTimeExtended(_vaultId, _newTimestamp);
    }
    
    /// @notice Get vault metadata (public information)
    /// @param _vaultId The vault ID
    /// @return owner The vault owner
    /// @return cid The IPFS CID
    /// @return releaseTimestamp The release timestamp
    /// @return createdAt The creation timestamp
    function getVaultMetadata(string calldata _vaultId) external view returns (
        address owner,
        string memory cid,
        uint256 releaseTimestamp,
        uint256 createdAt
    ) {
        Vault storage vault = vaults[_vaultId];
        require(vault.exists, "Vault does not exist");
        return (
            vault.owner,
            vault.cid,
            vault.releaseTimestamp,
            vault.createdAt
        );
    }
    
    /// @notice Get all vault IDs created by a user
    /// @param _user The user address
    /// @return Array of vault IDs
    function getUserVaults(address _user) external view returns (string[] memory) {
        return userVaults[_user];
    }
    
    /// @notice Get all vault IDs where a user is an authorized heir
    /// @param _heir The heir address
    /// @return Array of vault IDs
    function getHeirVaults(address _heir) external view returns (string[] memory) {
        return heirVaults[_heir];
    }
    
    /// @notice Check if an address is authorized for a vault
    /// @param _vaultId The vault ID
    /// @param _address The address to check
    /// @return True if authorized, false otherwise
    function isAuthorized(string calldata _vaultId, address _address) external view returns (bool) {
        Vault storage vault = vaults[_vaultId];
        if (!vault.exists) return false;
        if (vault.owner == _address) return true;
        if (block.timestamp < vault.releaseTimestamp) return false;
        return authorizedHeirs[_vaultId][_address];
    }
    
    /// @notice Check if a vault exists
    /// @param _vaultId The vault ID to check
    /// @return True if vault exists, false otherwise
    function vaultExists(string calldata _vaultId) external view returns (bool) {
        return vaults[_vaultId].exists;
    }
}


```

{% endtab %}

{% tab title="FHELegacyVault.ts" %}

```typescript
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { FHELegacyVault, FHELegacyVault__factory } from "../../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

/**
 * @title FHE Legacy Vault Test Suite
 * @notice Tests for FHELegacyVault contract demonstrating time-locked access with FHEVM
 * @dev This test suite shows:
 *      - ✅ Vault creation with encrypted keys
 *      - ✅ Access control with FHE permissions
 *      - ✅ Time-locked access for heirs
 *      - ✅ Granting and revoking access
 */

type Signers = {
  deployer: HardhatEthersSigner;
  owner: HardhatEthersSigner;
  heir1: HardhatEthersSigner;
  heir2: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHELegacyVault")) as FHELegacyVault__factory;
  const contract = (await factory.deploy()) as FHELegacyVault;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("FHELegacyVault", function () {
  let signers: Signers;
  let contract: FHELegacyVault;
  let contractAddress: string;
  let releaseTimestamp: bigint;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      owner: ethSigners[1],
      heir1: ethSigners[2],
      heir2: ethSigners[3],
    };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());
    
    // Set release time to 1 hour from now
    const blockNumber = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNumber);
    releaseTimestamp = BigInt(block!.timestamp) + BigInt(3600); // 1 hour
  });

  describe("✅ Vault Creation", function () {
    it("should create a vault with encrypted key", async function () {
      const vaultId = "vault-1";
      const cid = "QmTest123";
      const clearKey = 1234567890; // Simulated AES key
      
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.owner.address)
        .add256(clearKey)
        .encrypt();

      await expect(
        contract
          .connect(signers.owner)
          .createVault(
            vaultId,
            cid,
            encrypted.handles[0],
            encrypted.inputProof,
            releaseTimestamp
          )
      ).to.emit(contract, "VaultCreated");

      expect(await contract.vaultExists(vaultId)).to.be.true;
    });

    it("should fail to create vault with empty ID", async function () {
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.owner.address)
        .add256(1234567890)
        .encrypt();

      await expect(
        contract
          .connect(signers.owner)
          .createVault("", "cid", encrypted.handles[0], encrypted.inputProof, releaseTimestamp)
      ).to.be.revertedWith("Vault ID cannot be empty");
    });

    it("should fail to create duplicate vault", async function () {
      const vaultId = "vault-1";
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.owner.address)
        .add256(1234567890)
        .encrypt();

      await contract
        .connect(signers.owner)
        .createVault(vaultId, "cid1", encrypted.handles[0], encrypted.inputProof, releaseTimestamp);

      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, signers.owner.address)
        .add256(9876543210)
        .encrypt();

      await expect(
        contract
          .connect(signers.owner)
          .createVault(vaultId, "cid2", encrypted2.handles[0], encrypted2.inputProof, releaseTimestamp)
      ).to.be.revertedWith("Vault ID already exists");
    });
  });

  describe("✅ Access Control", function () {
    let vaultId: string;

    beforeEach(async function () {
      vaultId = "vault-access";
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.owner.address)
        .add256(1234567890)
        .encrypt();

      await contract
        .connect(signers.owner)
        .createVault(vaultId, "QmTest", encrypted.handles[0], encrypted.inputProof, releaseTimestamp);
    });

    it("should grant access to heir", async function () {
      await expect(
        contract.connect(signers.owner).grantAccess(vaultId, signers.heir1.address)
      ).to.emit(contract, "AccessGranted");

      expect(await contract.authorizedHeirs(vaultId, signers.heir1.address)).to.be.true;
    });

    it("should grant access to multiple heirs", async function () {
      await contract
        .connect(signers.owner)
        .grantAccessToMultiple(vaultId, [signers.heir1.address, signers.heir2.address]);

      expect(await contract.authorizedHeirs(vaultId, signers.heir1.address)).to.be.true;
      expect(await contract.authorizedHeirs(vaultId, signers.heir2.address)).to.be.true;
    });

    it("should revoke access from heir", async function () {
      await contract.connect(signers.owner).grantAccess(vaultId, signers.heir1.address);
      
      await expect(
        contract.connect(signers.owner).revokeAccess(vaultId, signers.heir1.address)
      ).to.emit(contract, "AccessRevoked");

      expect(await contract.authorizedHeirs(vaultId, signers.heir1.address)).to.be.false;
    });

    it("should fail to grant access after release time", async function () {
      // Fast forward past release time
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        contract.connect(signers.owner).grantAccess(vaultId, signers.heir1.address)
      ).to.be.revertedWith("Cannot grant access after release");
    });
  });

  describe("✅ Vault Metadata", function () {
    it("should return vault metadata", async function () {
      const vaultId = "vault-meta";
      const cid = "QmMetadata";
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.owner.address)
        .add256(1234567890)
        .encrypt();

      await contract
        .connect(signers.owner)
        .createVault(vaultId, cid, encrypted.handles[0], encrypted.inputProof, releaseTimestamp);

      const metadata = await contract.getVaultMetadata(vaultId);
      expect(metadata.owner).to.eq(signers.owner.address);
      expect(metadata.cid).to.eq(cid);
      expect(metadata.releaseTimestamp).to.eq(releaseTimestamp);
    });

    it("should return user vaults", async function () {
      const vaultId1 = "vault-1";
      const vaultId2 = "vault-2";
      
      const encrypted1 = await fhevm
        .createEncryptedInput(contractAddress, signers.owner.address)
        .add256(1111)
        .encrypt();
      await contract
        .connect(signers.owner)
        .createVault(vaultId1, "cid1", encrypted1.handles[0], encrypted1.inputProof, releaseTimestamp);

      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, signers.owner.address)
        .add256(2222)
        .encrypt();
      await contract
        .connect(signers.owner)
        .createVault(vaultId2, "cid2", encrypted2.handles[0], encrypted2.inputProof, releaseTimestamp);

      const vaults = await contract.getUserVaults(signers.owner.address);
      expect(vaults.length).to.eq(2);
      expect(vaults).to.include(vaultId1);
      expect(vaults).to.include(vaultId2);
    });
  });

  // ❌ Common Pitfalls
  describe("❌ Error Cases", function () {
    it("should fail to create vault with empty ID", async function () {
      const emptyId = "";
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.owner.address)
        .add256(1111)
        .encrypt();
      
      await expect(
        contract
          .connect(signers.owner)
          .createVault(emptyId, "cid1", encrypted.handles[0], encrypted.inputProof, releaseTimestamp)
      ).to.be.reverted;
    });

    it("should fail to create duplicate vault", async function () {
      const vaultId = "vault1";
      const encrypted1 = await fhevm
        .createEncryptedInput(contractAddress, signers.owner.address)
        .add256(1111)
        .encrypt();
      
      // Create first vault
      await contract
        .connect(signers.owner)
        .createVault(vaultId, "cid1", encrypted1.handles[0], encrypted1.inputProof, releaseTimestamp);

      // Try to create duplicate (should fail)
      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, signers.owner.address)
        .add256(2222)
        .encrypt();
      
      await expect(
        contract
          .connect(signers.owner)
          .createVault(vaultId, "cid2", encrypted2.handles[0], encrypted2.inputProof, releaseTimestamp)
      ).to.be.reverted;
    });

    it("should fail to grant access after release time", async function () {
      const vaultId = "vault1";
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.owner.address)
        .add256(1111)
        .encrypt();
      
      await contract
        .connect(signers.owner)
        .createVault(vaultId, "cid1", encrypted.handles[0], encrypted.inputProof, releaseTimestamp);

      // Fast forward past release time
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(releaseTimestamp) + 100]);
      await ethers.provider.send("evm_mine", []);

      // Should fail to grant access after release time
      await expect(
        contract.connect(signers.owner).grantAccess(vaultId, await signers.heir1.getAddress())
      ).to.be.reverted;
    });

    it("should fail when non-owner tries to grant access", async function () {
      const vaultId = "vault1";
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.owner.address)
        .add256(1111)
        .encrypt();
      
      await contract
        .connect(signers.owner)
        .createVault(vaultId, "cid1", encrypted.handles[0], encrypted.inputProof, releaseTimestamp);

      // Non-owner tries to grant access (should fail)
      await expect(
        contract.connect(signers.heir1).grantAccess(vaultId, await signers.heir2.getAddress())
      ).to.be.reverted;
    });
  });
});


```

{% endtab %}

{% endtabs %}
