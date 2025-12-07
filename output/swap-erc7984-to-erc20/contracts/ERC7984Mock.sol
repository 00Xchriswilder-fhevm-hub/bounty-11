// SPDX-License-Identifier: MIT
// Based on OpenZeppelin Confidential Contracts ERC7984Mock
// Educational version with comprehensive comments

pragma solidity ^0.8.27;

import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {FHE, eaddress, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";

/// @title ERC7984 Mock Token
/// @notice Educational implementation of ERC7984 confidential token using OpenZeppelin's base contract
/// @dev This contract demonstrates:
///      - How to extend the abstract ERC7984 contract
///      - Confidential token creation and management
///      - Encrypted amount and address creation
///      - Minting and transferring confidential tokens
///      - Access control using Ownable
/// 
/// @dev Key Concepts:
///      - ERC7984: Abstract base contract for confidential tokens (like ERC20 but encrypted)
///      - All balances are encrypted (euint64)
///      - Transfers are confidential (amounts not revealed)
///      - Uses FHE (Fully Homomorphic Encryption) for privacy
///      - Ownable: Access control pattern from OpenZeppelin
/// 
/// @dev Educational Notes:
///      - This is OpenZeppelin's mock contract, enhanced with educational comments and access control
///      - The $_ prefix on functions indicates they're testing utilities
///      - For production, create your own implementation extending ERC7984
///      - See OpenZeppelin's documentation for full ERC7984 standard details
contract ERC7984Mock is ERC7984, ZamaEthereumConfig, Ownable {
    /// @notice The owner of the contract (for backward compatibility with original mock)
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
    ///      - FHE.asEuint64() converts plain uint64 to encrypted euint64
    ///      - FHE.allowThis() grants the contract permission to use the value
    ///      - FHE.allow() grants the caller permission to decrypt/use the value
    /// @dev ✅ DO: Always use allowThis() and allow() when creating encrypted values
    function createEncryptedAmount(uint64 amount) public returns (euint64 encryptedAmount) {
        // Convert plain amount to encrypted
        encryptedAmount = FHE.asEuint64(amount);
        
        // Grant contract permission to use this encrypted value
        FHE.allowThis(encryptedAmount);
        
        // Grant caller permission to use this encrypted value
        FHE.allow(encryptedAmount, msg.sender);

        emit EncryptedAmountCreated(encryptedAmount);
    }

    /// @notice Create an encrypted address from a plain address
    /// @param addr The plain address to encrypt
    /// @return The encrypted address (eaddress)
    /// @dev Educational: Demonstrates encrypted address creation
    ///      - Useful for privacy-preserving transfers
    ///      - Similar pattern to encrypted amounts
    function createEncryptedAddress(address addr) public returns (eaddress) {
        // Convert plain address to encrypted
        eaddress encryptedAddr = FHE.asEaddress(addr);
        
        // Grant permissions
        FHE.allowThis(encryptedAddr);
        FHE.allow(encryptedAddr, msg.sender);

        emit EncryptedAddressCreated(encryptedAddr);
        return encryptedAddr;
    }

    /// @notice Internal function called when tokens are transferred
    /// @param from The sender address
    /// @param to The receiver address
    /// @param amount The encrypted amount being transferred
    /// @return transferred The actual amount transferred (may differ due to fees, etc.)
    /// @dev Educational: Overrides ERC7984's _update to add owner access to total supply
    ///      - This allows the owner to query the total supply
    ///      - Called automatically on mint, burn, and transfer
    function _update(address from, address to, euint64 amount) internal virtual override returns (euint64 transferred) {
        // Call parent implementation
        transferred = super._update(from, to, amount);
        
        // Grant owner access to total supply (for testing/monitoring)
        FHE.allow(confidentialTotalSupply(), _OWNER);
    }

    /// @notice Mint tokens using an external encrypted amount (with input proof)
    /// @param to The address to mint tokens to
    /// @param encryptedAmount The external encrypted amount (from off-chain)
    /// @param inputProof The proof that the encryption is correct
    /// @return transferred The amount actually minted
    /// @dev Educational: Demonstrates minting with external encrypted inputs
    ///      - externalEuint64: Encrypted value from off-chain (client-side encryption)
    ///      - inputProof: Zero-knowledge proof that encryption is correct
    ///      - FHE.fromExternal(): Converts external encrypted value to internal format
    ///      - _mint(): Internal ERC7984 function to mint tokens
    ///      - onlyOwner: Access control - only owner can mint
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
    ///      - Converts plain uint64 to encrypted euint64
    ///      - Useful for tests where you don't need external encryption
    ///      - onlyOwner: Access control - only owner can mint
    /// @dev ✅ DO: Use this for testing, use $_mint() for production with external encryption
    function $_mint(address to, uint64 amount) public onlyOwner returns (euint64 transferred) {
        // Convert plain amount to encrypted and mint
        return _mint(to, FHE.asEuint64(amount));
    }

    /// @notice Transfer tokens using an external encrypted amount (with input proof)
    /// @param from The sender address
    /// @param to The receiver address
    /// @param encryptedAmount The external encrypted amount
    /// @param inputProof The proof that the encryption is correct
    /// @return transferred The amount actually transferred
    /// @dev Educational: Demonstrates confidential transfers with external encryption
    ///      - Similar pattern to $_mint() but for transfers
    ///      - Requires proper permissions (FHE.allow/allowThis)
    /// @dev ✅ DO: Always provide input proofs for external encrypted values
    function $_transfer(
        address from,
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) public returns (euint64 transferred) {
        // Convert external encrypted amount to internal format
        euint64 internalAmount = FHE.fromExternal(encryptedAmount, inputProof);
        
        // Transfer using ERC7984's internal _transfer function
        return _transfer(from, to, internalAmount);
    }

    /// @notice Transfer tokens using a plain uint64 amount
    /// @param from The sender address
    /// @param to The receiver address
    /// @param amount The plain amount to transfer
    /// @return transferred The amount actually transferred
    /// @dev Educational: Simpler transfer function for testing
    ///      - Converts plain uint64 to encrypted euint64
    ///      - Useful for tests where you don't need external encryption
    function $_transfer(address from, address to, uint64 amount) public returns (euint64 transferred) {
        // Convert plain amount to encrypted and transfer
        return _transfer(from, to, FHE.asEuint64(amount));
    }

    /// @notice Burn tokens using an external encrypted amount (with input proof)
    /// @param from The address to burn tokens from
    /// @param encryptedAmount The external encrypted amount
    /// @param inputProof The proof that the encryption is correct
    /// @return transferred The amount actually burned
    /// @dev Educational: Demonstrates burning tokens with external encryption
    ///      - Similar pattern to $_mint() and $_transfer()
    ///      - onlyOwner: Access control - only owner can burn
    /// @dev ✅ DO: Always provide input proofs for external encrypted values
    function $_burn(
        address from,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) public onlyOwner returns (euint64 transferred) {
        // Convert external encrypted amount to internal format
        euint64 internalAmount = FHE.fromExternal(encryptedAmount, inputProof);
        
        // Burn using ERC7984's internal _burn function
        return _burn(from, internalAmount);
    }

    /// @notice Burn tokens using a plain uint64 amount
    /// @param from The address to burn tokens from
    /// @param amount The plain amount to burn
    /// @return transferred The amount actually burned
    /// @dev Educational: Simpler burn function for testing
    ///      - onlyOwner: Access control - only owner can burn
    function $_burn(address from, uint64 amount) public onlyOwner returns (euint64 transferred) {
        // Convert plain amount to encrypted and burn
        return _burn(from, FHE.asEuint64(amount));
    }
}

