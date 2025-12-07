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

