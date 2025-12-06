# ERC7984 Omnibus

<!-- chapter: openzeppelin -->

## Overview

This example shows how to extend ERC7984Omnibus for omnibus transfers, confidential transfers with encrypted sender/recipient addresses, omnibus pattern: onchain settlement between omnibus accounts, sub-account tracking (off-chain), event emission for omnibus transfers. Omnibus: A pattern where multiple sub-accounts are tracked off-chain. Omnibus pattern is useful for exchanges, custodians, or intermediaries. This example demonstrates the omnibus pattern for confidential token transfers with encrypted sub-account addresses and shows how to manage FHE permissions for both contracts and users using external encrypted inputs with input proofs for verification.

## What You'll Learn

- **Off-chain encryption** - Encrypting values locally before sending to contract
- **FHE permissions** - Granting permissions for operations and decryption
- **Omnibus pattern** - Onchain settlement between omnibus accounts with off-chain sub-account tracking
- **Encrypted addresses** - Encrypting sub-account sender and recipient addresses for privacy
- **OmnibusConfidentialTransfer events** - Event emission with encrypted addresses for off-chain tracking

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

### 3. Omnibus Pattern

The omnibus pattern is useful for exchanges, custodians, or intermediaries where:
- **Multiple sub-accounts** are tracked off-chain (not stored on-chain)
- **Onchain settlement** occurs between omnibus accounts (omnibusFrom, omnibusTo)
- **Sub-account addresses** (sender/recipient) are encrypted in events for privacy
- **Omnibus accounts** (omnibusFrom/omnibusTo) are public addresses
- **ACL permissions** are automatically granted to omnibus accounts
- **Events** (OmnibusConfidentialTransfer) allow off-chain tracking of sub-account balances

### 4. Encrypted Addresses in Omnibus Transfers

In omnibus transfers, both the amount and the sub-account addresses are encrypted:
- **Encrypted sender address**: The sub-account sending tokens (encrypted for privacy)
- **Encrypted recipient address**: The sub-account receiving tokens (encrypted for privacy)
- **Encrypted amount**: The amount being transferred (standard FHE encryption)
- All three values are created in a single encrypted input and share the same input proof
- The `OmnibusConfidentialTransfer` event contains these encrypted addresses for off-chain tracking

## Step-by-Step Walkthrough

### Step 1: Mint Tokens to Omnibus Account

First, mint tokens to the omnibus account (omnibusFrom) that will handle the transfers. Use `$_mint()` to mint tokens to the omnibus account.

### Step 2: Create Encrypted Values for Omnibus Transfer

Create all encrypted values in a single encrypted input:
- Encrypt the sender sub-account address using `.addAddress(senderAddress)`
- Encrypt the recipient sub-account address using `.addAddress(recipientAddress)`
- Encrypt the transfer amount using `.add64(amount)`
- All three values share the same input proof when created together

### Step 3: Perform Omnibus Transfer

Call `confidentialTransferOmnibus()` or `confidentialTransferFromOmnibus()` with:
- The omnibusTo address (public address)
- The encrypted sender address (first handle)
- The encrypted recipient address (second handle)
- The encrypted amount (third handle)
- The shared input proof

### Step 4: Track Sub-Account Balances Off-Chain

Listen for `OmnibusConfidentialTransfer` events to track sub-account balances off-chain. The event contains encrypted addresses and amounts for your accounting system.

## Common Pitfalls

### ❌ Pitfall 1: should fail when non-owner tries to mint

