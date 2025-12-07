import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";
import type { Contract } from "ethers";
type ConfidentialYieldAggregator = Contract;
type ConfidentialYieldAggregator__factory = any;
type ERC7984Mock = Contract;
type ERC7984Mock__factory = any;

/**
 * @chapter advanced
 * @title Confidential Yield Aggregator Test Suite
 * @notice Tests for ConfidentialYieldAggregator contract demonstrating complex FHE operations
 * @dev This test suite shows:
 *      - ✅ Strategy management (add/remove strategies)
 *      - ✅ Depositing and withdrawing encrypted funds
 *      - ✅ Calculating yield with encrypted values
 *      - ✅ Rebalancing based on encrypted allocations
 *      - ✅ Compounding yield with encrypted amounts
 *      - ❌ Failure cases and edge conditions
 */

type Signers = {
  deployer: HardhatEthersSigner;
  owner: HardhatEthersSigner;
  user: HardhatEthersSigner;
  alice: HardhatEthersSigner;
};

async function deployFixture() {
  const rebalancingThreshold = 500; // 5% in basis points

  // Deploy ERC7984 tokens
  let tokenFactory: ERC7984Mock__factory;
  try {
    tokenFactory = await ethers.getContractFactory("contracts/ERC7984Mock.sol:ERC7984Mock") as unknown as ERC7984Mock__factory;
  } catch {
    tokenFactory = await ethers.getContractFactory("contracts/openzeppelin/ERC7984Mock.sol:ERC7984Mock") as unknown as ERC7984Mock__factory;
  }

  const owner = (await ethers.getSigners())[1];
  const strategyToken = (await tokenFactory.deploy(
    await owner.getAddress(),
    "Strategy Token",
    "ST",
    "https://strategy-token.com"
  )) as unknown as ERC7984Mock;

  // Deploy yield aggregator (deployer becomes owner)
  const deployer = (await ethers.getSigners())[0];
  const aggregatorFactory = (await ethers.getContractFactory("ConfidentialYieldAggregator")) as unknown as ConfidentialYieldAggregator__factory;
  const aggregator = (await aggregatorFactory.connect(deployer).deploy(rebalancingThreshold)) as ConfidentialYieldAggregator;
  const aggregatorAddress = await aggregator.getAddress();

  return { aggregator, strategyToken, aggregatorAddress };
}

