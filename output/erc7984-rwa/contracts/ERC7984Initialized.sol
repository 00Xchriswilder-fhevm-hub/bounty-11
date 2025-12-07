// SPDX-License-Identifier: MIT
// Based on OpenZeppelin Confidential Contracts ERC7984RwaMock
// Educational version with comprehensive comments

pragma solidity ^0.8.27;

import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {FHE, euint64, externalEuint64, eaddress} from "@fhevm/solidity/lib/FHE.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";
import {ERC7984Rwa} from "@openzeppelin/confidential-contracts/token/ERC7984/extensions/ERC7984Rwa.sol";
import {HandleAccessManager} from "@openzeppelin/confidential-contracts/utils/HandleAccessManager.sol";

/// @notice Intermediate contract to initialize ERC7984
/// @dev This is needed because ERC7984Rwa doesn't call ERC7984 constructor
contract ERC7984Initialized is ERC7984 {
    constructor(string memory name_, string memory symbol_, string memory contractURI_) ERC7984(name_, symbol_, contractURI_) {}
}

/// @title ERC7984 RWA Mock Token
/// @notice Educational implementation of ERC7984 RWA (Real World Assets) confidential token
/// @dev This contract demonstrates:
///      - How to extend ERC7984Rwa for compliant confidential tokens
///      - Compliance features: pause, freeze, block users
///      - Agent role for administrative actions
///      - Force transfers for compliance enforcement
///      - Frozen balances and available balances
/// 
/// @dev Key Concepts:
///      - RWA: Real World Assets - tokens representing real-world assets with compliance requirements
///      - Agent Role: Special role for compliance actions (pause, freeze, block, force transfer)
///      - Frozen Balance: Amount of tokens that cannot be transferred (for compliance)
///      - Available Balance: Unfrozen balance that can be transferred
///      - Pausable: Contract can be paused to halt all transfers
///      - Restricted: Users can be blocked from interacting with the token
/// 
/// @dev Educational Notes:
///      - This extends ERC7984Rwa which includes compliance features
///      - Agents can perform administrative actions without user permission
///      - Force transfers bypass normal compliance checks
///      - Frozen amounts are subtracted from available balance
///      - HandleAccessManager allows agents to manage handle access
///      - Note: Uses ERC7984Initialized to properly initialize ERC7984
contract ERC7984RwaMock is ERC7984Rwa, ERC7984Initialized, HandleAccessManager, ZamaEthereumConfig {
    /// @notice The owner of the contract (for backward compatibility)
    address private immutable _OWNER;

    /// @notice Event emitted when an encrypted amount is created
    event EncryptedAmountCreated(euint64 amount);
    
    /// @notice Event emitted when an encrypted address is created
    event EncryptedAddressCreated(eaddress addr);

    /// @notice Constructor
    /// @param name_ Token name
    /// @param symbol_ Token symbol
    /// @param tokenURI_ Token URI for metadata
    /// @param admin_ Admin address (can grant agent roles)
    /// @dev Initializes both ERC7984Rwa (with admin) and ERC7984Initialized (with name, symbol, URI)
    /// @dev Solidity's C3 linearization resolves the diamond inheritance (both extend ERC7984)
    constructor(
        string memory name_,
        string memory symbol_,
        string memory tokenURI_,
        address admin_
    ) ERC7984Rwa(admin_) ERC7984Initialized(name_, symbol_, tokenURI_) {
        _OWNER = admin_;
    }

    /// @notice Create an encrypted amount from a plain uint64
    /// @param amount The plain amount to encrypt
    /// @return encryptedAmount The encrypted amount (euint64)
    function createEncryptedAmount(uint64 amount) public returns (euint64 encryptedAmount) {
        encryptedAmount = FHE.asEuint64(amount);
        FHE.allowThis(encryptedAmount);
        FHE.allow(encryptedAmount, msg.sender);
        emit EncryptedAmountCreated(encryptedAmount);
    }

    /// @notice Create an encrypted address from a plain address
    /// @param addr The plain address to encrypt
    /// @return The encrypted address (eaddress)
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
    function _update(address from, address to, euint64 amount) internal virtual override(ERC7984, ERC7984Rwa) returns (euint64 transferred) {
        transferred = super._update(from, to, amount);
        // Grant owner access to total supply (for testing/monitoring)
        FHE.allow(confidentialTotalSupply(), _OWNER);
    }

    /// @notice Mint tokens using an external encrypted amount (with input proof)
    /// @param to The address to mint tokens to
    /// @param encryptedAmount The external encrypted amount (from off-chain)
    /// @param inputProof The proof that the encryption is correct
    /// @return transferred The amount actually minted
    /// @dev Uses owner as admin for minting (for testing)
    function $_mint(
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) public returns (euint64 transferred) {
        // Only owner can mint (for testing)
        require(msg.sender == _OWNER, "Only owner can mint");
        euint64 internalAmount = FHE.fromExternal(encryptedAmount, inputProof);
        return _mint(to, internalAmount);
    }

    /// @notice Mint tokens using a plain uint64 amount
    /// @param to The address to mint tokens to
    /// @param amount The plain amount to mint
    /// @return transferred The amount actually minted
    /// @dev Uses owner as admin for minting (for testing)
    function $_mint(address to, uint64 amount) public returns (euint64 transferred) {
        // Only owner can mint (for testing)
        require(msg.sender == _OWNER, "Only owner can mint");
        return _mint(to, FHE.asEuint64(amount));
    }

    /// @notice Transfer tokens using an external encrypted amount (with input proof)
    /// @param from The sender address
    /// @param to The receiver address
    /// @param encryptedAmount The external encrypted amount
    /// @param inputProof The proof that the encryption is correct
    /// @return transferred The amount actually transferred
    function $_transfer(
        address from,
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) public returns (euint64 transferred) {
        euint64 internalAmount = FHE.fromExternal(encryptedAmount, inputProof);
        return _transfer(from, to, internalAmount);
    }

    /// @notice Transfer tokens using a plain uint64 amount
    /// @param from The sender address
    /// @param to The receiver address
    /// @param amount The plain amount to transfer
    /// @return transferred The amount actually transferred
    function $_transfer(address from, address to, uint64 amount) public returns (euint64 transferred) {
        return _transfer(from, to, FHE.asEuint64(amount));
    }

    /// @notice Burn tokens using an external encrypted amount (with input proof)
    /// @param from The address to burn tokens from
    /// @param encryptedAmount The external encrypted amount
    /// @param inputProof The proof that the encryption is correct
    /// @return transferred The amount actually burned
    /// @dev Uses owner as admin for burning (for testing)
    function $_burn(
        address from,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) public returns (euint64 transferred) {
        // Only owner can burn (for testing)
        require(msg.sender == _OWNER, "Only owner can burn");
        euint64 internalAmount = FHE.fromExternal(encryptedAmount, inputProof);
        return _burn(from, internalAmount);
    }

    /// @notice Burn tokens using a plain uint64 amount
    /// @param from The address to burn tokens from
    /// @param amount The plain amount to burn
    /// @return transferred The amount actually burned
    /// @dev Uses owner as admin for burning (for testing)
    function $_burn(address from, uint64 amount) public returns (euint64 transferred) {
        // Only owner can burn (for testing)
        require(msg.sender == _OWNER, "Only owner can burn");
        return _burn(from, FHE.asEuint64(amount));
    }

    /// @notice Check interface support
    /// @param interfaceId The interface ID to check
    /// @return True if the contract supports the interface
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC7984Rwa, ERC7984) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /// @notice Validate handle allowance (required by HandleAccessManager)
    /// @param handle The handle to validate
    /// @dev Only agents can validate handle access
    /// @dev This is called by HandleAccessManager.getHandleAllowance()
    function _validateHandleAllowance(bytes32 handle) internal view override onlyAgent {}

    /// @notice Testing utility: Set frozen balance (plaintext)
    /// @param account Account to freeze balance for
    /// @param amount Plaintext amount to freeze
    /// @dev For testing purposes only - converts plaintext to encrypted
    /// @dev This function should still enforce agent-only access for proper testing
    function $_setConfidentialFrozen(address account, uint64 amount) public virtual onlyAgent {
        _setConfidentialFrozen(account, FHE.asEuint64(amount));
    }
}
