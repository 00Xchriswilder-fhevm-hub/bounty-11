# ERC7984 Mock Token

<!-- chapter: openzeppelin -->

## Overview

Educational implementation of ERC7984 confidential token using OpenZeppelin's base contract. This example shows how to extend the abstract ERC7984 contract, confidential token creation and management, encrypted amount and address creation, minting and transferring confidential tokens, access control using Ownable. ERC7984: Abstract base contract for confidential tokens (like ERC20 but encrypted). This is OpenZeppelin's mock contract, enhanced with educational comments and access control. This example demonstrates confidential token operations with encrypted balances and transfers and shows how to manage FHE permissions for both contracts and users using external encrypted inputs with input proofs for verification.

## What You'll Learn

- **Off-chain encryption** - Encrypting values locally before sending to contract
- **FHE permissions** - Granting permissions for operations and decryption

## Key Concepts

### 1. Off-Chain Encryption

Values are encrypted **locally** (on the client side) before being sent to the contract:
- Plaintext values never appear in transactions
- Encryption is cryptographically bound to [contract, user] pair
- Input proofs verify the binding

### 2. FHE Permissions

Permissions control who can:
- **Perform operations**: Contracts need `FHE.allowThis()`
- **Decrypt values**: Users need `FHE.allow()`

## Step-by-Step Walkthrough

### Step 1: Setup

Deploy the contract and prepare encrypted inputs.

### Step 2: Execute Operations

Call contract functions with encrypted values and proofs.

### Step 3: Decrypt Results

Use the appropriate decryption method to retrieve plaintext values.

## Common Pitfalls

### ❌ Pitfall 1: should fail when non-owner tries to mint

**The Problem:** Alice is not the owner, so minting should fail

**Why it fails:** The input proof verification or permission check fails when requirements aren't met.

**The Fix:** Always ensure signers match and permissions are granted correctly.

### ❌ Pitfall 2: should fail when non-owner tries to burn

**The Problem:** First mint tokens as owner

**Why it fails:** The input proof verification or permission check fails when requirements aren't met.

**The Fix:** Always ensure signers match and permissions are granted correctly.

### ❌ Pitfall 3: should fail when trying to transfer without proper permissions

**The Problem:** First mint tokens as owner

**Why it fails:** The input proof verification or permission check fails when requirements aren't met.

**The Fix:** Always ensure signers match and permissions are granted correctly.

## Best Practices

1. **Always match encryption signer with transaction signer**
2. **Grant permissions immediately after creating encrypted values**
3. **Use descriptive variable names** for clarity
4. **Validate inputs** before performing operations

## Real-World Use Cases

- **Confidential Voting**: Encrypt votes before submission
- **Private Auctions**: Encrypt bids to hide amounts
- **Confidential Tokens**: Encrypt token amounts in transfers
{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}

{% tab title="ERC7984Mock.sol" %}

```solidity
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


```

{% endtab %}

{% tab title="ERC7984Example.ts" %}