describe("ConfidentialYieldAggregator", function () {
  let signers: Signers;
  let aggregator: ConfidentialYieldAggregator;
  let strategyToken: ERC7984Mock;
  let aggregatorAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      owner: ethSigners[1],
      user: ethSigners[2],
      alice: ethSigners[3],
    };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ aggregator, strategyToken, aggregatorAddress } = await deployFixture());
  });

  describe("✅ Deployment", function () {
    it("should set the right owner", async function () {
      expect(await aggregator.owner()).to.equal(signers.deployer.address);
    });

    it("should set the right rebalancing threshold", async function () {
      expect(await aggregator.rebalancingThreshold()).to.equal(500); // 5%
    });

    it("should have zero strategy count initially", async function () {
      expect(await aggregator.strategyCount()).to.equal(0);
    });
  });

  describe("✅ Strategy Management", function () {
    it("should allow owner to add strategies", async function () {
      const targetAllocation = 10000; // 100% in basis points

      await expect((aggregator.connect(signers.deployer) as any).addStrategy(strategyToken, targetAllocation))
        .to.emit(aggregator, "StrategyAdded")
        .withArgs(await strategyToken.getAddress(), targetAllocation);

      expect(await aggregator.strategyCount()).to.equal(1);

      // Check strategy info (strategies array is public, so we can access it)
      const strategyInfo = await aggregator.strategies(0);
      expect(strategyInfo[0]).to.equal(await strategyToken.getAddress()); // token
      expect(strategyInfo[1]).to.equal(targetAllocation); // targetAllocationBps
      expect(strategyInfo[5]).to.be.true; // isActive (index 5: token, targetAllocationBps, allocation, yield, lastYieldBlock, isActive)
    });

    it("should allow adding multiple strategies", async function () {
      // Deploy additional token
      const owner = (await ethers.getSigners())[1];
      let tokenFactory: ERC7984Mock__factory;
      try {
        tokenFactory = await ethers.getContractFactory("contracts/ERC7984Mock.sol:ERC7984Mock") as unknown as ERC7984Mock__factory;
      } catch {
        tokenFactory = await ethers.getContractFactory("contracts/openzeppelin/ERC7984Mock.sol:ERC7984Mock") as unknown as ERC7984Mock__factory;
      }

      const token2 = (await tokenFactory.deploy(
        await owner.getAddress(),
        "Token 2",
        "TK2",
        "https://token2.com"
      )) as unknown as ERC7984Mock;

      await (aggregator.connect(signers.deployer) as any).addStrategy(strategyToken, 5000);
      await (aggregator.connect(signers.deployer) as any).addStrategy(token2, 5000);

      expect(await aggregator.strategyCount()).to.equal(2);
    });

    it("should allow owner to remove strategy", async function () {
      await (aggregator.connect(signers.deployer) as any).addStrategy(strategyToken, 10000);

      await expect((aggregator.connect(signers.deployer) as any).removeStrategy(0))
        .to.emit(aggregator, "StrategyRemoved");

      const strategyInfo = await aggregator.strategies(0);
      expect(strategyInfo[5]).to.be.false; // isActive (index 5)
    });

    it("should allow updating rebalancing threshold", async function () {
      const newThreshold = 1000; // 10%

      await expect((aggregator.connect(signers.deployer) as any).setRebalancingThreshold(newThreshold))
        .to.emit(aggregator, "RebalancingThresholdUpdated")
        .withArgs(500, newThreshold);

      expect(await aggregator.rebalancingThreshold()).to.equal(newThreshold);
    });
  });

  describe("❌ Strategy Management Error Cases", function () {
    it("should fail when non-owner tries to add strategy", async function () {
      await expect(
        (aggregator.connect(signers.user) as any).addStrategy(strategyToken, 10000)
      ).to.be.revertedWithCustomError(aggregator, "Unauthorized");
    });

    it("should fail when adding duplicate strategy", async function () {
      await (aggregator.connect(signers.deployer) as any).addStrategy(strategyToken, 10000);

      await expect(
        (aggregator.connect(signers.deployer) as any).addStrategy(strategyToken, 5000)
      ).to.be.revertedWithCustomError(aggregator, "StrategyAlreadyExists");
    });
  });

  describe("✅ Deposits and Withdrawals", function () {
    beforeEach(async function () {
      await (aggregator.connect(signers.deployer) as any).addStrategy(strategyToken, 10000);
    });

    it("should allow depositing funds", async function () {
      const depositAmount = 1000;
      const tokenAddress = await strategyToken.getAddress();
      
      // Create encrypted input for token contract (for minting)
      const encryptedMint = await fhevm
        .createEncryptedInput(tokenAddress, await signers.owner.getAddress())
        .add64(depositAmount)
        .encrypt();

      // Mint tokens to user first
      await (strategyToken.connect(signers.owner) as any)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.user.address, encryptedMint.handles[0], encryptedMint.inputProof);

      // Transfer tokens to aggregator (needed for deposit)
      const encryptedTransfer = await fhevm
        .createEncryptedInput(tokenAddress, await signers.user.getAddress())
        .add64(depositAmount)
        .encrypt();

      await (strategyToken.connect(signers.user) as any)
        .getFunction("$_transfer(address,address,bytes32,bytes)")
        .send(
          signers.user.address,
          aggregatorAddress,
          encryptedTransfer.handles[0],
          encryptedTransfer.inputProof
        );

      // Create encrypted input for aggregator deposit
      const encrypted = await fhevm
        .createEncryptedInput(aggregatorAddress, await signers.user.getAddress())
        .add64(depositAmount)
        .encrypt();

      // Deposit
      await (aggregator.connect(signers.user) as any).deposit(encrypted.handles[0], encrypted.inputProof);

      // Check total deposited
      const encryptedDeposited = await (aggregator as any).getTotalDeposited(signers.user.address);
      expect(encryptedDeposited).to.not.eq(ethers.ZeroHash);
    });

    it("should allow withdrawing funds", async function () {
      const depositAmount = 1000;
      const withdrawAmount = 300;
      const tokenAddress = await strategyToken.getAddress();

      // Mint and deposit
      const encryptedMint = await fhevm
        .createEncryptedInput(tokenAddress, await signers.owner.getAddress())
        .add64(depositAmount)
        .encrypt();

      await (strategyToken.connect(signers.owner) as any)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.user.address, encryptedMint.handles[0], encryptedMint.inputProof);

      const encryptedTransfer = await fhevm
        .createEncryptedInput(tokenAddress, await signers.user.getAddress())
        .add64(depositAmount)
        .encrypt();

      await (strategyToken.connect(signers.user) as any)
        .getFunction("$_transfer(address,address,bytes32,bytes)")
        .send(
          signers.user.address,
          aggregatorAddress,
          encryptedTransfer.handles[0],
          encryptedTransfer.inputProof
        );

      const encryptedDeposit = await fhevm
        .createEncryptedInput(aggregatorAddress, await signers.user.getAddress())
        .add64(depositAmount)
        .encrypt();

      await (aggregator.connect(signers.user) as any).deposit(encryptedDeposit.handles[0], encryptedDeposit.inputProof);

      // Withdraw
      const encryptedWithdraw = await fhevm
        .createEncryptedInput(aggregatorAddress, await signers.user.getAddress())
        .add64(withdrawAmount)
        .encrypt();

      await (aggregator.connect(signers.user) as any).withdraw(encryptedWithdraw.handles[0], encryptedWithdraw.inputProof);

      // Check balance is not zero (still has remaining)
      const encryptedDeposited = await (aggregator as any).getTotalDeposited(signers.user.address);
      expect(encryptedDeposited).to.not.eq(ethers.ZeroHash);
    });
  });

  describe("✅ Yield Calculations", function () {
    beforeEach(async function () {
      await (aggregator.connect(signers.deployer) as any).addStrategy(strategyToken, 10000);
      
      // Deposit funds first
      const depositAmount = 1000;
      const tokenAddress = await strategyToken.getAddress();
      
      const encryptedMint = await fhevm
        .createEncryptedInput(tokenAddress, await signers.owner.getAddress())
        .add64(depositAmount)
        .encrypt();

      await (strategyToken.connect(signers.owner) as any)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.user.address, encryptedMint.handles[0], encryptedMint.inputProof);

      const encryptedTransfer = await fhevm
        .createEncryptedInput(tokenAddress, await signers.user.getAddress())
        .add64(depositAmount)
        .encrypt();

      await (strategyToken.connect(signers.user) as any)
        .getFunction("$_transfer(address,address,bytes32,bytes)")
        .send(
          signers.user.address,
          aggregatorAddress,
          encryptedTransfer.handles[0],
          encryptedTransfer.inputProof
        );

      const encryptedDeposit = await fhevm
        .createEncryptedInput(aggregatorAddress, await signers.user.getAddress())
        .add64(depositAmount)
        .encrypt();

      await (aggregator.connect(signers.user) as any).deposit(encryptedDeposit.handles[0], encryptedDeposit.inputProof);
    });

    it("should calculate yield for a strategy", async function () {
      // Calculate yield (this returns an euint64 handle)
      const encryptedYield = await (aggregator.connect(signers.user) as any).calculateYield(0);
      expect(encryptedYield).to.not.eq(ethers.ZeroHash);
    });

    it("should calculate total yield across all strategies", async function () {
      // Calculate total yield (this returns an euint64 handle)
      const tx = await (aggregator.connect(signers.user) as any).calculateTotalYield();
      await tx.wait();
      
      // Verify the transaction succeeded
      expect(tx).to.not.be.undefined;
      expect(tx.hash).to.not.be.undefined;
    });
  });

  describe("✅ Rebalancing", function () {
    beforeEach(async function () {
      await (aggregator.connect(signers.deployer) as any).addStrategy(strategyToken, 10000);
      
      // Deposit funds
      const depositAmount = 1000;
      const tokenAddress = await strategyToken.getAddress();
      
      const encryptedMint = await fhevm
        .createEncryptedInput(tokenAddress, await signers.owner.getAddress())
        .add64(depositAmount)
        .encrypt();

      await (strategyToken.connect(signers.owner) as any)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.user.address, encryptedMint.handles[0], encryptedMint.inputProof);

      const encryptedTransfer = await fhevm
        .createEncryptedInput(tokenAddress, await signers.user.getAddress())
        .add64(depositAmount)
        .encrypt();

      await (strategyToken.connect(signers.user) as any)
        .getFunction("$_transfer(address,address,bytes32,bytes)")
        .send(
          signers.user.address,
          aggregatorAddress,
          encryptedTransfer.handles[0],
          encryptedTransfer.inputProof
        );

      const encryptedDeposit = await fhevm
        .createEncryptedInput(aggregatorAddress, await signers.user.getAddress())
        .add64(depositAmount)
        .encrypt();

      await (aggregator.connect(signers.user) as any).deposit(encryptedDeposit.handles[0], encryptedDeposit.inputProof);
    });

    it("should check if rebalancing is needed", async function () {
      // Check rebalancing (this returns ebool and euint64 handles)
      const tx = await (aggregator.connect(signers.user) as any).checkRebalancingNeeded(0);
      await tx.wait();
      
      // Verify the transaction succeeded
      expect(tx).to.not.be.undefined;
      expect(tx.hash).to.not.be.undefined;
    });

    it("should allow rebalancing strategies", async function () {
      // Note: In production, rebalancing would be verified off-chain first
      // For this test, we'll just verify the function can be called
      const tx = await (aggregator.connect(signers.deployer) as any).rebalance(0);
      await tx.wait();
      
      // Verify the transaction succeeded
      expect(tx).to.not.be.undefined;
      expect(tx.hash).to.not.be.undefined;
    });
  });

  describe("✅ Compounding", function () {
    beforeEach(async function () {
      await (aggregator.connect(signers.deployer) as any).addStrategy(strategyToken, 10000);
      
      // Deposit funds
      const depositAmount = 1000;
      const tokenAddress = await strategyToken.getAddress();
      
      const encryptedMint = await fhevm
        .createEncryptedInput(tokenAddress, await signers.owner.getAddress())
        .add64(depositAmount)
        .encrypt();

      await (strategyToken.connect(signers.owner) as any)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.user.address, encryptedMint.handles[0], encryptedMint.inputProof);

      const encryptedTransfer = await fhevm
        .createEncryptedInput(tokenAddress, await signers.user.getAddress())
        .add64(depositAmount)
        .encrypt();

      await (strategyToken.connect(signers.user) as any)
        .getFunction("$_transfer(address,address,bytes32,bytes)")
        .send(
          signers.user.address,
          aggregatorAddress,
          encryptedTransfer.handles[0],
          encryptedTransfer.inputProof
        );

      const encryptedDeposit = await fhevm
        .createEncryptedInput(aggregatorAddress, await signers.user.getAddress())
        .add64(depositAmount)
        .encrypt();

      await (aggregator.connect(signers.user) as any).deposit(encryptedDeposit.handles[0], encryptedDeposit.inputProof);
    });

    it("should allow compounding yield", async function () {
      // Compound yield
      const tx = await (aggregator.connect(signers.user) as any).compound();
      await tx.wait();
      
      // Verify the transaction succeeded
      expect(tx).to.not.be.undefined;
      expect(tx.hash).to.not.be.undefined;
      
      // Check total yield
      const encryptedYield = await (aggregator as any).getTotalYield(signers.user.address);
      expect(encryptedYield).to.not.eq(ethers.ZeroHash);
    });
  });
});

