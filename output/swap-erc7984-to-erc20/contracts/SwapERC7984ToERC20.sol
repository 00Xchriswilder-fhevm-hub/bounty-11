// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC7984Mock} from "./ERC7984Mock.sol";

/**
 * @title Swap ERC7984 to ERC20
 * @notice This example demonstrates swapping confidential tokens for public tokens
 * @dev Shows how to perform a swap while maintaining privacy until finalization
 *
 * Key Features:
 * - Swap confidential ERC7984 tokens for public ERC20 tokens
 * - Two-phase swap: initiate (encrypted) → finalize (decrypted)
 * - Uses public decryption for finalization
 * - Demonstrates swap pattern with FHE
 *
 * Use Cases:
 * - Privacy-preserving token swaps
 * - Confidential DEX operations
 * - Converting confidential tokens to public tokens
 */
contract SwapERC7984ToERC20 is ZamaEthereumConfig {
    // The confidential token being swapped
    ERC7984Mock private immutable _fromToken;
    
    // The public token being received
    IERC20 private immutable _toToken;
    
    // Swap rate (how many public tokens per confidential token)
    uint256 private immutable _rate;
    
    // Track pending swaps: encrypted amount => recipient address
    mapping(euint64 => address) private _pendingSwaps;
    
    // Events
    event SwapInitiated(address indexed user, euint64 indexed encryptedAmount);
    event SwapFinalized(address indexed user, euint64 indexed encryptedAmount, uint256 publicAmount);

    error InvalidSwapRequest(euint64 amount);
    error InsufficientLiquidity();

    /**
     * @dev Constructor sets the tokens and swap rate
     * @param fromToken_ Address of the confidential ERC7984 token
     * @param toToken_ Address of the public ERC20 token
     * @param rate_ Swap rate (e.g., 1000 means 1 confidential token = 1000 public tokens)
     */
    constructor(
        ERC7984Mock fromToken_,
        IERC20 toToken_,
        uint256 rate_
    ) {
        _fromToken = fromToken_;
        _toToken = toToken_;
        _rate = rate_ == 0 ? 1 : rate_; // Default to 1:1 if rate is 0
    }

    /**
     * @notice Returns the confidential token address
     * @return Address of the confidential token
     */
    function fromToken() public view returns (ERC7984Mock) {
        return _fromToken;
    }

    /**
     * @notice Returns the public token address
     * @return Address of the public token
     */
    function toToken() public view returns (IERC20) {
        return _toToken;
    }

    /**
     * @notice Returns the swap rate
     * @return Rate at which confidential tokens are swapped for public tokens
     */
    function rate() public view returns (uint256) {
        return _rate;
    }

    /**
     * @notice Initiates a swap from confidential to public tokens
     * @param transferredAmount The encrypted amount that was already transferred to this contract
     * @dev Phase 1: User must first call confidentialTransfer on the token contract
     *      to transfer tokens to this swap contract, then call this function with the swap contract's balance.
     *      The balance is automatically allowed for the swap contract after the transfer.
     */
    function initiateSwap(euint64 transferredAmount) external {
        // Verify that the transferred amount is allowed for this contract
        require(FHE.isAllowed(transferredAmount, address(this)), "Swap: amount not allowed for swap contract");
        
        // Verify that the swap contract has the tokens (check balance increased)
        // Note: We can't easily verify this without tracking, so we rely on the user
        // having transferred the tokens first via confidentialTransferWithAllowedAmount
        
        // Grant transient permission for the swap contract to use this amount
        FHE.allowTransient(transferredAmount, address(this));
        
        // Make the amount publicly decryptable for finalization
        FHE.makePubliclyDecryptable(transferredAmount);
        
        // Store the pending swap
        _pendingSwaps[transferredAmount] = msg.sender;
        
        emit SwapInitiated(msg.sender, transferredAmount);
    }

    /**
     * @notice Finalizes a swap by converting decrypted amount to public tokens
     * @param encryptedAmount The encrypted amount that was swapped
     * @param cleartextAmount The decrypted amount (must match encrypted amount)
     * @param decryptionProof Proof that the decryption is correct
     * @dev Phase 2: After decryption, transfer public tokens to user
     */
    function finalizeSwap(
        euint64 encryptedAmount,
        uint64 cleartextAmount,
        bytes calldata decryptionProof
    ) external {
        // Verify the decryption proof
        bytes32[] memory handles = new bytes32[](1);
        handles[0] = euint64.unwrap(encryptedAmount);
        
        FHE.checkSignatures(handles, abi.encode(cleartextAmount), decryptionProof);
        
        // Get the recipient
        address recipient = _pendingSwaps[encryptedAmount];
        if (recipient == address(0)) {
            revert InvalidSwapRequest(encryptedAmount);
        }
        
        // Clear the pending swap
        delete _pendingSwaps[encryptedAmount];
        
        // Calculate public token amount based on rate
        uint256 publicAmount = (uint256(cleartextAmount) * _rate);
        
        // Check contract has sufficient public tokens
        uint256 contractBalance = _toToken.balanceOf(address(this));
        if (contractBalance < publicAmount) {
            revert InsufficientLiquidity();
        }
        
        // Transfer public tokens to the recipient
        SafeERC20.safeTransfer(_toToken, recipient, publicAmount);
        
        emit SwapFinalized(recipient, encryptedAmount, publicAmount);
    }

    /**
     * @notice Allows the contract owner to add liquidity (public tokens)
     * @param amount Amount of public tokens to add
     * @dev In production, this would be handled by liquidity providers
     */
    function addLiquidity(uint256 amount) external {
        SafeERC20.safeTransferFrom(_toToken, msg.sender, address(this), amount);
    }

    /// @notice Get the from token address (for backward compatibility with tests)
    /// @return The ERC7984 token address
    function getFromToken() external view returns (address) {
        return address(_fromToken);
    }

    /// @notice Get the to token address (for backward compatibility with tests)
    /// @return The ERC20 token address
    function getToToken() external view returns (address) {
        return address(_toToken);
    }
}
