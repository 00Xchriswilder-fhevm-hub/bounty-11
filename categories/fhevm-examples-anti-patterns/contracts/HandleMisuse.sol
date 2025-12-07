// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Handle Misuse - Anti-Pattern Example
/// @notice Demonstrates incorrect handle usage patterns
/// @dev This example shows:
///      - How handles should be used
///      - Common mistakes with handles
///      - Why handles can't be reused across contracts
///      - Correct handle lifecycle management
/// 
/// @dev Key Concepts:
///      - Handles are bound to specific contracts
///      - Handles from one contract can't be used in another
///      - Each encryption creates a unique handle
///      - Handles must be used with their corresponding proofs
contract HandleMisuse is ZamaEthereumConfig {
    /// @notice Encrypted value
    euint32 private _encryptedValue;
    
    /// @notice Set value correctly
    /// @param _encryptedInput The encrypted input
    /// @param _inputProof The proof for the encrypted input
    /// @dev ✅ DO: Use handle with its corresponding proof
    function setValueCorrect(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        // ✅ DO: Use handle with its proof
        // The handle and proof are bound together
        _encryptedValue = FHE.fromExternal(_encryptedInput, _inputProof);
        
        FHE.allowThis(_encryptedValue);
        FHE.allow(_encryptedValue, msg.sender);
    }
    
    /// @notice ❌ DON'T: Try to use handle from different contract
    /// @param _handleFromOtherContract Handle from a different contract
    /// @dev This won't work - handles are contract-specific
    ///      This is commented out because it won't compile/work correctly
    /*
    function useHandleFromOtherContract(bytes32 _handleFromOtherContract) external {
        // ❌ DON'T: Handles are bound to specific contracts
        // A handle from Contract A cannot be used in Contract B
        // This will fail because the handle doesn't belong to this contract
        _encryptedValue = FHE.fromBytes32(_handleFromOtherContract); // ERROR
    }
    */
    
    /// @notice ❌ DON'T: Try to reuse handle without proof
    /// @dev Handles must always be used with their proofs
    ///      This is commented out because it won't work
    /*
    function reuseHandleWithoutProof(bytes32 _handle) external {
        // ❌ DON'T: Can't convert handle back to euint32 without proof
        // Handles are one-way - you can convert euint32 -> bytes32, but not back
        // You need the original encrypted input and proof
        _encryptedValue = FHE.fromBytes32(_handle); // ERROR: Doesn't exist
    }
    */
    
    /// @notice ✅ DO: Store handle for later reference (but can't use it directly)
    /// @dev You can store handles, but they're just references
    ///      They can't be used to recreate the encrypted value
    mapping(address => bytes32) public storedHandles;
    
    function storeHandle() external {
        // ✅ DO: Store handle as bytes32 for reference
        // But remember: you can't use this to recreate the encrypted value
        storedHandles[msg.sender] = FHE.toBytes32(_encryptedValue);
    }
    
    /// @notice Get the encrypted value
    /// @return The encrypted value
    function getEncryptedValue() external view returns (euint32) {
        return _encryptedValue;
    }
    
    /// @notice Get handle
    /// @return The handle as bytes32
    function getHandle() external view returns (bytes32) {
        return FHE.toBytes32(_encryptedValue);
    }
    
    /// @notice ✅ DO: Use handle correctly in operations
    /// @param _encryptedInput The encrypted input to add
    /// @param _inputProof The proof for the encrypted input
    /// @dev Handles are used internally in operations
    ///      You don't need to manually manage them for operations
    function addToValue(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        euint32 encryptedInput = FHE.fromExternal(_encryptedInput, _inputProof);
        
        // ✅ DO: Operations work on euint32 (handles are managed internally)
        _encryptedValue = FHE.add(_encryptedValue, encryptedInput);
        
        FHE.allowThis(_encryptedValue);
        FHE.allow(_encryptedValue, msg.sender);
    }
}

