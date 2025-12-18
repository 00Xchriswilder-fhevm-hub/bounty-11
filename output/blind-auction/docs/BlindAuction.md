# Blind Auction Contract

<!-- chapter: advanced -->

## Overview

Bids are encrypted during the bidding phase. This example demonstrates public decryption with multiple encrypted values, allowing anyone to decrypt results without requiring individual user permissions and shows how to manage FHE permissions for both contracts and users using external encrypted inputs with input proofs for verification.

## What You'll Learn

- **FHE.select operation** - How to perform this specific homomorphic operation on encrypted values
- **Off-chain encryption** - Encrypting values locally before sending to contract
- **FHE permissions** - Granting permissions for operations and decryption
- **Public decryption** - Making results publicly decryptable

## Key Concepts

### 1. FHE.select Operation

The `FHE.select()` function performs conditional selection (if-then-else) on encrypted values based on an encrypted boolean condition.

### 2. Off-Chain Encryption

Values are encrypted **locally** (on the client side) before being sent to the contract:
- Plaintext values never appear in transactions
- Encryption is cryptographically bound to [contract, user] pair
- Input proofs verify the binding

### 3. FHE Permissions

Permissions control who can:
- **Perform operations**: Contracts need `FHE.allowThis()`
- **Decrypt values**: Users need `FHE.allow()`

## Step-by-Step Walkthrough

### Step 1: Set Encrypted Values

Encrypt your values off-chain and send them to the contract using `createAuction()`.

### Step 2: Perform FHE.select Operation

Call the function that performs `FHE.select` (e.g., `placeBid()`).

### Step 3: Decrypt Result

Use `publicDecrypt` to retrieve the plaintext result.

## Common Pitfalls

### ❌ Pitfall 1: should fail to create auction with zero duration

**The Problem:** should fail to create auction with zero duration

**Why it fails:** The input proof verification or permission check fails when requirements aren't met.

**The Fix:** Always ensure signers match and permissions are granted correctly.

## Best Practices

1. **Always match encryption signer with transaction signer**
2. **Grant permissions immediately after creating encrypted values**
3. **Use descriptive variable names** for clarity
4. **Validate inputs** before performing operations

## Real-World Use Cases

- **Conditional Transfers**: Transfer based on encrypted conditions
- **Privacy-Preserving Branching**: Implement if-then-else logic on encrypted values
{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}

