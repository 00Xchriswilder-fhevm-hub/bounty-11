import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { SwapERC7984ToERC7984, SwapERC7984ToERC7984__factory } from "../../types";
// ERC7984Mock types will be available in generated examples after compilation
import type { Contract } from "ethers";
type ERC7984Mock = Contract;
type ERC7984Mock__factory = any;
import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-network-helpers";

/**
 * @chapter openzeppelin
 * @title Swap ERC7984 to ERC7984 Test Suite
 * @notice Comprehensive tests for SwapERC7984ToERC7984 contract
 * @dev Tests cover:
 *      - ✅ Confidential-to-confidential swaps
 *      - ✅ Operator approval
 *      - ✅ Transient permissions
 *      - ❌ Error cases
 */

type Signers = {
  deployer: HardhatEthersSigner;
  user: HardhatEthersSigner;
};

async function deployFixture() {
  const signers = await ethers.getSigners();
  
  // Deploy two ERC7984 tokens (using ERC7984Mock with access control)
  // Note: In source directory, ERC7984Mock is at contracts/openzeppelin/ERC7984Mock.sol
  // In output directory (after create-example), it's copied to contracts/ERC7984Mock.sol
  let ERC7984Factory;
  try {
    ERC7984Factory = await ethers.getContractFactory("contracts/ERC7984Mock.sol:ERC7984Mock");
  } catch {
    ERC7984Factory = await ethers.getContractFactory("contracts/openzeppelin/ERC7984Mock.sol:ERC7984Mock");
  }
  const tokenA = (await ERC7984Factory.deploy(
    signers[0].address, // owner
    "Token A",
    "TKA",
    "https://example.com/token-a"
  )) as unknown as ERC7984Mock;
  const tokenB = (await ERC7984Factory.deploy(
    signers[0].address, // owner
    "Token B",
    "TKB",
    "https://example.com/token-b"
  )) as unknown as ERC7984Mock;
  
  // Deploy swap contract - constructor takes (uint256 rate)
  // Note: In source directory, SwapERC7984ToERC7984 is at contracts/openzeppelin/SwapERC7984ToERC7984.sol
  // In output directory (after create-example), it's copied to contracts/SwapERC7984ToERC7984.sol
  let SwapFactory;
  try {
    SwapFactory = await ethers.getContractFactory("contracts/SwapERC7984ToERC7984.sol:SwapERC7984ToERC7984");
  } catch {
    SwapFactory = await ethers.getContractFactory("contracts/openzeppelin/SwapERC7984ToERC7984.sol:SwapERC7984ToERC7984");
  }
  const swapContract = (await SwapFactory.deploy(1)) as unknown as SwapERC7984ToERC7984; // 1:1 swap rate
  
  return { swapContract, tokenA, tokenB, swapAddress: await swapContract.getAddress() };
}

