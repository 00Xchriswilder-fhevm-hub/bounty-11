# ERC7984 RWA Mock Token

<!-- chapter: openzeppelin -->

## Overview

This example shows how to extend ERC7984Rwa for compliant confidential tokens, compliance features: pause, freeze, block users, agent role for administrative actions, force transfers for compliance enforcement, frozen balances and available balances. RWA: Real World Assets - tokens representing real-world assets with compliance requirements. This extends ERC7984Rwa which includes compliance features. This example demonstrates confidential token operations with encrypted balances and transfers and shows how to manage FHE permissions for both contracts and users using external encrypted inputs with input proofs for verification.

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

### ❌ Pitfall 1: should not allow non-admin to add agent

**The Problem:** should not allow non-admin to add agent

**Why it fails:** The input proof verification or permission check fails when requirements aren't met.

**The Fix:** Always ensure signers match and permissions are granted correctly.

### ❌ Pitfall 2: should fail when non-agent tries to pause

**The Problem:** should fail when non-agent tries to pause

**Why it fails:** The input proof verification or permission check fails when requirements aren't met.

**The Fix:** Always ensure signers match and permissions are granted correctly.

### ❌ Pitfall 3: should fail when non-agent tries to freeze balance

**The Problem:** Mint tokens first

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

{% tab title="ERC7984Initialized.sol" %}

```solidity
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

```

{% endtab %}

{% tab title="ERC7984RwaExample.ts" %}

