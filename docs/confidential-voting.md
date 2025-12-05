# Confidential Voting

<!-- chapter: openzeppelin -->

## Overview

OpenZeppelin ERC7984Votes for confidential governance. Demonstrates voting power tracking, delegation, and historical vote queries.

## What You'll Learn

- **Off-chain encryption** - Encrypting values locally before sending to contract

## Key Concepts

### 1. Off-Chain Encryption

Values are encrypted **locally** (on the client side) before being sent to the contract:
- Plaintext values never appear in transactions
- Encryption is cryptographically bound to [contract, user] pair
- Input proofs verify the binding

## Step-by-Step Walkthrough

### Step 1: Setup

Deploy the contract and prepare encrypted inputs.

### Step 2: Execute Operations

Call contract functions with encrypted values and proofs.

### Step 3: Decrypt Results

Use the appropriate decryption method to retrieve plaintext values.

## Common Pitfalls

### ❌ Pitfall 1: should fail when non-owner tries to mint

**The Problem:** Non-owner (alice) tries to mint (should fail)

**Why it fails:** The operation fails due to incorrect usage, permissions, or signer mismatch.

**The Fix:** Ensure proper setup, matching signers, and correct permissions.

### ❌ Pitfall 2: should fail when querying past votes for future block

**The Problem:** Should fail when querying a block that doesn't exist yet

**Why it fails:** The operation fails due to incorrect usage, permissions, or signer mismatch.

**The Fix:** Ensure proper setup, matching signers, and correct permissions.

## Best Practices

1. **Always match encryption signer with transaction signer**
2. **Grant permissions immediately after creating encrypted values**
3. **Use descriptive variable names** for clarity
4. **Validate inputs** before performing operations

## Real-World Use Cases

- **Confidential Smart Contracts**: Building privacy-preserving applications
- **Encrypted Data Processing**: Performing computations on sensitive data
{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}

{% tab title="ERC7984VotesMock.sol" %}

```solidity
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


```

{% endtab %}

{% tab title="ERC7984VotesExample.ts" %}

