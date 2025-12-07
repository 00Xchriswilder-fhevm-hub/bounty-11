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

