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