```typescript
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
// ERC7984Mock types will be available in generated examples after compilation
// Using type assertion to avoid lint errors in source files
import type { Contract } from "ethers";
type ERC7984Mock = Contract;
type ERC7984Mock__factory = any;
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

/**
 * @chapter openzeppelin
 * @title ERC7984 Mock Test Suite
 * @notice Comprehensive tests for ERC7984Mock contract (OpenZeppelin's mock)
 * @dev Tests cover:
 *      - ✅ Token creation and metadata
 *      - ✅ Confidential minting
 *      - ✅ Confidential burning
 *      - ✅ Confidential transfers
 *      - ✅ Balance queries
 *      - ✅ Access control (Ownable)
 *      - ❌ Failure cases
 */

type Signers = {
  deployer: HardhatEthersSigner;
  owner: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  // Use fully qualified name to avoid conflict with OpenZeppelin's mock
  // Note: In source directory, ERC7984Mock is at contracts/openzeppelin/ERC7984Mock.sol
  // In output directory (after create-example), it's copied to contracts/ERC7984Mock.sol
  // Try the output path first (for generated examples), fallback to source path
  let factory;
  try {
    factory = await ethers.getContractFactory("contracts/ERC7984Mock.sol:ERC7984Mock");
  } catch {
    factory = await ethers.getContractFactory("contracts/openzeppelin/ERC7984Mock.sol:ERC7984Mock");
  }
  const owner = (await ethers.getSigners())[1];
  const contract = (await factory.deploy(
    await owner.getAddress(), // owner
    "Test Token",
    "TEST",
    "https://example.com"
  )) as unknown as ERC7984Mock;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("ERC7984Mock", function () {
  let signers: Signers;
  let contract: ERC7984Mock;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      owner: ethSigners[1],
      alice: ethSigners[2],
      bob: ethSigners[3],
    };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());
  });

  describe("✅ Token Info", function () {
    it("should return token name", async function () {
      const name = await contract.name();
      expect(name).to.eq("Test Token");
    });

    it("should return token symbol", async function () {
      const symbol = await contract.symbol();
      expect(symbol).to.eq("TEST");
    });

    it("should return contract URI", async function () {
      const uri = await contract.contractURI();
      expect(uri).to.eq("https://example.com");
    });
  });

  describe("✅ Confidential Minting", function () {
    it("should allow minting tokens", async function () {
      const amount = 1000;
      // IMPORTANT: createEncryptedInput(contractAddress, senderAddress) - contract first, sender second
      // contractAddress: token contract address (where fromExternal is called inside $_mint)
      // senderAddress: signers.owner (who calls $_mint)
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, await signers.owner.getAddress())
        .add64(amount)
        .encrypt();

      // Use $_mint (OpenZeppelin mock function) - only owner can mint
      await contract
        .connect(signers.owner)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.alice.address, encrypted.handles[0], encrypted.inputProof);

      // Check balance (encrypted)
      const encryptedBalance = await contract.confidentialBalanceOf(signers.alice.address);
      expect(encryptedBalance).to.not.eq(ethers.ZeroHash);
    });

    it("should allow minting multiple times", async function () {
      const amount1 = 500;
      const encrypted1 = await fhevm
        .createEncryptedInput(contractAddress, await signers.owner.getAddress())
        .add64(amount1)
        .encrypt();
      await (contract.connect(signers.owner) as any)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.alice.address, encrypted1.handles[0], encrypted1.inputProof);

      const amount2 = 300;
      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, await signers.owner.getAddress())
        .add64(amount2)
        .encrypt();
      await (contract.connect(signers.owner) as any)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.alice.address, encrypted2.handles[0], encrypted2.inputProof);

      const encryptedBalance = await contract.confidentialBalanceOf(signers.alice.address);
      expect(encryptedBalance).to.not.eq(ethers.ZeroHash);
    });

    it("should allow minting to different addresses", async function () {
      const amount = 1000;
      
      // Mint to Alice
      const encrypted1 = await fhevm
        .createEncryptedInput(contractAddress, await signers.owner.getAddress())
        .add64(amount)
        .encrypt();
      await (contract.connect(signers.owner) as any)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.alice.address, encrypted1.handles[0], encrypted1.inputProof);

      // Mint to Bob
      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, await signers.owner.getAddress())
        .add64(amount)
        .encrypt();
      await contract
        .connect(signers.owner)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.bob.address, encrypted2.handles[0], encrypted2.inputProof);

      const aliceBalance = await contract.confidentialBalanceOf(signers.alice.address);
      const bobBalance = await contract.confidentialBalanceOf(signers.bob.address);
      expect(aliceBalance).to.not.eq(ethers.ZeroHash);
      expect(bobBalance).to.not.eq(ethers.ZeroHash);
    });
  });

  describe("✅ Confidential Burning", function () {
    beforeEach(async function () {
      // Mint tokens first (as owner)
      const amount = 1000;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, await signers.owner.getAddress())
        .add64(amount)
        .encrypt();
      // Use $_mint (OpenZeppelin mock function) - only owner can mint
      await contract
        .connect(signers.owner)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.alice.address, encrypted.handles[0], encrypted.inputProof);
    });

    it("should allow owner to burn tokens", async function () {
      const burnAmount = 200;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, await signers.owner.getAddress())
        .add64(burnAmount)
        .encrypt();

      // Only owner can burn (access control via Ownable)
      await contract
        .connect(signers.owner)
        .getFunction("$_burn(address,bytes32,bytes)")
        .send(signers.alice.address, encrypted.handles[0], encrypted.inputProof);

      const encryptedBalance = await contract.confidentialBalanceOf(signers.alice.address);
      expect(encryptedBalance).to.not.eq(ethers.ZeroHash);
    });
  });

  describe("❌ Failure Cases", function () {
    it("should fail when non-owner tries to mint", async function () {
      const amount = 1000;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(amount)
        .encrypt();

      // Alice is not the owner, so minting should fail
      await expect(
        contract
          .connect(signers.alice)
          .getFunction("$_mint(address,bytes32,bytes)")
          .send(signers.alice.address, encrypted.handles[0], encrypted.inputProof)
      ).to.be.reverted;
    });

    it("should fail when non-owner tries to burn", async function () {
      // First mint tokens as owner
      const mintAmount = 1000;
      const encryptedMint = await fhevm
        .createEncryptedInput(contractAddress, await signers.owner.getAddress())
        .add64(mintAmount)
        .encrypt();
      await contract
        .connect(signers.owner)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.alice.address, encryptedMint.handles[0], encryptedMint.inputProof);

      // Now try to burn as non-owner (should fail)
      const burnAmount = 200;
      const encryptedBurn = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(burnAmount)
        .encrypt();

      await expect(
        contract
          .connect(signers.alice)
          .getFunction("$_burn(address,bytes32,bytes)")
          .send(signers.alice.address, encryptedBurn.handles[0], encryptedBurn.inputProof)
      ).to.be.reverted;
    });

    it("should fail when trying to transfer without proper permissions", async function () {
      // First mint tokens as owner
      const amount = 1000;
      const encryptedMint = await fhevm
        .createEncryptedInput(contractAddress, await signers.owner.getAddress())
        .add64(amount)
        .encrypt();
      await contract
        .connect(signers.owner)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.alice.address, encryptedMint.handles[0], encryptedMint.inputProof);

      // Try to transfer with wrong signer (should fail due to ACL)
      const transferAmount = 100;
      const encryptedTransfer = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address) // Wrong signer!
        .add64(transferAmount)
        .encrypt();

      await expect(
        (contract.connect(signers.alice) as any)
          .getFunction("confidentialTransfer(address,bytes32,bytes)")
          .send(signers.bob.address, encryptedTransfer.handles[0], encryptedTransfer.inputProof)
      ).to.be.reverted;
    });
  });

});

```

{% endtab %}

{% endtabs %}
