// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Handle Lifecycle
/// @notice Explains how handles are generated and their lifecycle
/// @dev This example demonstrates:
///      - How handles are generated
///      - Handle lifecycle (creation, use, decryption)
///      - Symbolic execution
///      - How handles represent encrypted values
/// 
/// @dev Key Concepts:
///      - Handles are symbolic representations of encrypted values
///      - Generated during encryption (client-side)
///      - Used in contract operations
///      - Converted to bytes32 for storage/events
///      - Used for decryption
contract HandleLifecycle is ZamaEthereumConfig {
    /// @notice Encrypted value
    euint32 private _encryptedValue;
    
    /// @notice Handle stored as bytes32 (for demonstration)
    bytes32 public storedHandle;
    
    /// @notice Event emitted with handle
    event ValueStored(bytes32 indexed handle);
    
    /// @notice Set value and demonstrate handle lifecycle
    /// @param _encryptedInput The encrypted input (contains handle)
    /// @param _inputProof The proof for the encrypted input
    /// @dev This demonstrates the handle lifecycle:
    ///      1. Handle is generated client-side during encryption
    ///      2. Handle is passed to contract via externalEuint32
    ///      3. Contract converts to euint32 (internal handle)
    ///      4. Handle can be converted to bytes32 for storage/events
    ///      5. Handle is used for operations and decryption
    function setValue(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        // Step 1: Convert external encrypted input to internal format
        // This creates an internal handle from the external handle
        _encryptedValue = FHE.fromExternal(_encryptedInput, _inputProof);
        
        // Step 2: Convert handle to bytes32 for storage/events
        // Handles are internally managed, but can be converted to bytes32
        storedHandle = FHE.toBytes32(_encryptedValue);
        
        // Grant permissions
        FHE.allowThis(_encryptedValue);
        FHE.allow(_encryptedValue, msg.sender);
        
        emit ValueStored(storedHandle);
    }
    
    /// @notice Get the encrypted value (returns handle)
    /// @return The encrypted value (handle)
    /// @dev The handle can be used for decryption off-chain
    function getEncryptedValue() external view returns (euint32) {
        return _encryptedValue;
    }
    
    /// @notice Get the handle as bytes32
    /// @return The handle as bytes32
    /// @dev Useful for events, storage, or passing to other contracts
    function getHandle() external view returns (bytes32) {
        return FHE.toBytes32(_encryptedValue);
    }
    
    /// @notice Perform operation and demonstrate handle transformation
    /// @param _encryptedInput The encrypted input to add
    /// @param _inputProof The proof for the encrypted input
    /// @dev This demonstrates that operations create new handles
    ///      The result has a new handle, different from the operands
    function addToValue(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        euint32 encryptedInput = FHE.fromExternal(_encryptedInput, _inputProof);
        
        // Operation creates a new handle for the result
        // The result handle is different from _encryptedValue and encryptedInput
        _encryptedValue = FHE.add(_encryptedValue, encryptedInput);
        
        // Update stored handle
        storedHandle = FHE.toBytes32(_encryptedValue);
        
        // Grant permissions for new handle
        FHE.allowThis(_encryptedValue);
        FHE.allow(_encryptedValue, msg.sender);
        
        emit ValueStored(storedHandle);
    }
    
    /// @notice Demonstrate handle in operations
    /// @dev This shows that handles are used in symbolic execution
    ///      The FHEVM framework performs operations on handles symbolically
    function demonstrateHandleOperations() external returns (bytes32) {
        // Handles are used in operations
        // The framework performs symbolic execution
        // Operations don't decrypt values, they operate on encrypted handles
        
        // Example: Create a constant encrypted value
        euint32 constantValue = FHE.asEuint32(10);
        
        // Operations work on handles, not decrypted values
        // This is symbolic execution
        euint32 result = FHE.add(_encryptedValue, constantValue);
        
        // Return handle as bytes32
        return FHE.toBytes32(result);
    }
}

