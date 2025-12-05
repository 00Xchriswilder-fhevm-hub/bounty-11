// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ERC7984Mock} from "./ERC7984Mock.sol";

/**
 * @title Swap ERC7984 to ERC7984
 * @notice This example demonstrates swapping between two confidential tokens
 * @dev Shows how to perform a swap while keeping all amounts encrypted
 *
 * Key Features:
 * - Swap confidential token A for confidential token B
 * - All operations remain encrypted (no decryption needed)
 * - Atomic swap execution
 * - Demonstrates confidential-to-confidential swaps
 *
 * Use Cases:
 * - Privacy-preserving token swaps
 * - Confidential DEX operations
 * - Converting between different confidential tokens
 *
 */
contract SwapERC7984ToERC7984 is ZamaEthereumConfig {
    // Swap rate (how many tokenB per tokenA)
    // In production, this would be calculated dynamically or set by governance
    uint256 private immutable _rate;
    
    // Events
    event SwapExecuted(
        address indexed user,
        address indexed fromToken,
        address indexed toToken,
        euint64 fromAmount,
        euint64 toAmount
    );

    /**
     * @dev Constructor sets the swap rate
     * @param rate_ Swap rate (e.g., 1000 means 1 tokenA = 1000 tokenB)
     */
    constructor(uint256 rate_) {
        _rate = rate_ == 0 ? 1 : rate_; // Default to 1:1 if rate is 0
    }

    /**
     * @notice Returns the swap rate
     * @return Rate at which tokens are swapped
     */
    function rate() public view returns (uint256) {
        return _rate;
    }

    /**
     * @notice Swaps confidential tokens from one token to another
     * @param fromToken Address of the confidential token to swap from
     * @param toToken Address of the confidential token to swap to
     * @param transferredAmount The encrypted amount that was already transferred to this contract
     * @dev User must:
     *      1. Call fromToken.confidentialTransfer(address(this), encryptedAmount, inputProof) directly first
     *      2. Then call this function with the swap contract's fromToken balance
     * 
     *      This two-step process is necessary because input proofs are bound to the signer.
     *      When a contract calls confidentialTransfer on behalf of a user, msg.sender is the contract,
     *      not the user, so the input proof verification fails. The user must call confidentialTransfer
     *      directly to ensure msg.sender matches the signer in the input proof.
     */
    function swapConfidentialForConfidential(
        ERC7984Mock fromToken,
        ERC7984Mock toToken,
        euint64 transferredAmount
    ) external {
        require(address(fromToken) != address(0), "Swap: invalid fromToken");
        require(address(toToken) != address(0), "Swap: invalid toToken");
        require(address(fromToken) != address(toToken), "Swap: same token");
        
        // Verify that the transferred amount is allowed for this contract
        require(FHE.isAllowed(transferredAmount, address(this)), "Swap: amount not allowed for swap contract");
        
        // Grant transient permission for the swap contract
        FHE.allowTransient(transferredAmount, address(this));
        
        // Calculate toAmount based on rate
        // In production, this would be done with encrypted arithmetic
        // For this example, we'll use the same amount (1:1) or a fixed multiplier
        // In reality, you'd need: toAmount = transferredAmount * rate (encrypted multiplication)
        euint64 toAmount = transferredAmount; // Simplified: 1:1 swap (use transferred value)
        
        // Note: In production, you'd check that toToken contract has sufficient balance using
        // FHE comparison: toToken.balanceOf(this) >= toAmount
        // We skip the balance check for simplicity in this educational example
        
        // Grant permission for toToken transfer
        FHE.allowTransient(toAmount, address(toToken));
        FHE.allow(toAmount, address(this));
        
        // Transfer toToken to user
        // Use confidentialTransfer since we have an already-allowed euint64
        toToken.confidentialTransfer(msg.sender, toAmount);
        
        emit SwapExecuted(msg.sender, address(fromToken), address(toToken), transferredAmount, toAmount);
    }

    /**
     * @notice Simplified swap using already-allowed amounts
     * @param fromToken Address of the confidential token to swap from
     * @param toToken Address of the confidential token to swap to
     * @param fromAmount Encrypted amount of fromToken (must already be allowed)
     * @dev This version doesn't require input proof because the amount is already allowed
     *      Renamed to avoid function overloading ambiguity with ethers.js
     */
    function swapConfidentialForConfidentialWithAllowedAmount(
        ERC7984Mock fromToken,
        ERC7984Mock toToken,
        euint64 fromAmount
    ) external {
        require(address(fromToken) != address(0), "Swap: invalid fromToken");
        require(address(toToken) != address(0), "Swap: invalid toToken");
        require(address(fromToken) != address(toToken), "Swap: same token");
        
        // Check that the caller has permission to use this encrypted amount
        require(FHE.isAllowed(fromAmount, msg.sender), "Swap: amount not allowed");
        
        // Grant permission to swap contract so it can transfer on behalf of user
        FHE.allow(fromAmount, address(this));
        
        // Transfer fromToken from user to this contract
        // Use confidentialTransfer with already-allowed euint64
        // Note: confidentialTransfer checks if msg.sender (swap contract) has permission
        euint64 transferred = fromToken.confidentialTransfer(address(this), fromAmount);
        
        // Grant transient permission
        FHE.allowTransient(transferred, address(this));
        
        // Calculate toAmount (simplified: 1:1)
        euint64 toAmount = transferred;
        
        // Grant permission for toToken transfer
        FHE.allowTransient(toAmount, address(toToken));
        FHE.allow(toAmount, address(this));
        
        // Transfer toToken to user
        // Use confidentialTransfer since we have an already-allowed euint64
        toToken.confidentialTransfer(msg.sender, toAmount);
        
        emit SwapExecuted(msg.sender, address(fromToken), address(toToken), transferred, toAmount);
    }
}
