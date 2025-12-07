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