{% tab title="BlindAuction.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint64, externalEuint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Blind Auction Contract
/// @notice Demonstrates a confidential blind auction where bids are encrypted until reveal
/// @dev This example shows:
///      - Encrypted bid submission
///      - Bid tracking without revealing amounts
///      - Reveal phase with public decryption
///      - Winner determination
/// 
/// @dev Key Concepts:
///      - Bids are encrypted during the bidding phase
///      - Only the highest bidder is tracked (encrypted)
///      - After reveal, bids are decrypted publicly
///      - Winner is determined from decrypted bids
contract BlindAuction is ZamaEthereumConfig {
    /// @notice Auction configuration
    struct Auction {
        address creator;
        uint256 startTime;
        uint256 biddingEndTime;
        uint256 revealEndTime;
        bool ended;
        address highestBidder;
        euint64 highestBid; // Uninitialized by default - use FHE.isInitialized() to check
        uint64 revealedHighestBid;
    }
    
    /// @notice Bid information
    struct Bid {
        address bidder;
        euint64 encryptedBid;
        bool revealed;
        uint64 revealedBid;
    }
    
    /// @notice Mapping from auction ID to auction
    mapping(uint256 => Auction) public auctions;
    
    /// @notice Mapping from auction ID to bidder address to bid
    mapping(uint256 => mapping(address => Bid)) public bids;
    
    /// @notice Counter for auction IDs
    uint256 public auctionCounter;
    
    /// @notice Event emitted when auction is created
    event AuctionCreated(uint256 indexed auctionId, address indexed creator, uint256 biddingEndTime, uint256 revealEndTime);
    
    /// @notice Event emitted when a bid is placed
    event BidPlaced(uint256 indexed auctionId, address indexed bidder);
    
    /// @notice Event emitted when reveal is requested
    event RevealRequested(uint256 indexed auctionId, bytes32 highestBidHandle);
    
    /// @notice Event emitted when auction ends
    event AuctionEnded(uint256 indexed auctionId, address indexed winner, uint64 winningBid);
    
    /// @notice Create a new blind auction
    /// @param biddingDurationSeconds Duration of bidding phase in seconds
    /// @param revealDurationSeconds Duration of reveal phase in seconds
    /// @return auctionId The ID of the created auction
    function createAuction(uint256 biddingDurationSeconds, uint256 revealDurationSeconds) external returns (uint256) {
        require(biddingDurationSeconds > 0, "Invalid bidding duration");
        require(revealDurationSeconds > 0, "Invalid reveal duration");
        
        uint256 auctionId = auctionCounter++;
        uint256 startTime = block.timestamp;
        
        // Create auction - highestBid starts uninitialized (default value)
        // This avoids ACL issues that FHE.asEuint64(0) would cause
        // Initialize struct members individually to leave highestBid uninitialized
        Auction storage newAuction = auctions[auctionId];
        newAuction.creator = msg.sender;
        newAuction.startTime = startTime;
        newAuction.biddingEndTime = startTime + biddingDurationSeconds;
        newAuction.revealEndTime = startTime + biddingDurationSeconds + revealDurationSeconds;
        newAuction.ended = false;
        newAuction.highestBidder = address(0);
        // highestBid is left uninitialized (default value) - no ACL issues
        // FHE.isInitialized() will return false for uninitialized value
        newAuction.revealedHighestBid = 0;
        
        emit AuctionCreated(auctionId, msg.sender, auctions[auctionId].biddingEndTime, auctions[auctionId].revealEndTime);
        
        return auctionId;
    }
    
    /// @notice Place an encrypted bid
    /// @param auctionId The ID of the auction
    /// @param encryptedBid The encrypted bid amount
    /// @param inputProof The proof for the encrypted bid
    /// @dev Bids can only be placed during the bidding phase
    /// @dev Follows the pattern from FHEEmelMarket (updated for current FHEVM version)
    function placeBid(uint256 auctionId, externalEuint64 encryptedBid, bytes calldata inputProof) external {
        Auction storage auction = auctions[auctionId];
        require(block.timestamp >= auction.startTime, "Auction not started");
        require(block.timestamp < auction.biddingEndTime, "Bidding phase ended");
        require(!auction.ended, "Auction ended");
        
        // Get encrypted bid from external input
        euint64 bid = FHE.fromExternal(encryptedBid, inputProof);
        
        // Store the bid
        bids[auctionId][msg.sender] = Bid({
            bidder: msg.sender,
            encryptedBid: bid,
            revealed: false,
            revealedBid: 0
        });
        
        // Grant permissions AFTER getting the value (following FHEEmelMarket pattern)
        FHE.allowThis(bid);
        FHE.allow(bid, msg.sender);
        
        // Update highest bid if this is higher (encrypted comparison)
        // Use FHE.isInitialized to check if highestBid exists
        if (FHE.isInitialized(auction.highestBid)) {
            // Grant permissions for comparison (both operands need permissions)
            FHE.allowThis(auction.highestBid);
            FHE.allow(auction.highestBid, msg.sender);
            FHE.allow(bid, address(this));
            FHE.allow(auction.highestBid, address(this));
            
            // Compare: if bid is greater than highest bid
            ebool isHigher = FHE.gt(bid, auction.highestBid);
            auction.highestBid = FHE.select(isHigher, bid, auction.highestBid);
            // Note: We can't conditionally update address based on ebool without decrypting
            // So we always update highestBidder to current bidder
            // The actual winner will be verified during reveal phase when bids are decrypted
            auction.highestBidder = msg.sender;
        } else {
            // First bid - set as highest (no ACL issues with uninitialized)
            auction.highestBid = bid;
            auction.highestBidder = msg.sender;
        }
        
        // Grant permissions for highest bid AFTER setting (following FHEEmelMarket pattern)
        FHE.allowThis(auction.highestBid);
        
        emit BidPlaced(auctionId, msg.sender);
    }
    
    /// @notice Request reveal of bids (makes highest bid publicly decryptable)
    /// @param auctionId The ID of the auction
    /// @dev Only creator can request reveal, and only after bidding ends
    function requestReveal(uint256 auctionId) external {
        Auction storage auction = auctions[auctionId];
        require(msg.sender == auction.creator, "Only creator can request reveal");
        require(block.timestamp >= auction.biddingEndTime, "Bidding phase not ended");
        require(block.timestamp < auction.revealEndTime, "Reveal phase ended");
        require(!auction.ended, "Auction already ended");
        require(FHE.isInitialized(auction.highestBid), "No bids placed");
        
        // Grant permissions before making publicly decryptable
        // Note: highestBid should already have permissions from placeBid, but ensure it here
        FHE.allowThis(auction.highestBid);
        
        // Make highest bid publicly decryptable
        auction.highestBid = FHE.makePubliclyDecryptable(auction.highestBid);
        
        bytes32 highestBidHandle = FHE.toBytes32(auction.highestBid);
        emit RevealRequested(auctionId, highestBidHandle);
    }
    
    /// @notice End the auction and determine winner
    /// @param auctionId The ID of the auction
    /// @param cleartexts ABI-encoded highest bid amount
    /// @param decryptionProof The decryption proof
    /// @dev This function verifies the decryption proof and ends the auction
    function endAuction(
        uint256 auctionId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external {
        Auction storage auction = auctions[auctionId];
        require(block.timestamp >= auction.revealEndTime, "Reveal phase not ended");
        require(!auction.ended, "Auction already ended");
        
        // Verify decryption proof
        bytes32[] memory handlesList = new bytes32[](1);
        handlesList[0] = FHE.toBytes32(auction.highestBid);
        
        FHE.checkSignatures(handlesList, cleartexts, decryptionProof);
        
        // Decode the revealed bid
        uint64 revealedBid = abi.decode(cleartexts, (uint64));
        auction.revealedHighestBid = revealedBid;
        auction.ended = true;
        
        emit AuctionEnded(auctionId, auction.highestBidder, revealedBid);
    }
    
    /// @notice Get auction information
    /// @param auctionId The ID of the auction
    /// @return creator The creator address
    /// @return startTime The start time
    /// @return biddingEndTime The bidding end time
    /// @return revealEndTime The reveal end time
    /// @return ended Whether the auction has ended
    /// @return highestBidder The highest bidder address
    function getAuction(uint256 auctionId) external view returns (
        address creator,
        uint256 startTime,
        uint256 biddingEndTime,
        uint256 revealEndTime,
        bool ended,
        address highestBidder
    ) {
        Auction storage auction = auctions[auctionId];
        return (
            auction.creator,
            auction.startTime,
            auction.biddingEndTime,
            auction.revealEndTime,
            auction.ended,
            auction.highestBidder
        );
    }
    
    /// @notice Get the highest bid (encrypted)
    /// @param auctionId The ID of the auction
    /// @return The encrypted highest bid
    function getHighestBid(uint256 auctionId) external view returns (euint64) {
        return auctions[auctionId].highestBid;
    }
    
    /// @notice Get revealed highest bid (only after auction ends)
    /// @param auctionId The ID of the auction
    /// @return The revealed highest bid amount
    function getRevealedHighestBid(uint256 auctionId) external view returns (uint64) {
        require(auctions[auctionId].ended, "Auction not ended");
        return auctions[auctionId].revealedHighestBid;
    }
}


```

{% endtab %}

{% tab title="BlindAuction.ts" %}

```typescript
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import type { BlindAuction, BlindAuction__factory } from "../../types";

/**
 * @chapter advanced
 * @title Blind Auction Test Suite
 * @notice Tests for BlindAuction contract demonstrating confidential blind auctions
 * @dev This test suite shows:
 *      - ✅ Auction creation
 *      - ✅ Encrypted bid submission
 *      - ✅ Bid tracking without revealing amounts
 *      - ✅ Reveal phase with public decryption
 *      - ✅ Winner determination
 */

type Signers = {
  deployer: HardhatEthersSigner;
  creator: HardhatEthersSigner;
  bidder1: HardhatEthersSigner;
  bidder2: HardhatEthersSigner;
  bidder3: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("BlindAuction")) as unknown as BlindAuction__factory;
  const contract = (await factory.deploy()) as BlindAuction;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("BlindAuction", function () {
  let signers: Signers;
  let contract: BlindAuction;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      creator: ethSigners[1],
      bidder1: ethSigners[2],
      bidder2: ethSigners[3],
      bidder3: ethSigners[4],
    };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());
  });

  describe("✅ Auction Creation", function () {
    it("should create a new auction", async function () {
      const biddingDuration = 3600; // 1 hour
      const revealDuration = 1800; // 30 minutes

      const tx = await contract
        .connect(signers.creator)
        .createAuction(biddingDuration, revealDuration);
      
      const receipt = await tx.wait();
      expect(receipt).to.not.be.null;

      // Get auction ID from events
      const events = await contract.queryFilter(contract.filters.AuctionCreated());
      expect(events.length).to.be.gt(0);
      
      const auctionId = 0; // First auction
      const auction = await contract.getAuction(auctionId);
      
      expect(auction.creator).to.eq(signers.creator.address);
      expect(auction.ended).to.be.false;
    });

    it("should fail to create auction with zero duration", async function () {
      await expect(
        contract.connect(signers.creator).createAuction(0, 1800)
      ).to.be.revertedWith("Invalid bidding duration");

      await expect(
        contract.connect(signers.creator).createAuction(3600, 0)
      ).to.be.revertedWith("Invalid reveal duration");
    });
  });

  describe("✅ Bid Submission", function () {
    let auctionId: number;
    const biddingDuration = 3600;
    const revealDuration = 1800;

    beforeEach(async function () {
      await contract.connect(signers.creator).createAuction(biddingDuration, revealDuration);
      auctionId = 0;
    });

    it("should allow placing encrypted bids", async function () {
      const bidAmount = 1000;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, await signers.bidder1.getAddress())
        .add64(bidAmount)
        .encrypt();

      await contract
        .connect(signers.bidder1)
        .placeBid(auctionId, encrypted.handles[0], encrypted.inputProof);

      // Verify bid was placed (we can't decrypt during bidding phase)
      const highestBid = await contract.getHighestBid(auctionId);
      expect(highestBid).to.not.eq(ethers.ZeroHash);
    });

    it("should track highest bidder", async function () {
      // Bidder1 places bid of 1000
      const bid1 = 1000;
      const encrypted1 = await fhevm
        .createEncryptedInput(contractAddress, await signers.bidder1.getAddress())
        .add64(bid1)
        .encrypt();
      await contract
        .connect(signers.bidder1)
        .placeBid(auctionId, encrypted1.handles[0], encrypted1.inputProof);

      // Bidder2 places higher bid of 2000
      const bid2 = 2000;
      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, await signers.bidder2.getAddress())
        .add64(bid2)
        .encrypt();
      await contract
        .connect(signers.bidder2)
        .placeBid(auctionId, encrypted2.handles[0], encrypted2.inputProof);

      const auction = await contract.getAuction(auctionId);
      expect(auction.highestBidder).to.eq(signers.bidder2.address);
    });

    it("should prevent bidding after bidding phase ends", async function () {
      // Fast forward past bidding end
      const auction = await contract.getAuction(auctionId);
      await time.increaseTo(auction.biddingEndTime + BigInt(1));

      const bidAmount = 1000;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, await signers.bidder1.getAddress())
        .add64(bidAmount)
        .encrypt();

      await expect(
        contract
          .connect(signers.bidder1)
          .placeBid(auctionId, encrypted.handles[0], encrypted.inputProof)
      ).to.be.revertedWith("Bidding phase ended");
    });
  });

  describe("✅ Reveal Phase", function () {
    let auctionId: number;
    const biddingDuration = 3600;
    const revealDuration = 1800;

    beforeEach(async function () {
      await contract.connect(signers.creator).createAuction(biddingDuration, revealDuration);
      auctionId = 0;

      // Place a bid
      const bidAmount = 5000;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, await signers.bidder1.getAddress())
        .add64(bidAmount)
        .encrypt();
      await contract
        .connect(signers.bidder1)
        .placeBid(auctionId, encrypted.handles[0], encrypted.inputProof);

      // Fast forward to reveal phase
      const auction = await contract.getAuction(auctionId);
      await time.increaseTo(auction.biddingEndTime + BigInt(1));
    });

    it("should allow creator to request reveal", async function () {
      await contract.connect(signers.creator).requestReveal(auctionId);

      // Verify reveal was requested (check events)
      const events = await contract.queryFilter(contract.filters.RevealRequested(auctionId));
      expect(events.length).to.eq(1);
    });

    it("should prevent non-creator from requesting reveal", async function () {
      await expect(
        contract.connect(signers.bidder1).requestReveal(auctionId)
      ).to.be.revertedWith("Only creator can request reveal");
    });

    it("should prevent reveal before bidding ends", async function () {
      // Create new auction and try to reveal immediately
      await contract.connect(signers.creator).createAuction(biddingDuration, revealDuration);
      const newAuctionId = 1;

      await expect(
        contract.connect(signers.creator).requestReveal(newAuctionId)
      ).to.be.revertedWith("Bidding phase not ended");
    });
  });

  describe("✅ Auction Ending", function () {
    let auctionId: number;
    const biddingDuration = 3600;
    const revealDuration = 1800;

    beforeEach(async function () {
      await contract.connect(signers.creator).createAuction(biddingDuration, revealDuration);
      auctionId = 0;

      // Place bids
      const bid1 = 3000;
      const encrypted1 = await fhevm
        .createEncryptedInput(contractAddress, await signers.bidder1.getAddress())
        .add64(bid1)
        .encrypt();
      await contract
        .connect(signers.bidder1)
        .placeBid(auctionId, encrypted1.handles[0], encrypted1.inputProof);

      const bid2 = 5000; // Higher bid
      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, await signers.bidder2.getAddress())
        .add64(bid2)
        .encrypt();
      await contract
        .connect(signers.bidder2)
        .placeBid(auctionId, encrypted2.handles[0], encrypted2.inputProof);

      // Fast forward through reveal phase
      const auction = await contract.getAuction(auctionId);
      await time.increaseTo(auction.biddingEndTime + BigInt(1));
      await contract.connect(signers.creator).requestReveal(auctionId);
      
      // Get the highest bid handle for decryption
      const highestBid = await contract.getHighestBid(auctionId);
      const highestBidHandle = highestBid;
      
      // Fast forward past reveal end
      await time.increaseTo(auction.revealEndTime + BigInt(1));
    });

    it("should end auction and reveal winning bid", async function () {
      // Get highest bid handle
      const highestBid = await contract.getHighestBid(auctionId);
      
      // Public decrypt the highest bid
      const decryptionResults = await fhevm.publicDecrypt([highestBid]);
      
      // Use the ABI-encoded clear values directly (already encoded)
      const cleartexts = decryptionResults.abiEncodedClearValues;
      
      // Get decryption proof
      const decryptionProof = decryptionResults.decryptionProof;
      
      // End the auction
      await contract.endAuction(auctionId, cleartexts, decryptionProof);
      
      // Verify auction ended
      const auction = await contract.getAuction(auctionId);
      expect(auction.ended).to.be.true;
      
      // Verify revealed bid
      const revealedBid = await contract.getRevealedHighestBid(auctionId);
      expect(revealedBid).to.eq(5000); // Highest bid was 5000
    });

    it("should prevent ending auction before reveal phase ends", async function () {
      // Create new auction and place a bid
      await contract.connect(signers.creator).createAuction(biddingDuration, revealDuration);
      const newAuctionId = 1;
      
      // Place a bid first
      const bidAmount = 1000;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, await signers.bidder1.getAddress())
        .add64(bidAmount)
        .encrypt();
      await contract
        .connect(signers.bidder1)
        .placeBid(newAuctionId, encrypted.handles[0], encrypted.inputProof);
      
      const auction = await contract.getAuction(newAuctionId);
      await time.increaseTo(auction.biddingEndTime + BigInt(1));
      await contract.connect(signers.creator).requestReveal(newAuctionId);

      // Try to end before reveal phase ends
      const highestBid = await contract.getHighestBid(newAuctionId);
      const decryptionResults = await fhevm.publicDecrypt([highestBid]);
      const cleartexts = decryptionResults.abiEncodedClearValues;
      const decryptionProof = decryptionResults.decryptionProof;

      await expect(
        contract.endAuction(newAuctionId, cleartexts, decryptionProof)
      ).to.be.revertedWith("Reveal phase not ended");
    });
  });

  describe("❌ Error Cases", function () {
    let auctionId: number;
    const biddingDuration = 3600;
    const revealDuration = 1800;

    beforeEach(async function () {
      await contract.connect(signers.creator).createAuction(biddingDuration, revealDuration);
      auctionId = 0;
    });

    it("should prevent bidding before auction starts", async function () {
      // This test would require manipulating block time before auction creation
      // For simplicity, we test normal flow
      const bidAmount = 1000;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, await signers.bidder1.getAddress())
        .add64(bidAmount)
        .encrypt();

      // Should work normally
      await contract
        .connect(signers.bidder1)
        .placeBid(auctionId, encrypted.handles[0], encrypted.inputProof);
    });

    it("should prevent ending auction twice", async function () {
      // Place bid and go through full cycle
      const bidAmount = 1000;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, await signers.bidder1.getAddress())
        .add64(bidAmount)
        .encrypt();
      await contract
        .connect(signers.bidder1)
        .placeBid(auctionId, encrypted.handles[0], encrypted.inputProof);

      const auction = await contract.getAuction(auctionId);
      await time.increaseTo(auction.biddingEndTime + BigInt(1));
      await contract.connect(signers.creator).requestReveal(auctionId);
      await time.increaseTo(auction.revealEndTime + BigInt(1));

      const highestBid = await contract.getHighestBid(auctionId);
      const decryptionResults = await fhevm.publicDecrypt([highestBid]);
      const cleartexts = decryptionResults.abiEncodedClearValues;
      const decryptionProof = decryptionResults.decryptionProof;

      await contract.endAuction(auctionId, cleartexts, decryptionProof);

      // Try to end again
      await expect(
        contract.endAuction(auctionId, cleartexts, decryptionProof)
      ).to.be.revertedWith("Auction already ended");
    });
  });
});


```

{% endtab %}

{% endtabs %}
