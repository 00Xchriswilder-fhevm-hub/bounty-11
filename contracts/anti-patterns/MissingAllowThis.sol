// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Missing AllowThis - Anti-Pattern Example
/// @notice Demonstrates what happens when FHE.allowThis() is missing
/// @dev This example shows:
///      - Why FHE.allowThis() is required
///      - What happens when it's missing
///      - The correct pattern with both permissions
/// 
/// @dev Key Concept:
///      - FHE.allowThis() grants permission to the contract itself
///      - FHE.allow() grants permission to a specific user
///      - Both are typically needed for operations to work
contract MissingAllowThis is ZamaEthereumConfig {
    /// @notice Encrypted value with correct permissions
    euint32 private _encryptedValueCorrect;
    
    /// @notice Encrypted value with missing allowThis (will fail)
    euint32 private _encryptedValueWrong;
    
    /// @notice Set value with CORRECT pattern
    /// @param _encryptedInput The encrypted input
    /// @param _inputProof The proof for the encrypted input
    /// @dev ✅ DO: Grant both permissions
    function setValueCorrect(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        _encryptedValueCorrect = FHE.fromExternal(_encryptedInput, _inputProof);
        
        // ✅ DO: Grant both permissions
        FHE.allowThis(_encryptedValueCorrect);        // Contract permission
        FHE.allow(_encryptedValueCorrect, msg.sender); // User permission
        
        // This will work correctly
    }
    
    /// @notice Set value with WRONG pattern (missing allowThis)
    /// @param _encryptedInput The encrypted input
    /// @param _inputProof The proof for the encrypted input
    /// @dev ❌ DON'T: Forget allowThis
    ///      This will fail when trying to perform operations
    function setValueWrong(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        _encryptedValueWrong = FHE.fromExternal(_encryptedInput, _inputProof);
        
        // ❌ DON'T: Only grant user permission, forget allowThis
        // FHE.allowThis(_encryptedValueWrong); // MISSING!
        FHE.allow(_encryptedValueWrong, msg.sender); // Only user permission
        
        // This will fail when trying to use _encryptedValueWrong in operations
        // because the contract doesn't have permission
    }
    
    /// @notice Try to use value with correct permissions
    /// @param _encryptedInput The encrypted input to add
    /// @param _inputProof The proof for the encrypted input
    /// @dev This should work because allowThis was granted
    function useValueCorrect(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        euint32 encryptedInput = FHE.fromExternal(_encryptedInput, _inputProof);
        FHE.allowThis(encryptedInput);
        FHE.allow(encryptedInput, msg.sender);
        
        // ✅ This works because _encryptedValueCorrect has allowThis
        _encryptedValueCorrect = FHE.add(_encryptedValueCorrect, encryptedInput);
        
        FHE.allowThis(_encryptedValueCorrect);
        FHE.allow(_encryptedValueCorrect, msg.sender);
    }
    
    /// @notice Try to use value with missing allowThis
    /// @param _encryptedInput The encrypted input to add
    /// @param _inputProof The proof for the encrypted input
    /// @dev This will FAIL because allowThis was not granted to _encryptedValueWrong
    ///      The contract cannot perform operations on values it doesn't have permission for
    function useValueWrong(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        euint32 encryptedInput = FHE.fromExternal(_encryptedInput, _inputProof);
        FHE.allowThis(encryptedInput);
        FHE.allow(encryptedInput, msg.sender);
        
        // ❌ This will FAIL because _encryptedValueWrong doesn't have allowThis
        // The contract cannot add to a value it doesn't have permission for
        // This will revert with a permission error
        _encryptedValueWrong = FHE.add(_encryptedValueWrong, encryptedInput);
        
        FHE.allowThis(_encryptedValueWrong);
        FHE.allow(_encryptedValueWrong, msg.sender);
    }
    
    /// @notice Get handle for correct value
    /// @return The handle
    function getHandleCorrect() external view returns (bytes32) {
        return FHE.toBytes32(_encryptedValueCorrect);
    }
    
    /// @notice Get handle for wrong value
    /// @return The handle
    function getHandleWrong() external view returns (bytes32) {
        return FHE.toBytes32(_encryptedValueWrong);
    }
}

