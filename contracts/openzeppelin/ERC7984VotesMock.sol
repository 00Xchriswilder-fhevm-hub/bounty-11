// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";
import {ERC7984Mock} from "./ERC7984Mock.sol";
import {ERC7984Votes} from "@openzeppelin/confidential-contracts/token/ERC7984/extensions/ERC7984Votes.sol";

/**
 * @title ERC7984VotesMock
 * @notice Mock implementation of ERC7984Votes for testing confidential voting
 * @dev This contract extends ERC7984Mock and ERC7984Votes to provide confidential voting power tracking
 *      and delegation capabilities. It demonstrates how confidential governance works.
 * 
 * Key features:
 * - Confidential voting power based on token balance
 * - Vote delegation (to self or others)
 * - Historical vote tracking via checkpoints
 * - EIP-712 signature-based delegation
 * 
 * @dev Educational Notes:
 * - Voting power is automatically tracked when tokens are minted, burned, or transferred
 * - Users must delegate to themselves or others to activate voting power
 * - All voting power values are encrypted (euint64) for privacy
 */
contract ERC7984VotesMock is ERC7984Mock, ERC7984Votes {
    uint48 private _clockOverrideVal;

    /**
     * @dev Constructor that initializes the ERC7984 token with voting capabilities
     * @param owner_ The address that will own this contract
     * @param name_ The name of the token
     * @param symbol_ The symbol of the token
     * @param tokenURI_ The base URI for token metadata
     */
    constructor(
        address owner_,
        string memory name_,
        string memory symbol_,
        string memory tokenURI_
    ) ERC7984Mock(owner_, name_, symbol_, tokenURI_) EIP712(name_, "1.0.0") {
        // Constructor automatically initializes voting capabilities via ERC7984Votes
    }

    /**
     * @dev Override clock for testing purposes
     */
    function clock() public view virtual override returns (uint48) {
        if (_clockOverrideVal != 0) {
            return _clockOverrideVal;
        }
        return super.clock();
    }

    /**
     * @dev Override confidentialTotalSupply to satisfy both parent contracts
     */
    function confidentialTotalSupply() public view virtual override(ERC7984, ERC7984Votes) returns (euint64) {
        return super.confidentialTotalSupply();
    }

    /**
     * @dev Override _update to handle voting power tracking
     */
    function _update(
        address from,
        address to,
        euint64 amount
    ) internal virtual override(ERC7984Mock, ERC7984Votes) returns (euint64) {
        return super._update(from, to, amount);
    }

    /**
     * @dev Set clock override for testing (internal helper)
     */
    function _setClockOverride(uint48 val) external {
        _clockOverrideVal = val;
    }

    /**
     * @dev Override handle access validation (required by HandleAccessManager)
     */
    function _validateHandleAllowance(bytes32) internal view override {}
}