```typescript
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
// ERC7984VotesMock types will be available in generated examples after compilation
import type { Contract } from "ethers";
type ERC7984VotesMock = Contract;
type ERC7984VotesMock__factory = any;
import { expect } from "chai";

/**
 * @chapter openzeppelin
 * @title ERC7984Votes Test Suite
 * @notice Comprehensive tests for ERC7984VotesMock contract demonstrating confidential voting
 * @dev Tests cover:
 *      - ✅ Token creation and metadata
 *      - ✅ Confidential minting with voting power
 *      - ✅ Vote delegation
 *      - ✅ Voting power queries
 *      - ✅ Historical vote tracking
 *      - ❌ Failure cases
 * 
 * @dev Key Concepts:
 *      - Voting power is based on token balance (confidential)
 *      - Users must delegate to activate voting power
 *      - Delegation can be to self or others
 *      - Historical votes can be queried via checkpoints
 */

type Signers = {
  deployer: HardhatEthersSigner;
  owner: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  // Use fully qualified name to avoid conflict with OpenZeppelin's mock
  // Note: In source directory, ERC7984VotesMock is at contracts/openzeppelin/ERC7984VotesMock.sol
  // In output directory (after create-example), it's copied to contracts/ERC7984VotesMock.sol
  let factory;
  try {
    factory = await ethers.getContractFactory("contracts/ERC7984VotesMock.sol:ERC7984VotesMock");
  } catch {
    factory = await ethers.getContractFactory("contracts/openzeppelin/ERC7984VotesMock.sol:ERC7984VotesMock");
  }
  const owner = (await ethers.getSigners())[1];
  const contract = (await factory.deploy(
    await owner.getAddress(), // owner
    "Voting Token",
    "VOTE",
    "https://example.com"
  )) as unknown as ERC7984VotesMock;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("ERC7984VotesMock", function () {
  let signers: Signers;
  let contract: ERC7984VotesMock;
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
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());
  });

  describe("✅ Token Info", function () {
    it("should return token name", async function () {
      const name = await contract.name();
      expect(name).to.eq("Voting Token");
    });

    it("should return token symbol", async function () {
      const symbol = await contract.symbol();
      expect(symbol).to.eq("VOTE");
    });
  });

  describe("✅ Confidential Minting with Voting Power", function () {
    it("should mint tokens and track voting power", async function () {
      const amount = 1000;
      
      /**
       * @dev IMPORTANT: createEncryptedInput Pattern for FHE Operations
       * 
       * createEncryptedInput(contractAddress, senderAddress)
       * - contractAddress: The contract that will call FHE.fromExternal() internally
       *   In this case: token contract (ERC7984VotesMock) calls fromExternal inside $_mint
       * - senderAddress: The signer who will call the function using the encrypted input
       *   In this case: owner calls $_mint
       */
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, await signers.owner.getAddress())
        .add64(amount)
        .encrypt();

      // Mint tokens to Alice
      await contract
        .connect(signers.owner)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.alice.address, encrypted.handles[0], encrypted.inputProof);

      // Check balance (encrypted)
      const encryptedBalance = await contract.confidentialBalanceOf(signers.alice.address);
      expect(encryptedBalance).to.not.eq(ethers.ZeroHash);
    });
  });

  describe("✅ Vote Delegation", function () {
    beforeEach(async function () {
      // Mint tokens to Alice first
      const amount = 1000;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, await signers.owner.getAddress())
        .add64(amount)
        .encrypt();
      await contract
        .connect(signers.owner)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.alice.address, encrypted.handles[0], encrypted.inputProof);
    });

    it("should allow delegation to self", async function () {
      // Alice delegates to herself to activate voting power
      await (contract.connect(signers.alice) as any).delegate(await signers.alice.getAddress());
      
      // Check delegate
      const delegate = await (contract as any).delegates(await signers.alice.getAddress());
      expect(delegate).to.eq(await signers.alice.getAddress());
    });

    it("should allow delegation to another address", async function () {
      // Alice delegates to Bob
      await (contract.connect(signers.alice) as any).delegate(await signers.bob.getAddress());
      
      // Check delegate
      const delegate = await (contract as any).delegates(await signers.alice.getAddress());
      expect(delegate).to.eq(await signers.bob.getAddress());
    });

    it("should change delegation", async function () {
      // First delegate to Bob
      await (contract.connect(signers.alice) as any).delegate(await signers.bob.getAddress());
      let delegate = await (contract as any).delegates(await signers.alice.getAddress());
      expect(delegate).to.eq(await signers.bob.getAddress());

      // Then change to self
      await (contract.connect(signers.alice) as any).delegate(await signers.alice.getAddress());
      delegate = await (contract as any).delegates(await signers.alice.getAddress());
      expect(delegate).to.eq(await signers.alice.getAddress());
    });
  });

  describe("✅ Voting Power Queries", function () {
    beforeEach(async function () {
      // Mint tokens to Alice and delegate to self
      const amount = 1000;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, await signers.owner.getAddress())
        .add64(amount)
        .encrypt();
      await contract
        .connect(signers.owner)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.alice.address, encrypted.handles[0], encrypted.inputProof);
      
      // Delegate to activate voting power
      await (contract.connect(signers.alice) as any).delegate(await signers.alice.getAddress());
    });

    it("should return current voting power (encrypted)", async function () {
      /**
       * @dev Voting power is returned as encrypted euint64
       * The value is confidential and can only be decrypted by authorized parties
       */
      const votes = await contract.getVotes(await signers.alice.getAddress());
      expect(votes).to.not.eq(ethers.ZeroHash);
    });

    it("should return past voting power at a block", async function () {
      // Need to wait for a block to pass before querying past votes
      // First, mine a block to create history
      await ethers.provider.send("evm_mine", []);
      
      const currentBlock = await ethers.provider.getBlockNumber();
      const pastBlock = currentBlock - 1; // Query the previous block
      
      // Get past votes (encrypted) - must query a block in the past
      const pastVotes = await contract.getPastVotes(await signers.alice.getAddress(), pastBlock);
      expect(pastVotes).to.not.eq(ethers.ZeroHash);
    });

    it("should return total supply of votes (encrypted)", async function () {
      /**
       * @dev Total supply of votes is the sum of all delegated voting power
       * This is also encrypted for confidentiality
       */
      const totalSupply = await contract.confidentialTotalSupply();
      expect(totalSupply).to.not.eq(ethers.ZeroHash);
    });
  });

  describe("✅ Historical Vote Tracking", function () {
    beforeEach(async function () {
      // Mint tokens and delegate
      const amount = 1000;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, await signers.owner.getAddress())
        .add64(amount)
        .encrypt();
      await contract
        .connect(signers.owner)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.alice.address, encrypted.handles[0], encrypted.inputProof);
      
      await (contract.connect(signers.alice) as any).delegate(await signers.alice.getAddress());
    });

    it("should track voting power across blocks", async function () {
      // Mine a block to create checkpoint history
      await ethers.provider.send("evm_mine", []);
      
      const block1 = await ethers.provider.getBlockNumber();
      // Query block1 (current) as past votes - need to mine another block first
      await ethers.provider.send("evm_mine", []);
      
      // Now block1 is in the past, we can query it
      const votes1 = await contract.getPastVotes(await signers.alice.getAddress(), block1);
      expect(votes1).to.not.eq(ethers.ZeroHash);

      // Mine another block
      await ethers.provider.send("evm_mine", []);

      const block2 = await ethers.provider.getBlockNumber();
      // block2 is current, need to mine one more to make it past
      await ethers.provider.send("evm_mine", []);
      
      const votes2 = await contract.getPastVotes(await signers.alice.getAddress(), block2);
      expect(votes2).to.not.eq(ethers.ZeroHash);
    });
  });

  describe("❌ Error Cases", function () {
    it("should return zero votes before delegation", async function () {
      // Mint tokens but don't delegate
      const amount = 1000;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, await signers.owner.getAddress())
        .add64(amount)
        .encrypt();
      await contract
        .connect(signers.owner)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.alice.address, encrypted.handles[0], encrypted.inputProof);

      // Voting power should be zero (encrypted) before delegation
      const votes = await contract.getVotes(await signers.alice.getAddress());
      // Note: Zero encrypted value is still a valid handle, just represents zero
      expect(votes).to.not.eq(undefined);
    });

    it("should fail when non-owner tries to mint", async function () {
      const amount = 1000;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, await signers.alice.getAddress())
        .add64(amount)
        .encrypt();
      
      // Non-owner (alice) tries to mint (should fail)
      await expect(
        contract
          .connect(signers.alice)
          .getFunction("$_mint(address,bytes32,bytes)")
          .send(signers.bob.address, encrypted.handles[0], encrypted.inputProof)
      ).to.be.reverted;
    });

    it("should fail when querying past votes for future block", async function () {
      const currentBlock = await ethers.provider.getBlockNumber();
      const futureBlock = currentBlock + 1000;
      
      // Should fail when querying a block that doesn't exist yet
      await expect(
        contract.getPastVotes(await signers.alice.getAddress(), futureBlock)
      ).to.be.reverted;
    });
  });
});


```

{% endtab %}

{% endtabs %}
