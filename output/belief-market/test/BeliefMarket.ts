import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { BeliefMarket, BeliefMarket__factory } from "../../types";
import { expect } from "chai";

/**
 * @chapter advanced
 * @title Belief Market Test Suite
 * @notice Tests for BeliefMarket contract demonstrating confidential prediction markets
 * @dev This test suite shows:
 *      - ✅ Bet creation with platform stake
 *      - ✅ Encrypted voting with weighted stakes
 *      - ✅ Tally reveal after expiry
 *      - ✅ Prize distribution to winners
 *      - ✅ Refunds on tie outcomes
 */

type Signers = {
  deployer: HardhatEthersSigner;
  creator: HardhatEthersSigner;
  voter1: HardhatEthersSigner;
  voter2: HardhatEthersSigner;
  voter3: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("BeliefMarket")) as BeliefMarket__factory;
  const contract = (await factory.deploy()) as BeliefMarket;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("BeliefMarket", function () {
  let signers: Signers;
  let contract: BeliefMarket;
  let contractAddress: string;

  const PLATFORM_STAKE = ethers.parseEther("0.02");
  const VOTE_STAKE = ethers.parseEther("0.005");
  const DURATION = 3600; // 1 hour

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      creator: ethSigners[1],
      voter1: ethSigners[2],
      voter2: ethSigners[3],
      voter3: ethSigners[4],
    };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());
  });

  describe("✅ Bet Creation", function () {
    it("should create a bet with correct parameters", async function () {
      await expect(
        contract.connect(signers.creator).createBet("bet1", VOTE_STAKE, DURATION, { value: PLATFORM_STAKE })
      ).to.emit(contract, "BetCreated");

      const bet = await contract.getBet("bet1");
      expect(bet.creator).to.eq(signers.creator.address);
      expect(bet.voteStake).to.eq(VOTE_STAKE);
      expect(bet.isResolved).to.be.false;
    });

    it("should fail with incorrect platform stake", async function () {
      await expect(
        contract.connect(signers.creator).createBet("bet1", VOTE_STAKE, DURATION, { 
          value: ethers.parseEther("0.01") // Wrong amount
        })
      ).to.be.revertedWith("Must stake the current platform fee");
    });

    it("should fail with vote stake too low", async function () {
      await expect(
        contract.connect(signers.creator).createBet("bet1", ethers.parseEther("0.001"), DURATION, { 
          value: PLATFORM_STAKE 
        })
      ).to.be.revertedWith("Vote stake too low");
    });

    it("should fail with invalid duration", async function () {
      await expect(
        contract.connect(signers.creator).createBet("bet1", VOTE_STAKE, 60, { value: PLATFORM_STAKE }) // Too short
      ).to.be.revertedWith("Invalid duration");
    });

    it("should fail if bet already exists", async function () {
      await contract.connect(signers.creator).createBet("bet1", VOTE_STAKE, DURATION, { value: PLATFORM_STAKE });
      
      await expect(
        contract.connect(signers.creator).createBet("bet1", VOTE_STAKE, DURATION, { value: PLATFORM_STAKE })
      ).to.be.revertedWith("Bet already exists");
    });
  });

  describe("✅ Voting", function () {
    const betId = "vote-test";

    beforeEach(async function () {
      await contract.connect(signers.creator).createBet(betId, VOTE_STAKE, DURATION, { value: PLATFORM_STAKE });
    });

    it("should allow voting YES", async function () {
      const weight = 1;
      const voteType = 1; // YES
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.voter1.address)
        .add64(weight)
        .encrypt();

      await expect(
        contract
          .connect(signers.voter1)
          .vote(betId, encrypted.handles[0], voteType, encrypted.inputProof, { value: VOTE_STAKE })
      ).to.emit(contract, "VoteCast");

      expect(await contract.hasVoted(betId, signers.voter1.address)).to.be.true;
    });

    it("should allow voting NO", async function () {
      const weight = 1;
      const voteType = 0; // NO
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.voter1.address)
        .add64(weight)
        .encrypt();

      await contract
        .connect(signers.voter1)
        .vote(betId, encrypted.handles[0], voteType, encrypted.inputProof, { value: VOTE_STAKE });

      expect(await contract.hasVoted(betId, signers.voter1.address)).to.be.true;
    });

    it("should prevent double voting", async function () {
      const weight = 1;
      const voteType = 1;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.voter1.address)
        .add64(weight)
        .encrypt();

      await contract
        .connect(signers.voter1)
        .vote(betId, encrypted.handles[0], voteType, encrypted.inputProof, { value: VOTE_STAKE });

      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, signers.voter1.address)
        .add64(weight)
        .encrypt();

      await expect(
        contract
          .connect(signers.voter1)
          .vote(betId, encrypted2.handles[0], voteType, encrypted2.inputProof, { value: VOTE_STAKE })
      ).to.be.revertedWith("Already voted");
    });

    it("should fail with incorrect vote stake", async function () {
      const weight = 1;
      const voteType = 1;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.voter1.address)
        .add64(weight)
        .encrypt();

      await expect(
        contract
          .connect(signers.voter1)
          .vote(betId, encrypted.handles[0], voteType, encrypted.inputProof, { value: ethers.parseEther("0.001") })
      ).to.be.revertedWith("Incorrect vote stake");
    });

    it("should allow multiple voters", async function () {
      // Voter 1 votes YES
      const encrypted1 = await fhevm
        .createEncryptedInput(contractAddress, signers.voter1.address)
        .add64(1)
        .encrypt();
      await contract
        .connect(signers.voter1)
        .vote(betId, encrypted1.handles[0], 1, encrypted1.inputProof, { value: VOTE_STAKE });

      // Voter 2 votes NO
      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, signers.voter2.address)
        .add64(1)
        .encrypt();
      await contract
        .connect(signers.voter2)
        .vote(betId, encrypted2.handles[0], 0, encrypted2.inputProof, { value: VOTE_STAKE });

      // Voter 3 votes YES
      const encrypted3 = await fhevm
        .createEncryptedInput(contractAddress, signers.voter3.address)
        .add64(1)
        .encrypt();
      await contract
        .connect(signers.voter3)
        .vote(betId, encrypted3.handles[0], 1, encrypted3.inputProof, { value: VOTE_STAKE });

      expect(await contract.hasVoted(betId, signers.voter1.address)).to.be.true;
      expect(await contract.hasVoted(betId, signers.voter2.address)).to.be.true;
      expect(await contract.hasVoted(betId, signers.voter3.address)).to.be.true;
    });
  });

  describe("✅ Reveal Status", function () {
    const betId = "reveal-test";

    beforeEach(async function () {
      await contract.connect(signers.creator).createBet(betId, VOTE_STAKE, DURATION, { value: PLATFORM_STAKE });
    });

    it("should return correct reveal status before reveal", async function () {
      const status = await contract.getRevealStatus(betId);
      expect(status.isResolved).to.be.false;
      expect(status.revealRequested).to.be.false;
    });
  });

  describe("✅ Testing Mode Resolution", function () {
    const betId = "test-resolve";

    beforeEach(async function () {
      // Enable testing mode
      await contract.connect(signers.deployer).setTesting(true);
      
      // Create bet
      await contract.connect(signers.creator).createBet(betId, VOTE_STAKE, DURATION, { value: PLATFORM_STAKE });
      
      // Mark voters with weight=1 each
      await contract.connect(signers.deployer).testingMarkVoted(betId, signers.voter1.address, 1, 1); // YES, weight=1
      await contract.connect(signers.deployer).testingMarkVoted(betId, signers.voter2.address, 0, 1); // NO, weight=1
      await contract.connect(signers.deployer).testingMarkVoted(betId, signers.voter3.address, 1, 1); // YES, weight=1
      
      // Fund prize pool
      await contract.connect(signers.deployer).testingFundPrizePool(betId, { value: VOTE_STAKE * 3n });
    });

    it("should resolve bet with YES winning", async function () {
      await contract.connect(signers.deployer).testingResolve(betId, 2, 1); // YES wins

      const bet = await contract.getBet(betId);
      expect(bet.isResolved).to.be.true;
      expect(bet.yesWon).to.be.true;
      expect(bet.yesVotes).to.eq(2);
      expect(bet.noVotes).to.eq(1);
    });

    it("should resolve bet with NO winning", async function () {
      await contract.connect(signers.deployer).testingResolve(betId, 1, 3); // NO wins

      const bet = await contract.getBet(betId);
      expect(bet.isResolved).to.be.true;
      expect(bet.yesWon).to.be.false;
    });

    it("should allow winners to claim prize", async function () {
      await contract.connect(signers.deployer).testingResolve(betId, 2, 1); // YES wins

      const balanceBefore = await ethers.provider.getBalance(signers.voter1.address);
      
      await expect(
        contract.connect(signers.voter1).claimPrize(betId)
      ).to.emit(contract, "PrizeDistributed");

      const balanceAfter = await ethers.provider.getBalance(signers.voter1.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("should prevent losers from claiming prize", async function () {
      await contract.connect(signers.deployer).testingResolve(betId, 2, 1); // YES wins

      await expect(
        contract.connect(signers.voter2).claimPrize(betId) // Voter2 voted NO
      ).to.be.revertedWith("Not a winner");
    });

    it("should prevent double claiming", async function () {
      await contract.connect(signers.deployer).testingResolve(betId, 2, 1); // YES wins

      await contract.connect(signers.voter1).claimPrize(betId);

      await expect(
        contract.connect(signers.voter1).claimPrize(betId)
      ).to.be.revertedWith("Already claimed");
    });
  });

  describe("✅ Tie Refunds", function () {
    const betId = "tie-test";

    beforeEach(async function () {
      await contract.connect(signers.deployer).setTesting(true);
      await contract.connect(signers.creator).createBet(betId, VOTE_STAKE, DURATION, { value: PLATFORM_STAKE });
      await contract.connect(signers.deployer).testingMarkVoted(betId, signers.voter1.address, 1, 1); // YES, weight=1
      await contract.connect(signers.deployer).testingMarkVoted(betId, signers.voter2.address, 0, 1); // NO, weight=1
      await contract.connect(signers.deployer).testingFundPrizePool(betId, { value: VOTE_STAKE * 2n });
    });

    it("should allow refund on tie", async function () {
      await contract.connect(signers.deployer).testingResolve(betId, 1, 1); // Tie

      await expect(
        contract.connect(signers.voter1).claimRefund(betId)
      ).to.emit(contract, "RefundClaimed");
    });

    it("should prevent prize claim on tie", async function () {
      await contract.connect(signers.deployer).testingResolve(betId, 1, 1); // Tie

      await expect(
        contract.connect(signers.voter1).claimPrize(betId)
      ).to.be.revertedWith("Tie, use claimRefund");
    });
  });

  describe("✅ Admin Functions", function () {
    it("should allow owner to withdraw platform fees", async function () {
      await contract.connect(signers.creator).createBet("admin-test", VOTE_STAKE, DURATION, { value: PLATFORM_STAKE });

      const balanceBefore = await ethers.provider.getBalance(signers.deployer.address);
      
      await expect(
        contract.connect(signers.deployer).withdrawPlatformFees(signers.deployer.address)
      ).to.emit(contract, "PlatformFeesWithdrawn");

      const balanceAfter = await ethers.provider.getBalance(signers.deployer.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("should allow owner to update platform stake", async function () {
      const newStake = ethers.parseEther("0.05");
      await contract.connect(signers.deployer).setPlatformStake(newStake);
      expect(await contract.platformStake()).to.eq(newStake);
    });

    it("should prevent non-owner from admin functions", async function () {
      await expect(
        contract.connect(signers.voter1).setPlatformStake(ethers.parseEther("0.1"))
      ).to.be.revertedWith("Not owner");
    });
  });

  // ❌ Common Pitfalls
  describe("❌ Error Cases", function () {
    it("should fail when voting on non-existent bet", async function () {
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.voter1.address)
        .add64(1)
        .encrypt();

      await expect(
        contract
          .connect(signers.voter1)
          .vote("non-existent", encrypted.handles[0], 1, encrypted.inputProof, { value: VOTE_STAKE })
      ).to.be.revertedWith("Bet doesn't exist");
    });

    it("should fail when claiming before resolution", async function () {
      await contract.connect(signers.creator).createBet("unresolved", VOTE_STAKE, DURATION, { value: PLATFORM_STAKE });

      await expect(
        contract.connect(signers.voter1).claimPrize("unresolved")
      ).to.be.revertedWith("Bet not resolved");
    });

    it("should fail when non-voter tries to claim", async function () {
      await contract.connect(signers.deployer).setTesting(true);
      await contract.connect(signers.creator).createBet("no-vote", VOTE_STAKE, DURATION, { value: PLATFORM_STAKE });
      await contract.connect(signers.deployer).testingResolve("no-vote", 1, 0);

      await expect(
        contract.connect(signers.voter1).claimPrize("no-vote")
      ).to.be.revertedWith("Did not vote");
    });
  });
});

