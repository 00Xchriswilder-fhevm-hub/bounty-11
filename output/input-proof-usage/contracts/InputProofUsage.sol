// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Input Proof Usage
/// @notice Demonstrates correct usage of input proofs
/// @dev This example shows:
///      - How to correctly use input proofs
///      - Matching encryption signer with transaction signer
///      - Why the signer must match
///      - Best practices for input proof usage
/// 
/// @dev Key Concepts:
///      - Input proofs bind encryption to [contract, user] pair
///      - The user who encrypts must be the same as msg.sender
///      - Proofs are generated automatically by FHEVM client
///      - Proofs are verified on-chain automatically
contract InputProofUsage is ZamaEthereumConfig {
    /// @notice Encrypted value
    euint32 private _encryptedValue;
    
    /// @notice Mapping to track who set the value
    mapping(address => bool) public hasSetValue;
    
    /// @notice Event emitted when value is set
    event ValueSet(address indexed setter);
    
    /// @notice Set value with encrypted input and proof
    /// @param _encryptedInput The encrypted input
    /// @param _inputProof The proof for the encrypted input
    /// @dev ✅ DO: Match encryption signer with transaction signer
    ///      The proof attests that _encryptedInput was encrypted for [this contract, msg.sender]
    ///      If msg.sender doesn't match the encryption signer, the proof will be invalid
    function setValue(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        // The proof verifies that _encryptedInput was encrypted for:
        // - Contract: address(this)
        // - User: msg.sender
        // If these don't match, FHE.fromExternal() will revert
        
        _encryptedValue = FHE.fromExternal(_encryptedInput, _inputProof);
        
        // Grant permissions
        FHE.allowThis(_encryptedValue);
        FHE.allow(_encryptedValue, msg.sender);
        
        hasSetValue[msg.sender] = true;
        emit ValueSet(msg.sender);
    }
    
    /// @notice Update value (only if you previously set it)
    /// @param _encryptedInput The new encrypted value
    /// @param _inputProof The proof for the encrypted input
    /// @dev This demonstrates that each operation needs a fresh proof
    function updateValue(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        require(hasSetValue[msg.sender], "Must have set value before");
        
        // Each encrypted input needs its own proof
        // Even if it's the same user, each encryption is unique
        _encryptedValue = FHE.fromExternal(_encryptedInput, _inputProof);
        
        // Grant permissions
        FHE.allowThis(_encryptedValue);
        FHE.allow(_encryptedValue, msg.sender);
    }
    
    /// @notice Get the encrypted value
    /// @return The encrypted value
    function getEncryptedValue() external view returns (euint32) {
        return _encryptedValue;
    }
    
    /// @notice Example: Multiple users can set values (each with their own proof)
    /// @param _encryptedInput The encrypted input
    /// @param _inputProof The proof for the encrypted input
    /// @dev Each user encrypts with their own key, so each needs their own proof
    function setValueForUser(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        // Each user's encryption is unique
        // Each user's proof is unique
        // The proof binds the encryption to [contract, msg.sender]
        
        euint32 userValue = FHE.fromExternal(_encryptedInput, _inputProof);
        
        // Grant permissions to this user
        FHE.allowThis(userValue);
        FHE.allow(userValue, msg.sender);
        
        // In a real scenario, you might store per-user values
        // For this example, we just update the global value
        _encryptedValue = userValue;
        
        hasSetValue[msg.sender] = true;
        emit ValueSet(msg.sender);
    }
}

