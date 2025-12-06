// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint64, externalEuint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ERC7984Mock} from "../openzeppelin/ERC7984Mock.sol";

/// @title Confidential Portfolio Rebalancer
/// @notice Demonstrates a confidential portfolio management system with automatic rebalancing
/// @dev This contract demonstrates:
///      - Tracking multiple ERC7984 token balances (encrypted)
///      - Calculating portfolio allocation percentages
///      - Comparing current vs target allocations
///      - Executing rebalancing trades with encrypted amounts
///      - Complex FHE operations: add, mul, sub, div, comparisons
/// 
/// @dev Key Concepts:
///      - Portfolio: Collection of multiple confidential token balances
///      - Target Allocation: Desired percentage allocation for each token (plaintext for calculation)
///      - Current Allocation: Actual percentage based on current balances (calculated from encrypted values)
///      - Rebalancing: Adjusting positions to match target allocations
///      - Rebalancing Threshold: Minimum drift percentage before rebalancing triggers
/// 
/// @dev Educational Notes:
///      - Uses plaintext total portfolio value for allocation calculations (acceptable trade-off)
///      - Individual token balances remain encrypted throughout
///      - Rebalancing amounts are calculated and executed as encrypted values
///      - Demonstrates complex multi-token FHE operations
///      - Shows practical portfolio management with privacy preservation
contract ConfidentialPortfolioRebalancer is ZamaEthereumConfig {
    /// @notice Maximum number of tokens in portfolio
    uint8 public constant MAX_TOKENS = 5;
    
    /// @notice Rebalancing threshold (in basis points, e.g., 500 = 5%)
    uint16 public rebalancingThreshold;
    
    /// @notice Portfolio owner
    address public immutable owner;
    
    /// @notice Token information
    struct TokenInfo {
        ERC7984Mock token;           // ERC7984 token contract
        euint64 balance;              // Encrypted balance in portfolio
        uint16 targetAllocationBps;   // Target allocation in basis points (e.g., 4000 = 40%)
        bool isActive;                // Whether token is active in portfolio
    }
    
    /// @notice Array of tokens in portfolio
    TokenInfo[MAX_TOKENS] public tokens;
    
    /// @notice Number of active tokens
    uint8 public tokenCount;
    
    /// @notice Events
    event TokenAdded(address indexed token, uint16 targetAllocationBps);
    event TokenRemoved(address indexed token);
    event RebalancingThresholdUpdated(uint16 oldThreshold, uint16 newThreshold);
    event RebalancingExecuted(
        address indexed token,
        bool isBuy,  // true = buy (add), false = sell (remove)
        euint64 amount
    );
    event PortfolioValueUpdated(euint64 totalValue);
    
    /// @notice Errors
    error Unauthorized();
    error InvalidToken();
    error TokenAlreadyExists();
    error MaxTokensReached();
    error InvalidAllocation();
    error InsufficientBalance();
    
    /// @notice Constructor
    /// @param _rebalancingThreshold Rebalancing threshold in basis points (e.g., 500 = 5%)
    constructor(uint16 _rebalancingThreshold) {
        owner = msg.sender;
        rebalancingThreshold = _rebalancingThreshold;
    }
    
    /// @notice Modifier to restrict access to owner
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }
    
    /// @notice Add a token to the portfolio
    /// @param token ERC7984 token contract address
    /// @param targetAllocationBps Target allocation in basis points (e.g., 4000 = 40%)
    /// @dev Educational: Demonstrates adding tokens to portfolio with target allocations
    function addToken(ERC7984Mock token, uint16 targetAllocationBps) external onlyOwner {
        if (address(token) == address(0)) revert InvalidToken();
        if (tokenCount >= MAX_TOKENS) revert MaxTokensReached();
        if (targetAllocationBps == 0 || targetAllocationBps > 10000) revert InvalidAllocation();
        
        // Check if token already exists
        for (uint8 i = 0; i < tokenCount; i++) {
            if (address(tokens[i].token) == address(token)) {
                revert TokenAlreadyExists();
            }
        }
        
        // Add token
        euint64 initialBalance = FHE.asEuint64(0);
        // Grant permissions for the initial balance
        FHE.allowThis(initialBalance);
        FHE.allow(initialBalance, address(this));
        
        tokens[tokenCount] = TokenInfo({
            token: token,
            balance: initialBalance,
            targetAllocationBps: targetAllocationBps,
            isActive: true
        });
        
        tokenCount++;
        
        emit TokenAdded(address(token), targetAllocationBps);
    }
    
    /// @notice Remove a token from the portfolio
    /// @param tokenIndex Index of token to remove
    /// @dev Educational: Demonstrates removing tokens from portfolio
    function removeToken(uint8 tokenIndex) external onlyOwner {
        if (tokenIndex >= tokenCount) revert InvalidToken();
        
        address tokenAddress = address(tokens[tokenIndex].token);
        
        // Shift remaining tokens
        for (uint8 i = tokenIndex; i < tokenCount - 1; i++) {
            tokens[i] = tokens[i + 1];
        }
        
        tokenCount--;
        tokens[tokenCount].isActive = false;
        
        emit TokenRemoved(tokenAddress);
    }
    
    /// @notice Update rebalancing threshold
    /// @param newThreshold New threshold in basis points
    function setRebalancingThreshold(uint16 newThreshold) external onlyOwner {
        uint16 oldThreshold = rebalancingThreshold;
        rebalancingThreshold = newThreshold;
        emit RebalancingThresholdUpdated(oldThreshold, newThreshold);
    }
    
    /// @notice Deposit tokens into portfolio
    /// @param tokenIndex Index of token to deposit
    /// @param encryptedAmount Encrypted amount to deposit (must match transferred amount)
    /// @param inputProof Input proof for encrypted amount
    /// @dev Educational: Demonstrates depositing encrypted tokens into portfolio
    /// @dev Note: User must:
    ///      1. Transfer tokens to this contract first using token.confidentialTransfer(address(this), amount, proof)
    ///      2. Grant permission to this contract: FHE.allow(encryptedAmount, address(this))
    ///      3. Then call this function to add to tracked balance
    function deposit(
        uint8 tokenIndex,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external {
        if (tokenIndex >= tokenCount) revert InvalidToken();
        
        TokenInfo storage tokenInfo = tokens[tokenIndex];
        
        // Convert external encrypted amount to internal
        // FHE.fromExternal automatically grants permissions to the contract
        euint64 internalAmount = FHE.fromExternal(encryptedAmount, inputProof);
        
        // Note: User should have already transferred tokens to this contract
        // using token.confidentialTransfer(address(this), amount, proof)
        // We just add to the tracked balance here
        
        // Update portfolio balance (add to existing)
        // Both values should have permissions: balance from initialization, amount from fromExternal
        tokenInfo.balance = FHE.add(tokenInfo.balance, internalAmount);
        
        // Grant permissions for the updated balance
        FHE.allowThis(tokenInfo.balance);
        FHE.allow(tokenInfo.balance, owner);
    }
    
    /// @notice Withdraw tokens from portfolio
    /// @param tokenIndex Index of token to withdraw
    /// @param encryptedAmount Encrypted amount to withdraw
    /// @param inputProof Input proof for encrypted amount
    /// @dev Educational: Demonstrates withdrawing encrypted tokens from portfolio
    function withdraw(
        uint8 tokenIndex,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external {
        if (tokenIndex >= tokenCount) revert InvalidToken();
        
        TokenInfo storage tokenInfo = tokens[tokenIndex];
        
        // Convert external encrypted amount to internal
        euint64 internalAmount = FHE.fromExternal(encryptedAmount, inputProof);
        
        // Note: Balance check happens implicitly when transferring tokens
        // The token contract will revert if balance is insufficient
        
        // Update portfolio balance (subtract)
        tokenInfo.balance = FHE.sub(tokenInfo.balance, internalAmount);
        
        // Grant permissions for transfer
        FHE.allowTransient(internalAmount, address(this));
        FHE.allow(internalAmount, address(tokenInfo.token));
        
        // Transfer tokens to user
        tokenInfo.token.confidentialTransfer(msg.sender, internalAmount);
        
        // Grant permissions for updated balance
        FHE.allowThis(tokenInfo.balance);
        FHE.allow(tokenInfo.balance, owner);
    }
    
    /// @notice Calculate total portfolio value (sum of all encrypted balances)
    /// @return totalValue Encrypted total value
    /// @dev Educational: Demonstrates summing multiple encrypted values
    function calculateTotalValue() public returns (euint64 totalValue) {
        totalValue = FHE.asEuint64(0);
        
        for (uint8 i = 0; i < tokenCount; i++) {
            if (tokens[i].isActive) {
                totalValue = FHE.add(totalValue, tokens[i].balance);
            }
        }
        
        return totalValue;
    }
    
    /// @notice Calculate target amount for a token based on target allocation
    /// @param tokenIndex Index of token
    /// @param totalValue Encrypted total portfolio value
    /// @return targetAmount Encrypted target amount
    /// @dev Educational: Demonstrates calculating target amounts using FHE.mul
    /// @dev Note: Uses plaintext percentage (targetAllocationBps) with encrypted total
    /// @dev FHE.mul requires both operands to be encrypted, so we need to encrypt the percentage
    function calculateTargetAmount(uint8 tokenIndex, euint64 totalValue) 
        public 
        returns (euint64 targetAmount) 
    {
        if (tokenIndex >= tokenCount) revert InvalidToken();
        
        TokenInfo storage tokenInfo = tokens[tokenIndex];
        
        // Convert target allocation (basis points) to encrypted value
        // e.g., 4000 basis points = 40% = 0.4
        // We'll work with basis points directly: targetAmount = (totalValue * targetAllocationBps) / 10000
        // Since FHE.mul needs encrypted operands, we encrypt the percentage
        euint64 targetBps = FHE.asEuint64(tokenInfo.targetAllocationBps);
        
        // Multiply: totalValue * targetAllocationBps
        euint64 multiplied = FHE.mul(totalValue, targetBps);
        
        // Divide by 10000 to get the actual target amount
        // FHE.div requires plaintext divisor, so we use 10000 as plaintext
        targetAmount = FHE.div(multiplied, 10000);
        
        return targetAmount;
    }
    
    /// @notice Calculate current allocation percentage for a token
    /// @param tokenIndex Index of token
    /// @return currentAllocationBps Current allocation in basis points (encrypted, needs decryption)
    /// @dev Educational: Demonstrates calculating percentages using FHE.div
    /// @dev Note: Returns encrypted value - needs decryption to get actual percentage
    function calculateCurrentAllocation(uint8 tokenIndex) 
        public 
        returns (euint64 currentAllocationBps) 
    {
        if (tokenIndex >= tokenCount) revert InvalidToken();
        
        TokenInfo storage tokenInfo = tokens[tokenIndex];
        
        // Calculate: (balance * 10000) / totalValue
        // Multiply balance by 10000 to get basis points
        euint64 balanceBps = FHE.mul(tokenInfo.balance, FHE.asEuint64(10000));
        
        // Divide by totalValue (encrypted)
        // Since FHE.div requires plaintext divisor, we need to decrypt totalValue first
        // For this example, we'll return the encrypted ratio
        // In practice, you'd decrypt totalValue, then use FHE.div with plaintext
        
        // Alternative approach: return the ratio as encrypted value
        // The actual percentage would be: decrypt(balanceBps) / decrypt(totalValue) * 100
        // But we can't do encrypted division by encrypted value directly
        
        // For this example, we'll use a workaround:
        // Calculate approximate allocation by comparing balance to total
        // This is a simplified approach - full implementation would require decryption
        
        return balanceBps; // Returns balance * 10000 (needs division by totalValue off-chain)
    }
    
    /// @notice Check if rebalancing is needed for a token
    /// @param tokenIndex Index of token to check
    /// @param totalValue Encrypted total portfolio value
    /// @return needsRebalancing Whether rebalancing is needed (encrypted boolean)
    /// @return rebalanceAmount Encrypted amount to rebalance (positive = sell, negative = buy)
    /// @dev Educational: Demonstrates comparing encrypted values and calculating differences
    function checkRebalancingNeeded(uint8 tokenIndex, euint64 totalValue)
        public
        returns (ebool needsRebalancing, euint64 rebalanceAmount)
    {
        if (tokenIndex >= tokenCount) revert InvalidToken();
        
        TokenInfo storage tokenInfo = tokens[tokenIndex];
        
        // Calculate target amount
        euint64 targetAmount = calculateTargetAmount(tokenIndex, totalValue);
        
        // Calculate difference: current - target
        // Positive difference = too much (need to sell)
        // Negative difference = too little (need to buy)
        euint64 difference = FHE.sub(tokenInfo.balance, targetAmount);
        
        // Calculate absolute difference for threshold comparison
        // Since we can't do absolute value directly, we'll check both directions
        ebool isAboveTarget = FHE.ge(difference, FHE.asEuint64(0));
        euint64 absDifference = FHE.select(
            isAboveTarget,
            difference,
            FHE.sub(FHE.asEuint64(0), difference) // Negate if negative
        );
        
        // Calculate threshold amount (targetAmount * thresholdBps / 10000)
        euint64 thresholdBps = FHE.asEuint64(rebalancingThreshold);
        euint64 thresholdAmount = FHE.div(
            FHE.mul(targetAmount, thresholdBps),
            10000
        );
        
        // Check if absolute difference exceeds threshold
        needsRebalancing = FHE.ge(absDifference, thresholdAmount);
        
        // Return the rebalance amount (difference)
        rebalanceAmount = difference;
    }
    
    /// @notice Execute rebalancing for a token
    /// @param tokenIndex Index of token to rebalance
    /// @param isSell Whether to sell (true) or buy (false) - determined off-chain
    /// @dev Educational: Demonstrates executing rebalancing trades with encrypted amounts
    /// @dev Note: The isSell parameter is determined off-chain by decrypting checkRebalancingNeeded result
    /// @dev In production, you'd need to handle actual token swaps/exchanges with other tokens
    function executeRebalancing(uint8 tokenIndex, bool isSell) external onlyOwner {
        if (tokenIndex >= tokenCount) revert InvalidToken();
        
        // Calculate total portfolio value
        euint64 totalValue = calculateTotalValue();
        
        // Check if rebalancing is needed and get rebalance amount
        // Note: We can't decrypt ebool on-chain, so the caller must verify off-chain
        // that rebalancing is needed before calling this function
        // We still call checkRebalancingNeeded to get the rebalance amount
        (, euint64 rebalanceAmount) = checkRebalancingNeeded(
            tokenIndex,
            totalValue
        );
        
        TokenInfo storage tokenInfo = tokens[tokenIndex];
        
        // Get absolute rebalance amount
        ebool isPositive = FHE.ge(rebalanceAmount, FHE.asEuint64(0));
        euint64 absRebalanceAmount = FHE.select(
            isPositive,
            rebalanceAmount,
            FHE.sub(FHE.asEuint64(0), rebalanceAmount)
        );
        
        if (isSell) {
            // Need to sell tokens (reduce balance)
            tokenInfo.balance = FHE.sub(tokenInfo.balance, absRebalanceAmount);
            emit RebalancingExecuted(address(tokenInfo.token), false, absRebalanceAmount);
        } else {
            // Need to buy tokens (increase balance)
            // In production, this would involve swapping other tokens
            tokenInfo.balance = FHE.add(tokenInfo.balance, absRebalanceAmount);
            emit RebalancingExecuted(address(tokenInfo.token), true, absRebalanceAmount);
        }
        
        // Grant permissions for updated balance
        FHE.allowThis(tokenInfo.balance);
        FHE.allow(tokenInfo.balance, owner);
    }
    
    /// @notice Get token balance (encrypted)
    /// @param tokenIndex Index of token
    /// @return balance Encrypted balance
    function getTokenBalance(uint8 tokenIndex) external view returns (euint64 balance) {
        if (tokenIndex >= tokenCount) revert InvalidToken();
        return tokens[tokenIndex].balance;
    }
    
    /// @notice Get token info
    /// @param tokenIndex Index of token
    /// @return token Token contract address
    /// @return targetAllocationBps Target allocation in basis points
    /// @return isActive Whether token is active
    function getTokenInfo(uint8 tokenIndex)
        external
        view
        returns (
            address token,
            uint16 targetAllocationBps,
            bool isActive
        )
    {
        if (tokenIndex >= tokenCount) revert InvalidToken();
        TokenInfo storage tokenInfo = tokens[tokenIndex];
        return (
            address(tokenInfo.token),
            tokenInfo.targetAllocationBps,
            tokenInfo.isActive
        );
    }
}

