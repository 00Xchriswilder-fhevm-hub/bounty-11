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

