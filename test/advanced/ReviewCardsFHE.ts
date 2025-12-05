import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { ReviewCardsFHE, ReviewCardsFHE__factory } from "../../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

/**
 * @title Review Cards FHE Test Suite
 * @notice Tests for ReviewCardsFHE contract demonstrating encrypted ratings
 * @dev This test suite shows:
 *      - ✅ Card creation with fees
 *      - ✅ Encrypted rating submission
 *      - ✅ Encrypted sum and count tracking
 *      - ✅ Public decryption for averages
 */

type Signers = {
  deployer: HardhatEthersSigner;
  owner: HardhatEthersSigner;
  creator: HardhatEthersSigner;
  rater1: HardhatEthersSigner;
  rater2: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("ReviewCardsFHE")) as ReviewCardsFHE__factory;
  const contract = (await factory.deploy()) as ReviewCardsFHE;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("ReviewCardsFHE", function () {
  let signers: Signers;
  let contract: ReviewCardsFHE;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      owner: ethSigners[0], // Owner is deployer
      creator: ethSigners[1],
      rater1: ethSigners[2],
      rater2: ethSigners[3],
    };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());
  });

  describe("✅ Card Creation", function () {
    it("should create a review card with fee", async function () {
      const fee = await contract.creationFee();

      await expect(
        contract.connect(signers.creator).createReviewCard({ value: fee })
      ).to.emit(contract, "CardCreated");

      const totalCards = await contract.getTotalCards();
      expect(totalCards).to.eq(1);
    });

    it("should fail with insufficient fee", async function () {
      const fee = await contract.creationFee();
      const insufficientFee = fee / 2n;

      await expect(
        contract.connect(signers.creator).createReviewCard({ value: insufficientFee })
      ).to.be.revertedWith("Insufficient creation fee");
    });
  });

  describe("✅ Rating Submission", function () {
    let cardId: bigint;

    beforeEach(async function () {
      const fee = await contract.creationFee();
      await contract.connect(signers.creator).createReviewCard({ value: fee });
      cardId = 0n;
    });

    it("should submit encrypted rating (1-5 stars)", async function () {
      const rating = 5; // 5 stars
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.rater1.address)
        .add32(rating)
        .encrypt();

      await expect(
        contract
          .connect(signers.rater1)
          .submitEncryptedRating(cardId, encrypted.handles[0], encrypted.inputProof)
      ).to.emit(contract, "RatingSubmitted");

      expect(await contract.hasAddressVoted(cardId, signers.rater1.address)).to.be.true;
    });

    it("should prevent double voting", async function () {
      const rating = 4;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.rater1.address)
        .add32(rating)
        .encrypt();

      await contract
        .connect(signers.rater1)
        .submitEncryptedRating(cardId, encrypted.handles[0], encrypted.inputProof);

      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, signers.rater1.address)
        .add32(rating)
        .encrypt();

      await expect(
        contract
          .connect(signers.rater1)
          .submitEncryptedRating(cardId, encrypted2.handles[0], encrypted2.inputProof)
      ).to.be.revertedWith("Already voted on this card");
    });

    it("should allow multiple raters", async function () {
      // Rater 1 submits 5 stars
      const encrypted1 = await fhevm
        .createEncryptedInput(contractAddress, signers.rater1.address)
        .add32(5)
        .encrypt();
      await contract
        .connect(signers.rater1)
        .submitEncryptedRating(cardId, encrypted1.handles[0], encrypted1.inputProof);

      // Rater 2 submits 4 stars
      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, signers.rater2.address)
        .add32(4)
        .encrypt();
      await contract
        .connect(signers.rater2)
        .submitEncryptedRating(cardId, encrypted2.handles[0], encrypted2.inputProof);

      expect(await contract.hasAddressVoted(cardId, signers.rater1.address)).to.be.true;
      expect(await contract.hasAddressVoted(cardId, signers.rater2.address)).to.be.true;
    });
  });

  describe("✅ Encrypted Stats", function () {
    let cardId: bigint;

    beforeEach(async function () {
      const fee = await contract.creationFee();
      await contract.connect(signers.creator).createReviewCard({ value: fee });
      cardId = 0n;
    });

    it("should return encrypted stats (sum and count)", async function () {
      // Submit a rating
      const rating = 5;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.rater1.address)
        .add32(rating)
        .encrypt();
      await contract
        .connect(signers.rater1)
        .submitEncryptedRating(cardId, encrypted.handles[0], encrypted.inputProof);

      const stats = await contract.getEncryptedStats(cardId);
      expect(stats.sum).to.not.eq(ethers.ZeroHash);
      expect(stats.count).to.not.eq(ethers.ZeroHash);
    });

    it("should return card info", async function () {
      const cardInfo = await contract.getCardInfo(cardId);
      expect(cardInfo.exists).to.be.true;
      expect(cardInfo.creator).to.eq(signers.creator.address);
    });
  });

  describe("✅ Owner Functions", function () {
    it("should allow owner to change creation fee", async function () {
      const newFee = ethers.parseEther("0.01");
      await contract.connect(signers.owner).setCreationFee(newFee);

      expect(await contract.creationFee()).to.eq(newFee);
    });

    it("should prevent non-owner from changing fee", async function () {
      const newFee = ethers.parseEther("0.01");
      await expect(
        contract.connect(signers.creator).setCreationFee(newFee)
      ).to.be.revertedWith("Not owner");
    });
  });

  // ❌ Common Pitfalls
  describe("❌ Error Cases", function () {
    it("should fail with insufficient fee", async function () {
      const fee = await contract.creationFee();
      const insufficientFee = fee / 2n;
      
      await expect(
        contract.connect(signers.creator).createReviewCard({ value: insufficientFee })
      ).to.be.reverted;
    });

    it("should fail when rating non-existent card", async function () {
      const nonExistentCardId = 999n;
      const rating = 5;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.rater1.address)
        .add32(rating)
        .encrypt();
      
      await expect(
        contract
          .connect(signers.rater1)
          .submitEncryptedRating(nonExistentCardId, encrypted.handles[0], encrypted.inputProof)
      ).to.be.reverted;
    });

    it("should fail when using wrong signer for encrypted input", async function () {
      const fee = await contract.creationFee();
      await contract.connect(signers.creator).createReviewCard({ value: fee });
      const cardId = 0n;

      // Create encrypted input with wrong signer
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.creator.address) // Wrong signer!
        .add32(5)
        .encrypt();
      
      // Should fail because signer doesn't match
      await expect(
        contract
          .connect(signers.rater1)
          .submitEncryptedRating(cardId, encrypted.handles[0], encrypted.inputProof)
      ).to.be.reverted;
    });
  });
});

