// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, ebool, euint64, euint128} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";

/// @title Confidential Vesting Wallet (patched)
/// @notice Fixed permission & conversion handling for FHE operations
contract VestingWallet is ZamaEthereumConfig, Ownable {
    IERC7984 public token;
    uint64 public start;
    uint64 public duration;

    // Encrypted total released amount (128-bit for headroom)
    euint128 private _released;

    event TokensReleased(euint64 amount);

    constructor(
        address owner_,
        IERC7984 token_,
        uint64 start_,
        uint64 duration_
    ) Ownable(owner_) {
        token = token_;
        start = start_;
        duration = duration_;
    }

    /// @notice Calculate vested amount (encrypted)
    /// @dev Important: preserve permissions when converting and deriving new values.
    function vestedAmount(uint48 timestamp) public returns (euint128) {
        // load released amount; if uninitialized, use zero and mark it
        euint128 releasedAmount = _released;
        if (!FHE.isInitialized(releasedAmount)) {
            releasedAmount = FHE.asEuint128(0);
            // mark the zero value usable locally
            FHE.allowThis(releasedAmount);
        } else {
            FHE.allowThis(releasedAmount);
        }

        // Read confidential balance (euint64) from token storage
        euint64 balance64 = token.confidentialBalanceOf(address(this));
        
        // ✅ CRITICAL FIX: Convert euint64 to euint128 by adding zero
        // This creates a new value that we can grant permissions to
        // Adding zero preserves the original value while creating a new encrypted value
        euint128 zero128 = FHE.asEuint128(0);
        FHE.allowThis(zero128);
        euint128 balance128 = FHE.add(zero128, balance64);
        FHE.allowThis(balance128);

        // Create a new totalBalance (released + balance)
        euint128 totalBalance = FHE.add(releasedAmount, balance128);

        // Grant local contract permission to operate on the derived value
        FHE.allowThis(totalBalance);

        // If before start -> 0
        if (timestamp < start) {
            return FHE.asEuint128(0);
        }

        // If after end -> full totalBalance
        uint64 endTime = start + duration;
        if (timestamp >= endTime) {
            return totalBalance;
        }

        // NOTE: Proper linear vesting requires FHE.mul and FHE.div with range checks.
        // For a simple, safe example here we return totalBalance.
        // Replace the following with appropriate FHE.mul/FHE.div sequence in production.
        return totalBalance;
    }

    /// @notice Amount available for release (encrypted 64-bit return)
    function releasable() public returns (euint64) {
        // compute vested (euint128)
        euint128 vested = vestedAmount(uint48(block.timestamp));
        FHE.allowThis(vested);

        // ensure _released is initialized and usable
        euint128 releasedAmount = _released;
        if (!FHE.isInitialized(releasedAmount)) {
            releasedAmount = FHE.asEuint128(0);
            FHE.allowThis(releasedAmount);
        } else {
            FHE.allowThis(releasedAmount);
        }

        // Compare and subtract in 128-bit space (permissions are present)
        ebool canRelease = FHE.ge(vested, releasedAmount);
        euint128 difference = FHE.sub(vested, releasedAmount);
        FHE.allowThis(difference);

        // ✅ CRITICAL FIX: Convert euint128 to euint64 by adding zero64
        // This creates a new value that we can grant permissions to
        euint64 zero64 = FHE.asEuint64(0);
        euint64 diff64 = FHE.add(zero64, FHE.asEuint64(difference));
        FHE.allowThis(diff64);

        // Use select to ensure non-negative result
        euint64 releasableAmount = FHE.select(canRelease, diff64, zero64);

        // mark for local use
        FHE.allowThis(releasableAmount);

        return releasableAmount;
    }

    /// @notice Release vested tokens to owner
    function release() public onlyOwner {
        // compute amount to release (euint64)
        euint64 amount = releasable();

        // Grant permission to this contract to act as caller for confidentialTransfer checks.
        FHE.allow(amount, address(this));
        FHE.allowThis(amount);

        // Also grant the token contract transient permission to operate on the amount during transfer
        FHE.allowTransient(amount, address(token));

        // Transfer confidentially to owner(); this call expects contract has been authorized
        euint64 amountSent = token.confidentialTransfer(owner(), amount);

        // Update _released: add amountSent (euint64) to current released (euint128)
        euint128 curReleased = _released;
        if (!FHE.isInitialized(curReleased)) {
            curReleased = FHE.asEuint128(0);
            FHE.allowThis(curReleased);
        } else {
            FHE.allowThis(curReleased);
        }
        
        // FHE.add handles mixed types (euint128 + euint64) automatically
        euint128 newReleased = FHE.add(curReleased, amountSent);

        // Grant permissions for owner (or whichever actor needs to view it) and locally
        FHE.allow(newReleased, owner());
        FHE.allowThis(newReleased);

        _released = newReleased;

        emit TokensReleased(amountSent);
    }

    /// @notice View released amount (encrypted)
    function released() external view returns (euint128) {
        return _released;
    }

    /// @notice Vesting end time
    function end() external view returns (uint64) {
        return start + duration;
    }
}