```typescript
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import type { Contract } from "ethers";
type ERC7984RwaMock = Contract;
import { expect } from "chai";

/**
 * @chapter openzeppelin
 * @title ERC7984 RWA Mock Test Suite
 * @notice Comprehensive tests for ERC7984RwaMock contract (Real World Assets)
 * @dev Tests cover:
 *      - ✅ Token creation and metadata
 *      - ✅ Confidential minting
 *      - ✅ Confidential transfers
 *      - ✅ Pause/unpause functionality
 *      - ✅ User blocking/unblocking
 *      - ✅ Frozen balances
 *      - ✅ Available balances
 *      - ✅ Agent role management
 *      - ✅ Force transfers
 */

type Signers = {
  deployer: HardhatEthersSigner;
  admin: HardhatEthersSigner;
  agent: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  let factory;
  try {
    factory = await ethers.getContractFactory("contracts/ERC7984Initialized.sol:ERC7984RwaMock");
  } catch {
    factory = await ethers.getContractFactory("contracts/ERC7984RwaMock.sol:ERC7984RwaMock");
  }
  const admin = (await ethers.getSigners())[1];
  const contract = (await factory.deploy(
    "RWA Token",
    "RWA",
    "https://example.com/rwa",
    await admin.getAddress()
  )) as unknown as ERC7984RwaMock;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("ERC7984RwaMock", function () {
  let signers: Signers;
  let contract: ERC7984RwaMock;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      admin: ethSigners[1],
      agent: ethSigners[2],
      alice: ethSigners[3],
      bob: ethSigners[4],
    };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());
    
    // Grant agent role to agent signer
    await (contract.connect(signers.admin) as any).addAgent(await signers.agent.getAddress());
  });

  describe("✅ Token Info", function () {
    it("should return token name", async function () {
      const name = await contract.name();
      expect(name).to.equal("RWA Token");
    });

    it("should return token symbol", async function () {
      const symbol = await contract.symbol();
      expect(symbol).to.equal("RWA");
    });
  });

  describe("✅ Role Management", function () {
    it("should allow admin to add agent", async function () {
      await (contract.connect(signers.admin) as any).addAgent(await signers.alice.getAddress());
      const isAgent = await (contract as any).isAgent(await signers.alice.getAddress());
      expect(isAgent).to.be.true;
    });

    it("should allow admin to remove agent", async function () {
      await (contract.connect(signers.admin) as any).removeAgent(await signers.agent.getAddress());
      const isAgent = await (contract as any).isAgent(await signers.agent.getAddress());
      expect(isAgent).to.be.false;
    });

    it("should not allow non-admin to add agent", async function () {
      await expect(
        (contract.connect(signers.alice) as any).addAgent(await signers.bob.getAddress())
      ).to.be.reverted;
    });
  });

  describe("✅ Confidential Minting", function () {
    it("should mint tokens to user", async function () {
      const amount = 1000;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.admin.address)
        .add64(amount)
        .encrypt();

      await (contract.connect(signers.admin) as any)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.alice.address, encrypted.handles[0], encrypted.inputProof);

      const balance = await contract.confidentialBalanceOf(signers.alice.address);
      expect(balance).to.not.eq(ethers.ZeroHash);
    });
  });

  describe("✅ Pause/Unpause", function () {
    beforeEach(async function () {
      // Mint tokens to alice first
      const amount = 1000;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.admin.address)
        .add64(amount)
        .encrypt();

      await (contract.connect(signers.admin) as any)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.alice.address, encrypted.handles[0], encrypted.inputProof);
    });

    it("should allow agent to pause contract", async function () {
      await (contract.connect(signers.agent) as any).pause();
      const paused = await (contract as any).paused();
      expect(paused).to.be.true;
    });

    it("should prevent transfers when paused", async function () {
      await (contract.connect(signers.agent) as any).pause();
      
      const amount = 100;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(amount)
        .encrypt();

      await expect(
        (contract.connect(signers.alice) as any)
          .getFunction("confidentialTransfer(address,bytes32,bytes)")
          .send(signers.bob.address, encrypted.handles[0], encrypted.inputProof)
      ).to.be.reverted;
    });

    it("should allow agent to unpause contract", async function () {
      await (contract.connect(signers.agent) as any).pause();
      await (contract.connect(signers.agent) as any).unpause();
      const paused = await (contract as any).paused();
      expect(paused).to.be.false;
    });
  });

  describe("✅ User Blocking", function () {
    it("should allow agent to block user", async function () {
      await (contract.connect(signers.agent) as any).blockUser(signers.alice.address);
      const isAllowed = await (contract as any).isUserAllowed(signers.alice.address);
      expect(isAllowed).to.be.false;
    });

    it("should allow agent to unblock user", async function () {
      await (contract.connect(signers.agent) as any).blockUser(signers.alice.address);
      await (contract.connect(signers.agent) as any).unblockUser(signers.alice.address);
      const isAllowed = await (contract as any).isUserAllowed(signers.alice.address);
      expect(isAllowed).to.be.true;
    });
  });

  describe("✅ Frozen Balances", function () {
    beforeEach(async function () {
      // Mint tokens to alice first
      const amount = 1000;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.admin.address)
        .add64(amount)
        .encrypt();

      await (contract.connect(signers.admin) as any)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.alice.address, encrypted.handles[0], encrypted.inputProof);
    });

    it("should allow agent to set frozen balance", async function () {
      const frozenAmount = 200;
      await (contract.connect(signers.agent) as any).$_setConfidentialFrozen(
        signers.alice.address,
        frozenAmount
      );

      const frozen = await contract.confidentialFrozen(signers.alice.address);
      expect(frozen).to.not.eq(ethers.ZeroHash);
    });

    it("should calculate available balance correctly", async function () {
      const frozenAmount = 200;
      await (contract.connect(signers.agent) as any).$_setConfidentialFrozen(
        signers.alice.address,
        frozenAmount
      );

      const available = await contract.confidentialAvailable(signers.alice.address);
      expect(available).to.not.eq(ethers.ZeroHash);
    });
  });

  describe("✅ Force Transfers", function () {
    beforeEach(async function () {
      // Mint tokens to alice first
      const amount = 1000;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.admin.address)
        .add64(amount)
        .encrypt();

      await (contract.connect(signers.admin) as any)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.alice.address, encrypted.handles[0], encrypted.inputProof);
    });

    it("should allow agent to force transfer", async function () {
      const amount = 100;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.agent.address)
        .add64(amount)
        .encrypt();

      await (contract.connect(signers.agent) as any)
        .getFunction("forceConfidentialTransferFrom(address,address,bytes32,bytes)")
        .send(signers.alice.address, signers.bob.address, encrypted.handles[0], encrypted.inputProof);

      const bobBalance = await contract.confidentialBalanceOf(signers.bob.address);
      expect(bobBalance).to.not.eq(ethers.ZeroHash);
    });
  });

  describe("❌ Error Cases", function () {
    it("should fail when non-agent tries to pause", async function () {
      await expect(
        (contract.connect(signers.alice) as any).pause()
      ).to.be.reverted;
    });

    it("should fail when non-agent tries to freeze balance", async function () {
      // Mint tokens first
      const amount = 1000;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.admin.address)
        .add64(amount)
        .encrypt();
      await (contract.connect(signers.admin) as any)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.alice.address, encrypted.handles[0], encrypted.inputProof);

      // Non-agent tries to freeze (should fail)
      await expect(
        (contract.connect(signers.alice) as any).$_setConfidentialFrozen(signers.alice.address, 100)
      ).to.be.reverted;
    });

    it("should fail when non-agent tries to block user", async function () {
      await expect(
        (contract.connect(signers.alice) as any).blockUser(signers.bob.address)
      ).to.be.reverted;
    });

    it("should fail when non-agent tries to force transfer", async function () {
      // Mint tokens first
      const amount = 1000;
      const encryptedMint = await fhevm
        .createEncryptedInput(contractAddress, signers.admin.address)
        .add64(amount)
        .encrypt();
      await (contract.connect(signers.admin) as any)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.alice.address, encryptedMint.handles[0], encryptedMint.inputProof);

      // Non-agent tries to force transfer (should fail)
      const transferAmount = 100;
      const encryptedTransfer = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(transferAmount)
        .encrypt();

      await expect(
        (contract.connect(signers.alice) as any)
          .getFunction("forceConfidentialTransferFrom(address,address,bytes32,bytes)")
          .send(signers.alice.address, signers.bob.address, encryptedTransfer.handles[0], encryptedTransfer.inputProof)
      ).to.be.reverted;
    });
  });
});


```

{% endtab %}

{% endtabs %}