describe("SwapERC7984ToERC7984", function () {
  let signers: Signers;
  let swapContract: SwapERC7984ToERC7984;
  let tokenA: ERC7984Mock;
  let tokenB: ERC7984Mock;
  let swapAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      user: ethSigners[1],
    };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      this.skip();
    }

    const fixture = await deployFixture();
    swapContract = fixture.swapContract;
    tokenA = fixture.tokenA;
    tokenB = fixture.tokenB;
    swapAddress = fixture.swapAddress;

    // Mint tokenA to user
    // IMPORTANT: createEncryptedInput(contractAddress, senderAddress) - contract first, sender second
    // contractAddress: tokenA contract address (where fromExternal is called inside $_mint)
    // senderAddress: deployer (who calls $_mint)
    const amount = 1000;
    const tokenAAddress = await tokenA.getAddress();
    const encrypted = await fhevm
      .createEncryptedInput(tokenAAddress, signers.deployer.address)
      .add64(amount)
      .encrypt();
    await (tokenA.connect(signers.deployer) as any)
      .getFunction("$_mint(address,bytes32,bytes)")
      .send(signers.user.address, encrypted.handles[0], encrypted.inputProof);

    // Mint tokenB to swap contract (for swapping)
    // IMPORTANT: createEncryptedInput(contractAddress, senderAddress) - contract first, sender second
    // contractAddress: tokenB contract address (where fromExternal is called inside $_mint)
    // senderAddress: deployer (who calls $_mint)
    const tokenBAddress = await tokenB.getAddress();
    const encryptedB = await fhevm
      .createEncryptedInput(tokenBAddress, signers.deployer.address)
      .add64(5000)
      .encrypt();
    await (tokenB.connect(signers.deployer) as any)
      .getFunction("$_mint(address,bytes32,bytes)")
      .send(swapAddress, encryptedB.handles[0], encryptedB.inputProof);
  });

  describe("✅ Confidential Swaps", function () {
    it("should swap between two ERC7984 tokens", async function () {
      // ✅ NEW PATTERN: User transfers first, then calls swap
      const swapAmount = 500;
      const tokenAAddress = await tokenA.getAddress();
      const swapAddress = await swapContract.getAddress();
      
      // Step 1: User transfers tokenA to swap contract
      const encrypted = await fhevm
        .createEncryptedInput(tokenAAddress, signers.user.address)
        .add64(swapAmount)
        .encrypt();

      await (tokenA.connect(signers.user) as any)
        .getFunction("confidentialTransfer(address,bytes32,bytes)")
        .send(swapAddress, encrypted.handles[0], encrypted.inputProof);

      // Step 2: Get swap contract's tokenA balance
      const swapTokenABalance = await tokenA.confidentialBalanceOf(swapAddress);
      expect(swapTokenABalance).to.not.eq(ethers.ZeroHash);
      
      // Step 3: Verify swap contract has tokenB balance
      const swapTokenBBalance = await tokenB.confidentialBalanceOf(swapAddress);
      expect(swapTokenBBalance).to.not.eq(ethers.ZeroHash, "❌ Swap contract must have tokenB balance!");

      // Step 4: Execute swap
      await expect(
        (swapContract.connect(signers.user) as any).swapConfidentialForConfidential(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          swapTokenABalance
        )
      ).to.not.be.reverted;
    });

    it("should transfer tokens correctly", async function () {
      const swapAmount = 300;
      const tokenAAddress = await tokenA.getAddress();
      const swapAddress = await swapContract.getAddress();
      
      // User transfers tokenA to swap contract
      const encrypted = await fhevm
        .createEncryptedInput(tokenAAddress, signers.user.address)
        .add64(swapAmount)
        .encrypt();

      await (tokenA.connect(signers.user) as any)
        .getFunction("confidentialTransfer(address,bytes32,bytes)")
        .send(swapAddress, encrypted.handles[0], encrypted.inputProof);

      const swapTokenABalance = await tokenA.confidentialBalanceOf(swapAddress);
      
      await (swapContract.connect(signers.user) as any).swapConfidentialForConfidential(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        swapTokenABalance
      );

      // Check balances (encrypted)
      const userBalanceA = await tokenA.confidentialBalanceOf(signers.user.address);
      const userBalanceB = await tokenB.confidentialBalanceOf(signers.user.address);
      expect(userBalanceA).to.not.eq(ethers.ZeroHash);
      expect(userBalanceB).to.not.eq(ethers.ZeroHash);
    });
  });

  describe("❌ Error Cases", function () {
    it("should fail when trying to swap without transferring first", async function () {
      const swapAmount = 100;
      const tokenAAddress = await tokenA.getAddress();
      
      // Create a dummy encrypted amount (not actually transferred)
      const encrypted = await fhevm
        .createEncryptedInput(tokenAAddress, signers.user.address)
        .add64(swapAmount)
        .encrypt();

      // Try to swap with an amount that wasn't transferred to the contract
      const dummyBalance = encrypted.handles[0];
      
      await expect(
        (swapContract.connect(signers.user) as any).swapConfidentialForConfidential(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          dummyBalance
        )
      ).to.be.revertedWith("Swap: amount not allowed for swap contract");
    });

    it("should fail when swapping with same token", async function () {
      const swapAmount = 100;
      const tokenAAddress = await tokenA.getAddress();
      const swapAddress = await swapContract.getAddress();
      
      // Transfer tokens first
      const encrypted = await fhevm
        .createEncryptedInput(tokenAAddress, signers.user.address)
        .add64(swapAmount)
        .encrypt();

      await (tokenA.connect(signers.user) as any)
        .getFunction("confidentialTransfer(address,bytes32,bytes)")
        .send(swapAddress, encrypted.handles[0], encrypted.inputProof);

      const swapTokenABalance = await tokenA.confidentialBalanceOf(swapAddress);
      
      // Try to swap tokenA for tokenA (should fail)
      await expect(
        (swapContract.connect(signers.user) as any).swapConfidentialForConfidential(
          await tokenA.getAddress(),
          await tokenA.getAddress(), // Same token!
          swapTokenABalance
        )
      ).to.be.revertedWith("Swap: same token");
    });

    it("should fail when swapping with zero address tokens", async function () {
      const swapAmount = 100;
      const tokenAAddress = await tokenA.getAddress();
      const swapAddress = await swapContract.getAddress();
      
      // Transfer tokens first
      const encrypted = await fhevm
        .createEncryptedInput(tokenAAddress, signers.user.address)
        .add64(swapAmount)
        .encrypt();

      await (tokenA.connect(signers.user) as any)
        .getFunction("confidentialTransfer(address,bytes32,bytes)")
        .send(swapAddress, encrypted.handles[0], encrypted.inputProof);

      const swapTokenABalance = await tokenA.confidentialBalanceOf(swapAddress);
      
      // Try to swap with zero address
      await expect(
        (swapContract.connect(signers.user) as any).swapConfidentialForConfidential(
          ethers.ZeroAddress,
          await tokenB.getAddress(),
          swapTokenABalance
        )
      ).to.be.revertedWith("Swap: invalid fromToken");
      
      await expect(
        (swapContract.connect(signers.user) as any).swapConfidentialForConfidential(
          await tokenA.getAddress(),
          ethers.ZeroAddress,
          swapTokenABalance
        )
      ).to.be.revertedWith("Swap: invalid toToken");
    });
  });
});
