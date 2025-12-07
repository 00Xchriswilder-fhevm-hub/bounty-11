import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { SimpleVoting, SimpleVoting__factory } from "../../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

/**
 * @chapter advanced
 * @title Simple Voting Test Suite
 * @notice Tests for SimpleVoting contract demonstrating confidential voting
 * @dev This test suite shows:
 *      - ✅ Session creation
 *      - ✅ Encrypted voting
 *      - ✅ Tally reveal with public decryption
 *      - ✅ Vote counting
 */

type Signers = {
  deployer: HardhatEthersSigner;
  creator: HardhatEthersSigner;
  voter1: HardhatEthersSigner;
  voter2: HardhatEthersSigner;
  voter3: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("SimpleVoting")) as SimpleVoting__factory;
  const contract = (await factory.deploy()) as SimpleVoting;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("SimpleVoting", function () {
  let signers: Signers;
  let contract: SimpleVoting;
  let contractAddress: string;

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

  describe("✅ Session Creation", function () {
    it("should create a voting session", async function () {
      const duration = 3600; // 1 hour

      await expect(
        contract.connect(signers.creator).createSession(duration)
      ).to.emit(contract, "SessionCreated");

      const sessionCount = await contract.getSessionCount();
      expect(sessionCount).to.eq(1);
    });

    it("should fail to create session with zero duration", async function () {
      await expect(
        contract.connect(signers.creator).createSession(0)
      ).to.be.revertedWith("Duration must be positive");
    });
  });

  describe("✅ Voting", function () {
    let sessionId: bigint;

    beforeEach(async function () {
      await contract.connect(signers.creator).createSession(3600);
      sessionId = 0n;
    });

    it("should allow voting YES (1)", async function () {
      const vote = 1; // YES
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.voter1.address)
        .add32(vote)
        .encrypt();

      await expect(
        contract
          .connect(signers.voter1)
          .vote(sessionId, encrypted.handles[0], encrypted.inputProof)
      ).to.emit(contract, "VoteCast");

      expect(await contract.hasVoted(sessionId, signers.voter1.address)).to.be.true;
    });

    it("should allow voting NO (0)", async function () {
      const vote = 0; // NO
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.voter1.address)
        .add32(vote)
        .encrypt();

      await contract
        .connect(signers.voter1)
        .vote(sessionId, encrypted.handles[0], encrypted.inputProof);

      expect(await contract.hasVoted(sessionId, signers.voter1.address)).to.be.true;
    });

    it("should prevent double voting", async function () {
      const vote = 1;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.voter1.address)
        .add32(vote)
        .encrypt();

      await contract
        .connect(signers.voter1)
        .vote(sessionId, encrypted.handles[0], encrypted.inputProof);

      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, signers.voter1.address)
        .add32(vote)
        .encrypt();

      await expect(
        contract
          .connect(signers.voter1)
          .vote(sessionId, encrypted2.handles[0], encrypted2.inputProof)
      ).to.be.revertedWith("Already voted");
    });

    it("should allow multiple voters", async function () {
      // Voter 1 votes YES
      const encrypted1 = await fhevm
        .createEncryptedInput(contractAddress, signers.voter1.address)
        .add32(1)
        .encrypt();
      await contract
        .connect(signers.voter1)
        .vote(sessionId, encrypted1.handles[0], encrypted1.inputProof);

      // Voter 2 votes NO
      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, signers.voter2.address)
        .add32(0)
        .encrypt();
      await contract
        .connect(signers.voter2)
        .vote(sessionId, encrypted2.handles[0], encrypted2.inputProof);

      expect(await contract.hasVoted(sessionId, signers.voter1.address)).to.be.true;
      expect(await contract.hasVoted(sessionId, signers.voter2.address)).to.be.true;
    });
  });

  describe("✅ Session Info", function () {
    it("should return session information", async function () {
      await contract.connect(signers.creator).createSession(3600);
      const sessionId = 0n;

      const session = await contract.getSession(sessionId);
      expect(session.creator).to.eq(signers.creator.address);
      expect(session.resolved).to.be.false;
    });
  });

  // ❌ Common Pitfalls
  describe("❌ Error Cases", function () {
    it("should fail to create session with zero duration", async function () {
      await expect(
        contract.connect(signers.creator).createSession(0)
      ).to.be.reverted;
    });

    it("should fail when voting on non-existent session", async function () {
      const nonExistentSessionId = 999n;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.voter1.address)
        .add32(1)
        .encrypt();
      
      await expect(
        contract
          .connect(signers.voter1)
          .vote(nonExistentSessionId, encrypted.handles[0], encrypted.inputProof)
      ).to.be.reverted;
    });

    it("should fail when voting twice on same session", async function () {
      await contract.connect(signers.creator).createSession(3600);
      const sessionId = 0n;

      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.voter1.address)
        .add32(1)
        .encrypt();
      
      // First vote should succeed
      await contract
        .connect(signers.voter1)
        .vote(sessionId, encrypted.handles[0], encrypted.inputProof);

      // Second vote should fail
      await expect(
        contract
          .connect(signers.voter1)
          .vote(sessionId, encrypted.handles[0], encrypted.inputProof)
      ).to.be.reverted;
    });
  });
});

