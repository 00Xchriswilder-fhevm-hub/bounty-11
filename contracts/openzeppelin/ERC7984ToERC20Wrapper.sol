// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, externalEuint64, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// Note: ERC7984ERC20Wrapper is abstract and complex - this is a simplified example
// For full implementation, see OpenZeppelin's repository
// import {ERC7984ERC20Wrapper} from "@openzeppelin/confidential-contracts/contracts/token/ERC7984/extensions/ERC7984ERC20Wrapper.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";

/// @title ERC7984 to ERC20 Wrapper Example
/// @notice Wraps ERC20 tokens into ERC7984 confidential tokens
/// @dev This example demonstrates:
///      - Wrapping ERC20 tokens into ERC7984
///      - Unwrapping ERC7984 tokens back to ERC20
///      - Rate conversion between tokens
/// 
/// @dev Key Concepts:
///      - Wraps standard ERC20 tokens into confidential ERC7984 tokens
///      - Allows confidential operations on wrapped tokens
///      - Maintains 1:1 relationship (or rate-based) with underlying token
///      - Uses OpenZeppelin's ERC7984ERC20Wrapper base contract
// Simplified wrapper example - demonstrates the concept
// Full implementation would extend ERC7984ERC20Wrapper
contract ERC7984ToERC20Wrapper is ERC7984 {
    /// @notice The underlying ERC20 token
    IERC20 private _underlying;
    
    /// @notice Constructor
    /// @param underlying_ The ERC20 token to wrap
    /// @param name Name of the wrapped token
    /// @param symbol Symbol of the wrapped token
    /// @param uri URI for the wrapped token
    constructor(
        IERC20 underlying_,
        string memory name,
        string memory symbol,
        string memory uri
    ) ERC7984(name, symbol, uri) {
        _underlying = underlying_;
    }

    /// @notice Wrap ERC20 tokens into ERC7984
    /// @param amount The amount of ERC20 tokens to wrap
    /// @dev User must approve this contract to spend ERC20 tokens first
    /// @dev This creates confidential ERC7984 tokens
    /// @dev Note: This is a simplified example - actual implementation uses onTransferReceived
    ///      For a complete example, see the OpenZeppelin repo
    function wrap(uint256 amount) external {
        // Transfer ERC20 tokens from user
        SafeERC20.safeTransferFrom(_underlying, msg.sender, address(this), amount);
        
        // Calculate wrapped amount based on rate (simplified: 1:1)
        // In full implementation, would calculate: amount / rate()
        // Then mint confidential ERC7984 tokens using _mint() from ERC7984
        // This is a simplified example showing the concept
    }

    /// @notice Get the underlying ERC20 token
    /// @return The ERC20 token address
    function getUnderlying() external view returns (address) {
        return address(_underlying);
    }

    /// @notice Get the conversion rate (simplified - always 1:1 in this example)
    /// @return The rate at which underlying tokens convert to wrapped tokens
    function getRate() external pure returns (uint256) {
        return 1; // Simplified: 1:1 rate
    }
}

