// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title View With Encrypted - Anti-Pattern Example
/// @notice Demonstrates why view functions cannot return encrypted values
/// @dev This example shows:
///      - Why view functions can't return encrypted values
///      - What happens when you try
///      - The correct alternative patterns
/// 
/// @dev Key Concept:
///      - View functions in Solidity cannot return encrypted types (euint32, etc.)
///      - Encrypted values must be decrypted before returning
///      - Use events or separate decryption flow instead
contract ViewWithEncrypted is ZamaEthereumConfig {
    /// @notice Encrypted value
    euint32 private _encryptedValue;
    
    /// @notice Event to emit encrypted value (correct pattern)
    event EncryptedValueEvent(bytes32 indexed handle);
    
    /// @notice Set encrypted value
    /// @param _encryptedInput The encrypted input
    /// @param _inputProof The proof for the encrypted input
    function setValue(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        _encryptedValue = FHE.fromExternal(_encryptedInput, _inputProof);
        
        FHE.allowThis(_encryptedValue);
        FHE.allow(_encryptedValue, msg.sender);
        
        // ✅ DO: Emit event with handle if you need to expose it
        emit EncryptedValueEvent(FHE.toBytes32(_encryptedValue));
    }
    
    /// @notice ❌ DON'T: This won't compile - view functions can't return encrypted types
    /// @return The encrypted value
    /// @dev This is commented out because it won't compile
    ///      Solidity view functions cannot return encrypted types (euint32, etc.)
    /*
    function getEncryptedValue() external view returns (euint32) {
        // ❌ ERROR: View functions cannot return encrypted types
        return _encryptedValue;
    }
    */
    
    /// @notice ✅ DO: Return handle as bytes32 (this works)
    /// @return The handle as bytes32
    /// @dev Handles can be returned, but they're not the encrypted value itself
    ///      They're just references that can be used for decryption off-chain
    function getHandle() external view returns (bytes32) {
        // ✅ DO: Return handle, not encrypted value
        return FHE.toBytes32(_encryptedValue);
    }
    
    /// @notice ✅ DO: Use events to expose encrypted values
    /// @dev Emit event with handle, then decrypt off-chain
    function exposeValueViaEvent() external {
        emit EncryptedValueEvent(FHE.toBytes32(_encryptedValue));
    }
    
    /// @notice ✅ DO: Store handle in mapping for later retrieval
    /// @dev Store handle, retrieve it, then decrypt off-chain
    mapping(address => bytes32) public userHandles;
    
    function storeHandleForUser(address user) external {
        userHandles[user] = FHE.toBytes32(_encryptedValue);
    }
}

