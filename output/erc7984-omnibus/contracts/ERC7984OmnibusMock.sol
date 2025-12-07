// SPDX-License-Identifier: MIT
// Based on OpenZeppelin Confidential Contracts ERC7984Omnibus
// Educational version with comprehensive comments

pragma solidity ^0.8.27;

import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {FHE, eaddress, euint64, externalEuint64, externalEaddress} from "@fhevm/solidity/lib/FHE.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";
import {ERC7984Omnibus} from "@openzeppelin/confidential-contracts/token/ERC7984/extensions/ERC7984Omnibus.sol";

/// @title ERC7984 Omnibus Mock Token
/// @notice Educational implementation of ERC7984Omnibus for omnibus transfers
/// @dev This contract demonstrates:
///      - How to extend ERC7984Omnibus for omnibus transfers
///      - Confidential transfers with encrypted sender/recipient addresses
///      - Omnibus pattern: onchain settlement between omnibus accounts
///      - Sub-account tracking (off-chain)
///      - Event emission for omnibus transfers
/// 
/// @dev Key Concepts:
///      - Omnibus: A pattern where multiple sub-accounts are tracked off-chain
///      - Onchain settlement occurs between omnibus accounts (omnibusFrom, omnibusTo)
///      - Sub-account sender/recipient are encrypted in events
///      - No onchain accounting for sub-accounts (tracked externally)
///      - OmnibusConfidentialTransfer event contains encrypted addresses
/// 
/// @dev Educational Notes:
///      - Omnibus pattern is useful for exchanges, custodians, or intermediaries
///      - Sub-accounts (sender/recipient) are encrypted for privacy
///      - Omnibus accounts (omnibusFrom/omnibusTo) are public addresses
///      - Events allow off-chain tracking of sub-account balances
///      - ACL permissions are automatically granted to omnibus accounts
contract ERC7984OmnibusMock is ERC7984Omnibus, ZamaEthereumConfig, Ownable {
    /// @notice The owner of the contract (for backward compatibility)
    address private immutable _OWNER;

    /// @notice Event emitted when an encrypted amount is created
    event EncryptedAmountCreated(euint64 amount);
    
    /// @notice Event emitted when an encrypted address is created
    event EncryptedAddressCreated(eaddress addr);

    /// @notice Constructor
    /// @param owner_ The owner address (can mint/burn)
    /// @param name_ Token name
    /// @param symbol_ Token symbol
    /// @param tokenURI_ Token URI for metadata
    /// @dev Initializes the ERC7984 base contract with name, symbol, and URI
    /// @dev Also initializes Ownable with the owner address
    constructor(
        address owner_,
        string memory name_,
        string memory symbol_,
        string memory tokenURI_
    ) ERC7984(name_, symbol_, tokenURI_) Ownable(owner_) {
        _OWNER = owner_;
    }

    /// @notice Create an encrypted amount from a plain uint64
    /// @param amount The plain amount to encrypt
    /// @return encryptedAmount The encrypted amount (euint64)
    /// @dev Educational: Demonstrates how to create encrypted values
    function createEncryptedAmount(uint64 amount) public returns (euint64 encryptedAmount) {
        encryptedAmount = FHE.asEuint64(amount);
        FHE.allowThis(encryptedAmount);
        FHE.allow(encryptedAmount, msg.sender);
        emit EncryptedAmountCreated(encryptedAmount);
    }

    /// @notice Create an encrypted address from a plain address
    /// @param addr The plain address to encrypt
    /// @return The encrypted address (eaddress)
    /// @dev Educational: Demonstrates encrypted address creation for omnibus transfers
    function createEncryptedAddress(address addr) public returns (eaddress) {
        eaddress encryptedAddr = FHE.asEaddress(addr);
        FHE.allowThis(encryptedAddr);
        FHE.allow(encryptedAddr, msg.sender);
        emit EncryptedAddressCreated(encryptedAddr);
        return encryptedAddr;
    }

    /// @notice Internal function called when tokens are transferred
    /// @param from The sender address
    /// @param to The receiver address
    /// @param amount The encrypted amount being transferred
    /// @return transferred The actual amount transferred
    /// @dev Educational: Overrides ERC7984's _update to add owner access to total supply
    function _update(address from, address to, euint64 amount) internal virtual override returns (euint64 transferred) {
        transferred = super._update(from, to, amount);
        FHE.allow(confidentialTotalSupply(), _OWNER);
    }

    /// @notice Mint tokens using an external encrypted amount (with input proof)
    /// @param to The address to mint tokens to
    /// @param encryptedAmount The external encrypted amount (from off-chain)
    /// @param inputProof The proof that the encryption is correct
    /// @return transferred The amount actually minted
    /// @dev Educational: Demonstrates minting with external encrypted inputs
    /// @dev onlyOwner: Access control - only owner can mint
    /// @dev ✅ DO: Always provide input proofs for external encrypted values
    function $_mint(
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) public onlyOwner returns (euint64 transferred) {
        // Convert external encrypted amount to internal format
        euint64 internalAmount = FHE.fromExternal(encryptedAmount, inputProof);
        
        // Mint using ERC7984's internal _mint function
        return _mint(to, internalAmount);
    }

    /// @notice Mint tokens using a plain uint64 amount
    /// @param to The address to mint tokens to
    /// @param amount The plain amount to mint
    /// @return transferred The amount actually minted
    /// @dev Educational: Simpler minting function for testing
    /// @dev onlyOwner: Access control - only owner can mint
    /// @dev ✅ DO: Use this for testing, use $_mint() for production with external encryption
    function $_mint(address to, uint64 amount) public onlyOwner returns (euint64 transferred) {
        return _mint(to, FHE.asEuint64(amount));
    }

    /// @notice Transfer tokens using a plain uint64 amount
    /// @param from The sender address
    /// @param to The receiver address
    /// @param amount The plain amount to transfer
    /// @return transferred The amount actually transferred
    /// @dev Educational: Simpler transfer function for testing
    function $_transfer(address from, address to, uint64 amount) public returns (euint64 transferred) {
        return _transfer(from, to, FHE.asEuint64(amount));
    }

    /// @notice Burn tokens using a plain uint64 amount
    /// @param from The address to burn tokens from
    /// @param amount The plain amount to burn
    /// @return transferred The amount actually burned
    /// @dev Educational: Simpler burn function for testing
    /// @dev onlyOwner: Access control - only owner can burn
    function $_burn(address from, uint64 amount) public onlyOwner returns (euint64 transferred) {
        return _burn(from, FHE.asEuint64(amount));
    }
}

