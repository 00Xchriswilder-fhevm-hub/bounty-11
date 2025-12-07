// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Input Proof Anti-Patterns
/// @notice Demonstrates common mistakes with input proofs
/// @dev This example shows:
///      - What happens when proofs are missing
///      - What happens when proofs are invalid
///      - Common mistakes to avoid
///      - Why proofs are necessary
/// 
/// @dev Key Anti-Patterns:
///      - ❌ DON'T: Try to use encrypted input without proof (will revert)
///      - ❌ DON'T: Use proof from different contract/user (will revert)
///      - ❌ DON'T: Reuse proofs (each encryption needs fresh proof)
///      - ❌ DON'T: Mismatch encryption signer with transaction signer
contract InputProofAntiPatterns is ZamaEthereumConfig {
    /// @notice Encrypted value
    euint32 private _encryptedValue;
    
    /// @notice This function demonstrates the CORRECT pattern
    /// @param _encryptedInput The encrypted input
    /// @param _inputProof The proof for the encrypted input
    /// @dev ✅ DO: Always provide proof with encrypted input
    function correctPattern(externalEuint32 _encryptedInput, bytes calldata _inputProof) external {
        // ✅ DO: Provide proof with encrypted input
        _encryptedValue = FHE.fromExternal(_encryptedInput, _inputProof);
        
        FHE.allowThis(_encryptedValue);
        FHE.allow(_encryptedValue, msg.sender);
    }
    
    /// @notice This function would fail - missing proof
    /// @param _encryptedInput The encrypted input (without proof)
    /// @dev ❌ DON'T: Try to use encrypted input without proof
    ///      This function is commented out because it won't compile
    ///      FHE.fromExternal() requires both encrypted input AND proof
    /*
    function wrongPatternMissingProof(externalEuint32 _encryptedInput) external {
        // ❌ DON'T: This won't compile - FHE.fromExternal requires proof
        // _encryptedValue = FHE.fromExternal(_encryptedInput); // ERROR: Missing proof parameter
    }
    */
    
    /// @notice This function demonstrates what happens with invalid proof
    /// @param _encryptedInput The encrypted input
    /// @param _invalidProof An invalid proof (wrong contract/user)
    /// @dev ❌ DON'T: Use proof from different contract or user
    ///      This will revert when called with mismatched proof
    ///      The proof must match the encryption's [contract, user] binding
    function wrongPatternInvalidProof(
        externalEuint32 _encryptedInput,
        bytes calldata _invalidProof
    ) external {
        // ❌ DON'T: This will revert if _invalidProof doesn't match
        // The proof must attest that _encryptedInput was encrypted for [this contract, msg.sender]
        // If it was encrypted for a different contract or user, this will fail
        
        // This will revert if proof is invalid
        _encryptedValue = FHE.fromExternal(_encryptedInput, _invalidProof);
        
        FHE.allowThis(_encryptedValue);
        FHE.allow(_encryptedValue, msg.sender);
    }
    
    /// @notice Get the encrypted value
    /// @return The encrypted value
    function getEncryptedValue() external view returns (euint32) {
        return _encryptedValue;
    }
    
    /// @notice Example showing why each encryption needs fresh proof
    /// @param _encryptedInput1 First encrypted input
    /// @param _proof1 Proof for first input
    /// @param _encryptedInput2 Second encrypted input (different value)
    /// @param _proof2 Proof for second input
    /// @dev ✅ DO: Each encrypted input needs its own proof
    ///      Even if from the same user, each encryption is unique
    function correctMultipleInputs(
        externalEuint32 _encryptedInput1,
        bytes calldata _proof1,
        externalEuint32 _encryptedInput2,
        bytes calldata _proof2
    ) external {
        // ✅ DO: Each input has its own proof
        euint32 value1 = FHE.fromExternal(_encryptedInput1, _proof1);
        euint32 value2 = FHE.fromExternal(_encryptedInput2, _proof2);
        
        // Perform operation
        _encryptedValue = FHE.add(value1, value2);
        
        FHE.allowThis(_encryptedValue);
        FHE.allow(_encryptedValue, msg.sender);
    }
    
    /// @notice This would fail - reusing proof for different input
    /// @dev ❌ DON'T: Reuse proofs
    ///      Each encryption is unique and needs its own proof
    ///      Reusing a proof for a different encrypted value will fail
    /*
    function wrongPatternReuseProof(
        externalEuint32 _encryptedInput1,
        bytes calldata _proof,
        externalEuint32 _encryptedInput2
    ) external {
        // ❌ DON'T: Reusing proof for different input
        // This will fail because _proof was generated for _encryptedInput1, not _encryptedInput2
        euint32 value1 = FHE.fromExternal(_encryptedInput1, _proof);
        euint32 value2 = FHE.fromExternal(_encryptedInput2, _proof); // ERROR: Wrong proof
    }
    */
}

