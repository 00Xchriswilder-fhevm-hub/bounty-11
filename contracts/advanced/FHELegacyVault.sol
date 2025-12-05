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

