// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Allow Transient Example
/// @notice Demonstrates FHE.allowTransient() for temporary permissions
/// @dev This example shows:
///      - How to use FHE.allowTransient() for single-operation permissions
///      - When to use transient vs permanent permissions
///      - The difference between allow(), allowThis(), and allowTransient()
/// 
/// @dev Key Concepts:
///      - FHE.allowTransient() grants permission for a single operation only
///      - Permission is automatically revoked after the operation
///      - Useful when you don't want to grant permanent access
///      - More secure for one-time operations
contract AllowTransient is ZamaEthereumConfig {
    /// @notice Encrypted value stored in the contract
    euint32 private _encryptedValue;
    
    /// @notice Encrypted temporary value (for transient example)
    euint32 private _tempValue;
    
    /// @notice Event emitted when value is updated
    event ValueUpdated(address indexed updater);
    
    /// @notice Event emitted when transient operation is performed
    event TransientOperationPerformed(address indexed operator);
    
    /// @notice Initialize the contract with an encrypted value
    /// @param _encryptedInput The encrypted input value
    /// @param _inputProof The proof for the encrypted input
    function initialize(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        _encryptedValue = FHE.fromExternal(_encryptedInput, _inputProof);
        
        // Grant permanent permissions (standard pattern)
        FHE.allowThis(_encryptedValue);
        FHE.allow(_encryptedValue, msg.sender);
    }
    
    /// @notice Perform an operation using permanent permissions
    /// @param _encryptedInput The encrypted input to add
    /// @param _inputProof The proof for the encrypted input
    /// @dev This uses permanent permissions (allow + allowThis)
    function addWithPermanentPermission(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        euint32 encryptedInput = FHE.fromExternal(_encryptedInput, _inputProof);
        
        // Grant permanent permissions to the input
        FHE.allowThis(encryptedInput);
        FHE.allow(encryptedInput, msg.sender);
        
        // Perform operation
        _encryptedValue = FHE.add(_encryptedValue, encryptedInput);
        
        // Grant permissions for result
        FHE.allowThis(_encryptedValue);
        FHE.allow(_encryptedValue, msg.sender);
        
        emit ValueUpdated(msg.sender);
    }
    
    /// @notice Perform an operation using transient permission
    /// @param _encryptedInput The encrypted input to add
    /// @param _inputProof The proof for the encrypted input
    /// @dev This demonstrates FHE.allowTransient()
    ///      The permission is automatically revoked after the operation
    function addWithTransientPermission(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        euint32 encryptedInput = FHE.fromExternal(_encryptedInput, _inputProof);
        
        // ✅ DO: Use allowTransient for one-time operations
        // This grants permission only for this single operation
        // Permission is automatically revoked after the operation completes
        // allowTransient(value, address) - grants permission to address for this operation
        FHE.allowTransient(encryptedInput, address(this));
        
        // Perform operation
        // The transient permission allows this operation
        _encryptedValue = FHE.add(_encryptedValue, encryptedInput);
        
        // Grant permissions for result (permanent)
        FHE.allowThis(_encryptedValue);
        FHE.allow(_encryptedValue, msg.sender);
        
        // Note: encryptedInput's transient permission is now revoked
        // If we tried to use it again, it would fail
        
        emit TransientOperationPerformed(msg.sender);
    }
    
    /// @notice Example: Compare two values using transient permission
    /// @param _encryptedInput The encrypted input to compare
    /// @param _inputProof The proof for the encrypted input
    /// @return The comparison result (encrypted boolean)
    /// @dev This shows transient permission for a comparison operation
    ///      Note: Returns encrypted boolean - must be decrypted off-chain
    function compareWithTransient(externalEuint32 _encryptedInput, bytes calldata _inputProof) 
        external 
        returns (ebool) 
    {
        euint32 encryptedInput = FHE.fromExternal(_encryptedInput, _inputProof);
        
        // Use transient permission for comparison
        // We don't need permanent access to the input, just for this comparison
        FHE.allowTransient(encryptedInput, address(this));
        
        // Perform comparison (returns encrypted boolean)
        // This operation is allowed due to transient permission
        ebool result = FHE.eq(_encryptedValue, encryptedInput);
        
        // Grant permissions for result so it can be decrypted
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
        
        // Transient permission is automatically revoked after this function
        return result;
    }
    
    /// @notice Get the encrypted value
    /// @return The encrypted value
    function getEncryptedValue() external view returns (euint32) {
        return _encryptedValue;
    }
    
    /// @notice Example showing when NOT to use transient
    /// @param _encryptedInput The encrypted input
    /// @param _inputProof The proof for the encrypted input
    /// @dev This stores the value, so we need permanent permission
    function storeValue(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        _tempValue = FHE.fromExternal(_encryptedInput, _inputProof);
        
        // ❌ DON'T: Use transient if you need to store the value
        // Transient permission is revoked after the function, so stored value becomes unusable
        // ✅ DO: Use permanent permissions for stored values
        FHE.allowThis(_tempValue);
        FHE.allow(_tempValue, msg.sender);
    }
}