**The Problem:** const amount = 1000;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(a...

**Why it fails:** The operation fails due to incorrect usage, permissions, or signer mismatch.

**The Fix:** Ensure proper setup, matching signers, and correct permissions.

### ❌ Pitfall 2: should fail when trying omnibus transfer without proper permissions

**The Problem:** Wrong signer!

**Why it fails:** The operation fails due to incorrect usage, permissions, or signer mismatch.

**The Fix:** Ensure proper setup, matching signers, and correct permissions.

## Best Practices

1. **Always match encryption signer with transaction signer**
2. **Grant permissions immediately after creating encrypted values**
3. **Use descriptive variable names** for clarity
4. **Validate inputs** before performing operations

## Real-World Use Cases

- **Exchange Custody**: Exchanges can track user balances off-chain while settling on-chain between omnibus accounts
- **Custodial Services**: Custodians can manage multiple client accounts privately with encrypted sub-account tracking
- **Intermediary Services**: Payment processors can handle transfers between sub-accounts without revealing individual account details
- **Privacy-Preserving Ledgers**: Maintain confidential sub-account balances while providing on-chain settlement guarantees
{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}

{% tab title="ERC7984OmnibusMock.sol" %}

```solidity
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


```

{% endtab %}

{% tab title="ERC7984OmnibusExample.ts" %}

```typescript
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import type { Contract } from "ethers";
type ERC7984OmnibusMock = Contract;
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

/**
 * @chapter openzeppelin
 * @title ERC7984 Omnibus Mock Test Suite
 * @notice Comprehensive tests for ERC7984OmnibusMock contract
 * @dev Tests cover:
 *      - ✅ Token creation and metadata
 *      - ✅ Confidential minting
 *      - ✅ Omnibus transfers with encrypted addresses
 *      - ✅ OmnibusConfidentialTransfer events
 *      - ✅ Sub-account tracking (off-chain)
 *      - ✅ Balance queries
 *      - ❌ Failure cases
 */

type Signers = {
  deployer: HardhatEthersSigner;
  owner: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  omnibusFrom: HardhatEthersSigner;
  omnibusTo: HardhatEthersSigner;
};

async function deployFixture() {
  let factory;
  try {
    factory = await ethers.getContractFactory("contracts/ERC7984OmnibusMock.sol:ERC7984OmnibusMock");
  } catch {
    factory = await ethers.getContractFactory("contracts/openzeppelin/ERC7984OmnibusMock.sol:ERC7984OmnibusMock");
  }
  const owner = (await ethers.getSigners())[1];
  const contract = (await factory.deploy(
    await owner.getAddress(), // owner
    "Omnibus Token",
    "OMNI",
    "https://example.com/omnibus"
  )) as unknown as ERC7984OmnibusMock;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("ERC7984OmnibusMock", function () {
  let signers: Signers;
  let contract: ERC7984OmnibusMock;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      owner: ethSigners[1],
      alice: ethSigners[2],
      bob: ethSigners[3],
      omnibusFrom: ethSigners[4],
      omnibusTo: ethSigners[5],
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
      expect(name).to.eq("Omnibus Token");
    });

    it("should return token symbol", async function () {
      const symbol = await contract.symbol();
      expect(symbol).to.eq("OMNI");
    });

    it("should return contract URI", async function () {
      const uri = await contract.contractURI();
      expect(uri).to.eq("https://example.com/omnibus");
    });
  });

  describe("✅ Confidential Minting", function () {
    it("should allow minting tokens to omnibus account", async function () {
      const amount = 1000;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, await signers.owner.getAddress())
        .add64(amount)
        .encrypt();

      await contract
        .connect(signers.owner)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.omnibusFrom.address, encrypted.handles[0], encrypted.inputProof);

      const encryptedBalance = await contract.confidentialBalanceOf(signers.omnibusFrom.address);
      expect(encryptedBalance).to.not.eq(ethers.ZeroHash);
    });
  });

  describe("✅ Omnibus Transfers", function () {
    beforeEach(async function () {
      // Mint tokens to omnibusFrom account first
      const amount = 5000;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, await signers.owner.getAddress())
        .add64(amount)
        .encrypt();
      await contract
        .connect(signers.owner)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.omnibusFrom.address, encrypted.handles[0], encrypted.inputProof);
    });

    it("should perform omnibus transfer with encrypted addresses", async function () {
      const transferAmount = 1000;
      
      // Create all encrypted values in a single encrypted input (they share the same proof)
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, await signers.omnibusFrom.getAddress())
        .addAddress(await signers.alice.getAddress()) // sender (sub-account)
        .addAddress(await signers.bob.getAddress())   // recipient (sub-account)
        .add64(transferAmount)                        // amount
        .encrypt();

      // Perform omnibus transfer
      const tx = await contract
        .connect(signers.omnibusFrom)
        .getFunction("confidentialTransferOmnibus(address,bytes32,bytes32,bytes32,bytes)")
        .send(
          signers.omnibusTo.address, // omnibusTo
          encrypted.handles[0],      // externalSender (first handle)
          encrypted.handles[1],      // externalRecipient (second handle)
          encrypted.handles[2],      // externalAmount (third handle)
          encrypted.inputProof       // shared proof for all three
        );

      // Check that OmnibusConfidentialTransfer event was emitted
      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.topics[0] === ethers.id("OmnibusConfidentialTransfer(address,address,bytes32,bytes32,bytes32)")
      );
      expect(event).to.not.be.undefined;

      // Check balances
      const fromBalance = await contract.confidentialBalanceOf(signers.omnibusFrom.address);
      const toBalance = await contract.confidentialBalanceOf(signers.omnibusTo.address);
      expect(fromBalance).to.not.eq(ethers.ZeroHash);
      expect(toBalance).to.not.eq(ethers.ZeroHash);
    });

    it("should perform omnibus transfer using internal encrypted values", async function () {
      const transferAmount = 500;
      
      // First, create encrypted values using contract functions
      // Use staticCall to get return values without sending transactions
      const encryptedAmountTx = (contract
        .connect(signers.omnibusFrom) as any)
        .createEncryptedAmount.staticCall(transferAmount);
      
      const encryptedSenderTx = (contract
        .connect(signers.omnibusFrom) as any)
        .createEncryptedAddress.staticCall(await signers.alice.getAddress());
      
      const encryptedRecipientTx = (contract
        .connect(signers.omnibusFrom) as any)
        .createEncryptedAddress.staticCall(await signers.bob.getAddress());

      // Execute the transactions to create the encrypted values
      await (contract.connect(signers.omnibusFrom) as any).createEncryptedAmount(transferAmount);
      await (contract.connect(signers.omnibusFrom) as any).createEncryptedAddress(await signers.alice.getAddress());
      await (contract.connect(signers.omnibusFrom) as any).createEncryptedAddress(await signers.bob.getAddress());

      // Get the return values from static calls
      const encryptedAmount = await encryptedAmountTx;
      const encryptedSender = await encryptedSenderTx;
      const encryptedRecipient = await encryptedRecipientTx;

      // Perform omnibus transfer using internal encrypted values
      // Note: The function signature is confidentialTransferOmnibus(address,bytes32,bytes32,bytes32)
      // where bytes32 represents eaddress and euint64
      const tx = await contract
        .connect(signers.omnibusFrom)
        .getFunction("confidentialTransferOmnibus(address,bytes32,bytes32,bytes32)")
        .send(
          signers.omnibusTo.address, // omnibusTo
          encryptedSender,          // sender (eaddress) - bytes32
          encryptedRecipient,        // recipient (eaddress) - bytes32
          encryptedAmount            // amount (euint64) - bytes32
        );

      // Check that event was emitted
      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.topics[0] === ethers.id("OmnibusConfidentialTransfer(address,address,bytes32,bytes32,bytes32)")
      );
      expect(event).to.not.be.undefined;
    });

    it("should perform omnibus transferFrom with encrypted addresses", async function () {
      const transferAmount = 750;
      
      // Create all encrypted values in a single encrypted input (they share the same proof)
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, await signers.omnibusFrom.getAddress())
        .addAddress(await signers.alice.getAddress()) // sender (sub-account)
        .addAddress(await signers.bob.getAddress())   // recipient (sub-account)
        .add64(transferAmount)                        // amount
        .encrypt();

      // Perform transferFrom omnibus
      const tx = await contract
        .connect(signers.omnibusFrom)
        .getFunction("confidentialTransferFromOmnibus(address,address,bytes32,bytes32,bytes32,bytes)")
        .send(
          signers.omnibusFrom.address, // omnibusFrom
          signers.omnibusTo.address,    // omnibusTo
          encrypted.handles[0],        // externalSender (first handle)
          encrypted.handles[1],        // externalRecipient (second handle)
          encrypted.handles[2],       // externalAmount (third handle)
          encrypted.inputProof        // shared proof for all three
        );

      // Check event emission
      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.topics[0] === ethers.id("OmnibusConfidentialTransfer(address,address,bytes32,bytes32,bytes32)")
      );
      expect(event).to.not.be.undefined;
    });
  });

  describe("❌ Failure Cases", function () {
    beforeEach(async function () {
      // Mint tokens first
      const amount = 1000;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, await signers.owner.getAddress())
        .add64(amount)
        .encrypt();
      await contract
        .connect(signers.owner)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.omnibusFrom.address, encrypted.handles[0], encrypted.inputProof);
    });

    it("should fail when non-owner tries to mint", async function () {
      const amount = 1000;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(amount)
        .encrypt();

      await expect(
        contract
          .connect(signers.alice)
          .getFunction("$_mint(address,bytes32,bytes)")
          .send(signers.alice.address, encrypted.handles[0], encrypted.inputProof)
      ).to.be.reverted;
    });

    it("should fail when trying omnibus transfer without proper permissions", async function () {
      const transferAmount = 100;
      const encryptedAmount = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address) // Wrong signer!
        .add64(transferAmount)
        .encrypt();

      const encryptedSender = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .addAddress(await signers.alice.getAddress())
        .encrypt();

      const encryptedRecipient = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .addAddress(await signers.bob.getAddress())
        .encrypt();

      const allHandles = [
        encryptedSender.handles[0],
        encryptedRecipient.handles[0],
        encryptedAmount.handles[0],
      ];
      const combinedProof = encryptedAmount.inputProof;

      // Should fail because bob doesn't have permission to use encrypted values
      await expect(
        contract
          .connect(signers.omnibusFrom)
          .getFunction("confidentialTransferOmnibus(address,bytes32,bytes32,bytes32,bytes)")
          .send(
            signers.omnibusTo.address,
            allHandles[0],
            allHandles[1],
            allHandles[2],
            combinedProof
          )
      ).to.be.reverted;
    });
  });
});


```

{% endtab %}

{% endtabs %}
