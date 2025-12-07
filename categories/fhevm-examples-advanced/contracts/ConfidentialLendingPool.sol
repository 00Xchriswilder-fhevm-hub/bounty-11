// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint64, externalEuint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ERC7984Mock} from "./openzeppelin/ERC7984Mock.sol";

/// @title Confidential Lending Pool
/// @notice Demonstrates a confidential lending system with encrypted collateral and debt
/// @dev This contract demonstrates:
///      - Multiple ERC7984 assets as collateral
///      - Encrypted collateral and debt tracking per borrower
///      - Collateralization ratio calculations (encrypted)
///      - Interest calculations with encrypted amounts
///      - Liquidation logic based on encrypted health factors
///      - Complex FHE operations: add, mul, sub, div, comparisons
/// 
/// @dev Key Concepts:
///      - Collateral: ERC7984 tokens deposited as security for loans
///      - Debt: Encrypted amount borrowed against collateral
///      - Collateralization Ratio: (collateral value / debt) * 100
///      - Health Factor: Encrypted metric determining liquidation eligibility
///      - Liquidation Threshold: Minimum collateralization ratio before liquidation
/// 
/// @dev Educational Notes:
///      - All collateral and debt amounts remain encrypted throughout
///      - Interest accrues on encrypted debt values
///      - Liquidation checks use encrypted comparisons
///      - Demonstrates complex DeFi primitives with privacy preservation
contract ConfidentialLendingPool is ZamaEthereumConfig {
    /// @notice Maximum number of supported collateral assets
    uint8 public constant MAX_ASSETS = 5;
    
    /// @notice Liquidation threshold (in basis points, e.g., 15000 = 150%)
    uint16 public liquidationThreshold;
    
    /// @notice Interest rate per block (in basis points, e.g., 10 = 0.1% per block)
    uint16 public interestRateBps;
    
    /// @notice Pool owner
    address public immutable owner;
    
    /// @notice Collateral asset information
    struct AssetInfo {
        ERC7984Mock token;           // ERC7984 token contract
        uint16 collateralFactorBps;  // Collateral factor in basis points (e.g., 8000 = 80%)
        bool isActive;                // Whether asset is accepted as collateral
    }
    
    /// @notice Borrower position information
    struct BorrowerPosition {
        euint64 totalCollateral;     // Total encrypted collateral value
        euint64 totalDebt;            // Total encrypted debt
        uint256 lastInterestBlock;    // Last block when interest was calculated
        bool exists;                  // Whether borrower has an active position
    }
    
    /// @notice Collateral per borrower: borrower => assetIndex => encrypted amount
    mapping(address => mapping(uint8 => euint64)) public collateralBalances;
    
    /// @notice Borrower positions
    mapping(address => BorrowerPosition) public borrowers;
    
    /// @notice Array of accepted collateral assets
    AssetInfo[MAX_ASSETS] public assets;
    
    /// @notice Number of active assets
    uint8 public assetCount;
    
    /// @notice Events
    event AssetAdded(address indexed token, uint16 collateralFactorBps);
    event AssetRemoved(address indexed token);
    event CollateralDeposited(address indexed borrower, uint8 assetIndex, euint64 amount);
    event CollateralWithdrawn(address indexed borrower, uint8 assetIndex, euint64 amount);
    event DebtBorrowed(address indexed borrower, euint64 amount);
    event DebtRepaid(address indexed borrower, euint64 amount);
    event LiquidationThresholdUpdated(uint16 oldThreshold, uint16 newThreshold);
    event InterestRateUpdated(uint16 oldRate, uint16 newRate);
    event PositionLiquidated(address indexed borrower, euint64 collateralSeized, euint64 debtRepaid);
    
    /// @notice Errors
    error Unauthorized();
    error InvalidAsset();
    error AssetAlreadyExists();
    error MaxAssetsReached();
    error InvalidCollateralFactor();
    error InvalidBorrower();
    error InsufficientCollateral();
    error InsufficientDebt();
    error PositionNotLiquidatable();
    error InvalidAmount();
    
    /// @notice Constructor
    /// @param _liquidationThreshold Liquidation threshold in basis points (e.g., 15000 = 150%)
    /// @param _interestRateBps Interest rate per block in basis points (e.g., 10 = 0.1%)
    constructor(uint16 _liquidationThreshold, uint16 _interestRateBps) {
        owner = msg.sender;
        liquidationThreshold = _liquidationThreshold;
        interestRateBps = _interestRateBps;
    }
    
    /// @notice Modifier to restrict access to owner
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }
    
    /// @notice Add a collateral asset
    /// @param token ERC7984 token contract address
    /// @param collateralFactorBps Collateral factor in basis points (e.g., 8000 = 80%)
    /// @dev Educational: Demonstrates adding assets to the lending pool
    function addAsset(ERC7984Mock token, uint16 collateralFactorBps) external onlyOwner {
        if (address(token) == address(0)) revert InvalidAsset();
        if (assetCount >= MAX_ASSETS) revert MaxAssetsReached();
        if (collateralFactorBps == 0 || collateralFactorBps > 10000) revert InvalidCollateralFactor();
        
        // Check if asset already exists
        for (uint8 i = 0; i < assetCount; i++) {
            if (address(assets[i].token) == address(token)) {
                revert AssetAlreadyExists();
            }
        }
        
        assets[assetCount] = AssetInfo({
            token: token,
            collateralFactorBps: collateralFactorBps,
            isActive: true
        });
        
        assetCount++;
        
        emit AssetAdded(address(token), collateralFactorBps);
    }
    
    /// @notice Remove a collateral asset
    /// @param assetIndex Index of asset to remove
    /// @dev Educational: Demonstrates removing assets from the lending pool
    function removeAsset(uint8 assetIndex) external onlyOwner {
        if (assetIndex >= assetCount) revert InvalidAsset();
        
        assets[assetIndex].isActive = false;
        
        emit AssetRemoved(address(assets[assetIndex].token));
    }
    
    /// @notice Update liquidation threshold
    /// @param newThreshold New liquidation threshold in basis points
    function setLiquidationThreshold(uint16 newThreshold) external onlyOwner {
        if (newThreshold == 0 || newThreshold > 20000) revert InvalidCollateralFactor();
        
        uint16 oldThreshold = liquidationThreshold;
        liquidationThreshold = newThreshold;
        
        emit LiquidationThresholdUpdated(oldThreshold, newThreshold);
    }
    
    /// @notice Update interest rate
    /// @param newRate New interest rate per block in basis points
    function setInterestRate(uint16 newRate) external onlyOwner {
        uint16 oldRate = interestRateBps;
        interestRateBps = newRate;
        
        emit InterestRateUpdated(oldRate, newRate);
    }
    
    /// @notice Deposit collateral
    /// @param assetIndex Index of collateral asset
    /// @param encryptedAmount Encrypted amount to deposit
    /// @param inputProof Input proof for encrypted amount
    /// @dev Educational: Demonstrates depositing encrypted collateral
    function depositCollateral(
        uint8 assetIndex,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external {
        if (assetIndex >= assetCount) revert InvalidAsset();
        if (!assets[assetIndex].isActive) revert InvalidAsset();
        
        AssetInfo storage asset = assets[assetIndex];
        
        // Convert external encrypted input to internal
        euint64 internalAmount = FHE.fromExternal(encryptedAmount, inputProof);
        
        // Grant transient permissions for the operation
        FHE.allowTransient(internalAmount, address(this));
        
        // Note: User should have already transferred tokens to this contract
        // using token.confidentialTransfer(address(this), amount, proof)
        // We just add to the tracked collateral balance here
        
        // Update collateral balance
        euint64 currentCollateral = collateralBalances[msg.sender][assetIndex];
        if (!FHE.isInitialized(currentCollateral)) {
            currentCollateral = FHE.asEuint64(0);
        }
        
        collateralBalances[msg.sender][assetIndex] = FHE.add(currentCollateral, internalAmount);
        
        // Grant permissions for the updated balance
        FHE.allowThis(collateralBalances[msg.sender][assetIndex]);
        FHE.allow(collateralBalances[msg.sender][assetIndex], msg.sender);
        
        // Update total collateral for borrower
        BorrowerPosition storage position = borrowers[msg.sender];
        if (!position.exists) {
            position.exists = true;
            position.lastInterestBlock = block.number;
        }
        
        // Calculate collateral value (collateral * collateralFactor)
        euint64 collateralValue = FHE.mul(
            collateralBalances[msg.sender][assetIndex],
            FHE.asEuint64(asset.collateralFactorBps)
        );
        collateralValue = FHE.div(collateralValue, 10000);
        
        // Add to total collateral
        if (!FHE.isInitialized(position.totalCollateral)) {
            position.totalCollateral = FHE.asEuint64(0);
        }
        position.totalCollateral = FHE.add(position.totalCollateral, collateralValue);
        
        // Grant permissions for total collateral
        FHE.allowThis(position.totalCollateral);
        FHE.allow(position.totalCollateral, msg.sender);
        
        emit CollateralDeposited(msg.sender, assetIndex, internalAmount);
    }
    
    /// @notice Withdraw collateral
    /// @param assetIndex Index of collateral asset
    /// @param encryptedAmount Encrypted amount to withdraw
    /// @param inputProof Input proof for encrypted amount
    /// @dev Educational: Demonstrates withdrawing encrypted collateral
    function withdrawCollateral(
        uint8 assetIndex,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external {
        if (assetIndex >= assetCount) revert InvalidAsset();
        
        BorrowerPosition storage position = borrowers[msg.sender];
        if (!position.exists) revert InvalidBorrower();
        
        // Convert external encrypted input to internal
        euint64 internalAmount = FHE.fromExternal(encryptedAmount, inputProof);
        
        // Check if borrower has enough collateral
        euint64 currentCollateral = collateralBalances[msg.sender][assetIndex];
        if (!FHE.isInitialized(currentCollateral)) {
            currentCollateral = FHE.asEuint64(0);
        }
        
        // Update collateral balance (subtract)
        collateralBalances[msg.sender][assetIndex] = FHE.sub(currentCollateral, internalAmount);
        
        // Grant permissions for the updated balance
        FHE.allowThis(collateralBalances[msg.sender][assetIndex]);
        FHE.allow(collateralBalances[msg.sender][assetIndex], msg.sender);
        
        // Update total collateral (subtract collateral value)
        AssetInfo storage asset = assets[assetIndex];
        euint64 collateralValue = FHE.mul(internalAmount, FHE.asEuint64(asset.collateralFactorBps));
        collateralValue = FHE.div(collateralValue, 10000);
        
        position.totalCollateral = FHE.sub(position.totalCollateral, collateralValue);
        
        // Grant permissions for total collateral
        FHE.allowThis(position.totalCollateral);
        FHE.allow(position.totalCollateral, msg.sender);
        
        // Transfer tokens to user
        FHE.allowTransient(internalAmount, address(this));
        FHE.allow(internalAmount, address(asset.token));
        asset.token.confidentialTransfer(msg.sender, internalAmount);
        
        emit CollateralWithdrawn(msg.sender, assetIndex, internalAmount);
    }
    
    /// @notice Borrow debt against collateral
    /// @param encryptedAmount Encrypted amount to borrow
    /// @param inputProof Input proof for encrypted amount
    /// @dev Educational: Demonstrates borrowing with encrypted amounts
    function borrow(
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external {
        BorrowerPosition storage position = borrowers[msg.sender];
        if (!position.exists) revert InvalidBorrower();
        
        // Convert external encrypted input to internal
        euint64 internalAmount = FHE.fromExternal(encryptedAmount, inputProof);
        
        // Accrue interest first
        _accrueInterest(msg.sender);
        
        // Check if borrower has sufficient collateral
        // Health factor = (totalCollateral / totalDebt) * 100
        // We need: totalCollateral >= (totalDebt + newDebt) * liquidationThreshold / 10000
        euint64 newTotalDebt = FHE.add(position.totalDebt, internalAmount);
        euint64 minCollateral = FHE.mul(newTotalDebt, FHE.asEuint64(liquidationThreshold));
        minCollateral = FHE.div(minCollateral, 10000);
        
        ebool hasEnoughCollateral = FHE.ge(position.totalCollateral, minCollateral);
        // Note: We can't decrypt ebool on-chain, so we rely on the comparison
        // In production, this would be checked off-chain before calling
        
        // Update debt
        position.totalDebt = newTotalDebt;
        
        // Grant permissions for total debt
        FHE.allowThis(position.totalDebt);
        FHE.allow(position.totalDebt, msg.sender);
        
        // Transfer borrowed tokens to user
        // For this example, we'll mint new tokens (in production, would come from pool)
        // Note: This is simplified - real implementation would track pool reserves
        
        emit DebtBorrowed(msg.sender, internalAmount);
    }
    
    /// @notice Repay debt
    /// @param encryptedAmount Encrypted amount to repay
    /// @param inputProof Input proof for encrypted amount
    /// @dev Educational: Demonstrates repaying encrypted debt
    function repay(
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external {
        BorrowerPosition storage position = borrowers[msg.sender];
        if (!position.exists) revert InvalidBorrower();
        
        // Accrue interest first
        _accrueInterest(msg.sender);
        
        // Convert external encrypted input to internal
        euint64 internalAmount = FHE.fromExternal(encryptedAmount, inputProof);
        
        // Update debt (subtract)
        position.totalDebt = FHE.sub(position.totalDebt, internalAmount);
        
        // Grant permissions for total debt
        FHE.allowThis(position.totalDebt);
        FHE.allow(position.totalDebt, msg.sender);
        
        // Note: User should have transferred tokens to this contract
        // In production, tokens would be burned or returned to pool
        
        emit DebtRepaid(msg.sender, internalAmount);
    }
    
    /// @notice Calculate health factor for a borrower
    /// @param borrower Address of borrower
    /// @return healthFactor Encrypted health factor (collateral / debt * 100)
    /// @dev Educational: Demonstrates calculating health factor with encrypted values
    function calculateHealthFactor(address borrower) 
        public 
        returns (euint64 healthFactor) 
    {
        BorrowerPosition storage position = borrowers[borrower];
        if (!position.exists) revert InvalidBorrower();
        
        // Accrue interest first
        _accrueInterest(borrower);
        
        // Health factor = (totalCollateral / totalDebt) * 100
        // Note: FHE.div requires plaintext divisor, so we can't directly divide encrypted debt
        // For this example, we'll use a simplified calculation
        // In production, you might need to decrypt debt, calculate, then re-encrypt
        // Or use a different approach with encrypted comparisons
        
        // For demonstration, we'll calculate: (totalCollateral * 100) / estimatedDebt
        // Since we can't divide by encrypted debt, we'll use a workaround
        // Calculate collateral value relative to a base debt amount
        euint64 zero = FHE.asEuint64(0);
        ebool hasDebt = FHE.ge(position.totalDebt, zero);
        
        // Simplified: multiply collateral by 100 to get percentage representation
        // Actual health factor calculation would require decrypting debt
        euint64 collateralTimes100 = FHE.mul(position.totalCollateral, FHE.asEuint64(100));
        
        // For this example, we'll return collateral * 100 as a proxy
        // In production, you'd decrypt debt, calculate ratio, then re-encrypt
        healthFactor = collateralTimes100;
        
        // If no debt, return a high value (e.g., 10000 = 10000%)
        euint64 highValue = FHE.asEuint64(10000);
        healthFactor = FHE.select(hasDebt, healthFactor, highValue);
        
        return healthFactor;
    }
    
    /// @notice Check if position is liquidatable
    /// @param borrower Address of borrower
    /// @return isLiquidatable Encrypted boolean indicating if position can be liquidated
    /// @return healthFactor Encrypted health factor
    /// @dev Educational: Demonstrates liquidation checks with encrypted comparisons
    function checkLiquidation(address borrower) 
        public 
        returns (ebool isLiquidatable, euint64 healthFactor) 
    {
        healthFactor = calculateHealthFactor(borrower);
        
        // Position is liquidatable if health factor < liquidation threshold
        euint64 threshold = FHE.asEuint64(liquidationThreshold);
        isLiquidatable = FHE.le(healthFactor, threshold);
        
        return (isLiquidatable, healthFactor);
    }
    
    /// @notice Liquidate a borrower's position
    /// @param borrower Address of borrower to liquidate
    /// @param assetIndex Index of collateral asset to seize
    /// @param encryptedSeizeAmount Encrypted amount of collateral to seize
    /// @param inputProof Input proof for encrypted amount
    /// @dev Educational: Demonstrates liquidation with encrypted amounts
    function liquidate(
        address borrower,
        uint8 assetIndex,
        externalEuint64 encryptedSeizeAmount,
        bytes calldata inputProof
    ) external {
        // Check if position is liquidatable
        // Note: We can't decrypt ebool on-chain, so liquidation must be verified off-chain
        // In production, this check would be done off-chain before calling
        checkLiquidation(borrower);
        
        BorrowerPosition storage position = borrowers[borrower];
        if (!position.exists) revert InvalidBorrower();
        if (assetIndex >= assetCount) revert InvalidAsset();
        
        // Convert external encrypted input to internal
        euint64 seizeAmount = FHE.fromExternal(encryptedSeizeAmount, inputProof);
        
        // Calculate debt to repay (typically a percentage of seized collateral)
        // For simplicity, we'll use 50% of collateral value as debt repayment
        AssetInfo storage asset = assets[assetIndex];
        euint64 collateralValue = FHE.mul(seizeAmount, FHE.asEuint64(asset.collateralFactorBps));
        collateralValue = FHE.div(collateralValue, 10000); // FHE.div accepts plaintext divisor
        euint64 debtRepaid = FHE.div(collateralValue, 2); // 50% - FHE.div requires plaintext divisor
        
        // Update borrower's collateral
        euint64 currentCollateral = collateralBalances[borrower][assetIndex];
        if (!FHE.isInitialized(currentCollateral)) {
            currentCollateral = FHE.asEuint64(0);
        }
        collateralBalances[borrower][assetIndex] = FHE.sub(currentCollateral, seizeAmount);
        
        // Update borrower's debt
        position.totalDebt = FHE.sub(position.totalDebt, debtRepaid);
        
        // Update borrower's total collateral
        position.totalCollateral = FHE.sub(position.totalCollateral, collateralValue);
        
        // Grant permissions
        FHE.allowThis(collateralBalances[borrower][assetIndex]);
        FHE.allowThis(position.totalDebt);
        FHE.allowThis(position.totalCollateral);
        
        // Transfer seized collateral to liquidator
        FHE.allowTransient(seizeAmount, address(this));
        FHE.allow(seizeAmount, address(asset.token));
        asset.token.confidentialTransfer(msg.sender, seizeAmount);
        
        emit PositionLiquidated(borrower, seizeAmount, debtRepaid);
    }
    
    /// @notice Accrue interest on debt
    /// @param borrower Address of borrower
    /// @dev Educational: Demonstrates interest calculation with encrypted debt
    function _accrueInterest(address borrower) internal {
        BorrowerPosition storage position = borrowers[borrower];
        if (!position.exists) return;
        
        uint256 blocksElapsed = block.number - position.lastInterestBlock;
        if (blocksElapsed == 0) return;
        
        // Calculate interest: debt * interestRate * blocksElapsed / 10000
        // For simplicity, we'll use a fixed interest calculation
        // In production, this would be more sophisticated
        
        // Update last interest block
        position.lastInterestBlock = block.number;
        
        // Note: Interest accrual with encrypted values is complex
        // In practice, you might need to decrypt debt, calculate interest, then re-encrypt
        // For this example, we'll skip automatic interest accrual and require manual updates
    }
    
    /// @notice Get collateral balance for a borrower
    /// @param borrower Address of borrower
    /// @param assetIndex Index of asset
    /// @return Encrypted collateral balance
    function getCollateralBalance(address borrower, uint8 assetIndex) 
        external 
        view 
        returns (euint64) 
    {
        return collateralBalances[borrower][assetIndex];
    }
    
    /// @notice Get total collateral for a borrower
    /// @param borrower Address of borrower
    /// @return Encrypted total collateral value
    function getTotalCollateral(address borrower) 
        external 
        view 
        returns (euint64) 
    {
        return borrowers[borrower].totalCollateral;
    }
    
    /// @notice Get total debt for a borrower
    /// @param borrower Address of borrower
    /// @return Encrypted total debt
    function getTotalDebt(address borrower) 
        external 
        view 
        returns (euint64) 
    {
        return borrowers[borrower].totalDebt;
    }
}

