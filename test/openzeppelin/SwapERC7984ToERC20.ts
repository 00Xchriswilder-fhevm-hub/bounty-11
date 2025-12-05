import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { SwapERC7984ToERC20, SwapERC7984ToERC20__factory } from "../../types";
// ERC7984Mock types will be available in generated examples after compilation
import type { Contract } from "ethers";
type ERC7984Mock = Contract;
type ERC7984Mock__factory = any;
import { ERC20Mock } from "../../types";
import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-network-helpers";

/**
 * @chapter openzeppelin
 * @title Swap ERC7984 to ERC20 Test Suite
 * @notice Comprehensive tests for SwapERC7984ToERC20 contract
 * @dev Tests cover:
 *      - ✅ Swap initiation
 *      - ✅ Swap finalization
 *      - ✅ Two-phase swap pattern
 *      - ✅ Decryption proof verification
 *      - ❌ Error cases
 */

type Signers = {
  deployer: HardhatEthersSigner;
  user: HardhatEthersSigner;
  recipient: HardhatEthersSigner;
};

async function deployFixture() {
  const signers = await ethers.getSigners();
  
  // Deploy ERC20 token
  // Note: ERC20Mock from test/helpers is copied to contracts/ by the script
  // Use fully qualified name to avoid conflict with OpenZeppelin's ERC20Mock
  // In source directory: contracts/openzeppelin/ERC20Mock.sol
  // In output directory: contracts/ERC20Mock.sol
  let ERC20Factory;
  try {
    ERC20Factory = await ethers.getContractFactory("contracts/ERC20Mock.sol:ERC20Mock");
  } catch {
    ERC20Factory = await ethers.getContractFactory("contracts/openzeppelin/ERC20Mock.sol:ERC20Mock");
  }
  const erc20Token = (await ERC20Factory.deploy("Test ERC20", "T20")) as unknown as ERC20Mock;
  
  // Deploy ERC7984 token (using ERC7984Mock with access control)
  // Note: In source directory, ERC7984Mock is at contracts/openzeppelin/ERC7984Mock.sol
  // In output directory (after create-example), it's copied to contracts/ERC7984Mock.sol
  let ERC7984Factory;
  try {
    ERC7984Factory = await ethers.getContractFactory("contracts/ERC7984Mock.sol:ERC7984Mock");
  } catch {
    ERC7984Factory = await ethers.getContractFactory("contracts/openzeppelin/ERC7984Mock.sol:ERC7984Mock");
  }
  const erc7984Token = (await ERC7984Factory.deploy(
    signers[0].address, // owner
    "Test ERC7984",
    "T7984",
    "https://example.com"
  )) as unknown as ERC7984Mock;
  
  // Deploy swap contract - constructor takes (ERC7984Mock fromToken, IERC20 toToken, uint256 rate)
  // Note: In source directory, SwapERC7984ToERC20 is at contracts/openzeppelin/SwapERC7984ToERC20.sol
  // In output directory (after create-example), it's copied to contracts/SwapERC7984ToERC20.sol
  let SwapFactory;
  try {
    SwapFactory = await ethers.getContractFactory("contracts/SwapERC7984ToERC20.sol:SwapERC7984ToERC20");
  } catch {
    SwapFactory = await ethers.getContractFactory("contracts/openzeppelin/SwapERC7984ToERC20.sol:SwapERC7984ToERC20");
  }
  const swapContract = (await SwapFactory.deploy(
    await erc7984Token.getAddress(), 
    await erc20Token.getAddress(),
    1 // 1:1 swap rate
  )) as unknown as SwapERC7984ToERC20;
  
  return { swapContract, erc7984Token, erc20Token, swapAddress: await swapContract.getAddress() };
}

describe("SwapERC7984ToERC20", function () {
  let signers: Signers;
  let swapContract: SwapERC7984ToERC20;
  let erc7984Token: ERC7984Mock;
  let erc20Token: ERC20Mock;
  let swapAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      user: ethSigners[1],
      recipient: ethSigners[2],
    };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      this.skip();
    }

    const fixture = await deployFixture();
    swapContract = fixture.swapContract;
    erc7984Token = fixture.erc7984Token;
    erc20Token = fixture.erc20Token;
    swapAddress = fixture.swapAddress;

    // Mint ERC7984 tokens to user
    // IMPORTANT: createEncryptedInput(contractAddress, senderAddress) - matches VestingWallet pattern
    // contractAddress: token contract address (where fromExternal is called inside $_mint)
    // senderAddress: deployer (who calls $_mint)
    const amount = 1000;
    const tokenAddress = await erc7984Token.getAddress();
    const encrypted = await fhevm
      .createEncryptedInput(tokenAddress, signers.deployer.address)
      .add64(amount)
      .encrypt();
    await (erc7984Token.connect(signers.deployer) as any)
      .getFunction("$_mint(address,bytes32,bytes)")
      .send(signers.user.address, encrypted.handles[0], encrypted.inputProof);
    
    // Add liquidity to swap contract (ERC20 tokens)
    await erc20Token.mint(swapAddress, 10000);

    // Mint ERC20 tokens to swap contract
    await erc20Token.mint(swapAddress, 10000);
  });

  describe("✅ Swap Initiation", function () {
    it("should initiate swap from ERC7984 to ERC20", async function () {
      // ✅ NEW PATTERN: User transfers first, then calls initiateSwap
      // Step 1: User transfers tokens to swap contract using confidentialTransfer
      const swapAmount = 500;
      const tokenAddress = await erc7984Token.getAddress();
      const swapAddress = await swapContract.getAddress();
      
      // Create encrypted input for the token contract (where confidentialTransfer is called)
      const encrypted = await fhevm
        .createEncryptedInput(tokenAddress, signers.user.address)
        .add64(swapAmount)
        .encrypt();

      // User transfers tokens to swap contract using getFunction to disambiguate
      await (erc7984Token.connect(signers.user) as any)
        .getFunction("confidentialTransfer(address,bytes32,bytes)")
        .send(swapAddress, encrypted.handles[0], encrypted.inputProof);

      // Step 2: Get the swap contract's balance (which is now the transferred amount)
      const swapBalance = await erc7984Token.confidentialBalanceOf(swapAddress);
      
      // Step 3: Call initiateSwap with the balance
      await expect(
        (swapContract.connect(signers.user) as any).initiateSwap(swapBalance)
      ).to.not.be.reverted;
    });

    it("should transfer ERC7984 tokens to swap contract", async function () {
      const swapAmount = 300;
      const tokenAddress = await erc7984Token.getAddress();
      const swapAddress = await swapContract.getAddress();
      
      // Create encrypted input for the token contract
      const encrypted = await fhevm
        .createEncryptedInput(tokenAddress, signers.user.address)
        .add64(swapAmount)
        .encrypt();

      // User transfers tokens to swap contract using getFunction to disambiguate
      await (erc7984Token.connect(signers.user) as any)
        .getFunction("confidentialTransfer(address,bytes32,bytes)")
        .send(swapAddress, encrypted.handles[0], encrypted.inputProof);

      // Check that swap contract has encrypted balance
      const swapBalance = await erc7984Token.confidentialBalanceOf(swapAddress);
      expect(swapBalance).to.not.eq(ethers.ZeroHash);
      
      // Initiate swap
      await (swapContract.connect(signers.user) as any).initiateSwap(swapBalance);
    });
  });

  describe("✅ Swap Finalization", function () {
    it("should finalize swap with correct decryption proof", async function () {
      const swapAmount = 200;
      const tokenAddress = await erc7984Token.getAddress();
      const swapAddress = await swapContract.getAddress();
      
      // Step 1: User transfers tokens to swap contract
      const encrypted = await fhevm
        .createEncryptedInput(tokenAddress, signers.user.address)
        .add64(swapAmount)
        .encrypt();

      await (erc7984Token.connect(signers.user) as any)
        .getFunction("confidentialTransfer(address,bytes32,bytes)")
        .send(swapAddress, encrypted.handles[0], encrypted.inputProof);

      // Step 2: Get swap contract's balance
      const swapBalance = await erc7984Token.confidentialBalanceOf(swapAddress);
      expect(swapBalance).to.not.eq(ethers.ZeroHash);

      // Step 3: Initiate swap - this makes the amount publicly decryptable
      const tx = await (swapContract.connect(signers.user) as any).initiateSwap(swapBalance);
      
      // Get the encrypted amount from the SwapInitiated event
      const receipt = await tx.wait();
      const swapInitiatedEvent = receipt?.logs.find(
        (log: any) => {
          try {
            const parsed = swapContract.interface.parseLog(log);
            return parsed?.name === "SwapInitiated";
          } catch {
            return false;
          }
        }
      );
      
      expect(swapInitiatedEvent).to.not.be.undefined;
      const parsedEvent = swapContract.interface.parseLog(swapInitiatedEvent!);
      const encryptedAmount = parsedEvent?.args[1]; // Second arg is encryptedAmount (euint64)
      
      // Decrypt the publicly decryptable amount
      const encryptedAmountHandle = ethers.hexlify(encryptedAmount);
      const decryptionResults = await fhevm.publicDecrypt([encryptedAmountHandle]);
      
      // Extract cleartext amount and decryption proof
      const cleartextAmount = Number((decryptionResults.clearValues as any)[encryptedAmountHandle]);
      const decryptionProof = decryptionResults.decryptionProof;
      
      // Verify the amount matches
      expect(cleartextAmount).to.eq(swapAmount);
      
      // Finalize the swap - now takes euint64 instead of bytes32
      await (swapContract as any).finalizeSwap(encryptedAmount, cleartextAmount, decryptionProof);
      
      // Verify ERC20 tokens were transferred to user (rate is 1:1, so amount should match)
      const userBalance = await erc20Token.balanceOf(signers.user.address);
      expect(userBalance).to.eq(swapAmount);
    });
  });

  describe("❌ Error Cases", function () {
    it("should fail when trying to initiate swap without transferring first", async function () {
      const swapAmount = 100;
      const tokenAddress = await erc7984Token.getAddress();
      
      // Create a dummy encrypted amount (not actually transferred)
      const encrypted = await fhevm
        .createEncryptedInput(tokenAddress, signers.user.address)
        .add64(swapAmount)
        .encrypt();

      // Try to initiate swap with an amount that wasn't transferred to the contract
      // This should fail because the amount is not allowed for the swap contract
      const dummyBalance = encrypted.handles[0];
      
      await expect(
        (swapContract.connect(signers.user) as any).initiateSwap(dummyBalance)
      ).to.be.revertedWith("Swap: amount not allowed for swap contract");
    });

    it("should fail when finalizing swap with wrong decryption proof", async function () {
      const swapAmount = 200;
      const tokenAddress = await erc7984Token.getAddress();
      const swapAddress = await swapContract.getAddress();
      
      // Transfer and initiate swap
      const encrypted = await fhevm
        .createEncryptedInput(tokenAddress, signers.user.address)
        .add64(swapAmount)
        .encrypt();

      await (erc7984Token.connect(signers.user) as any)
        .getFunction("confidentialTransfer(address,bytes32,bytes)")
        .send(swapAddress, encrypted.handles[0], encrypted.inputProof);

      const swapBalance = await erc7984Token.confidentialBalanceOf(swapAddress);
      const tx = await (swapContract.connect(signers.user) as any).initiateSwap(swapBalance);
      const receipt = await tx.wait();
      
      const swapInitiatedEvent = receipt?.logs.find(
        (log: any) => {
          try {
            const parsed = swapContract.interface.parseLog(log);
            return parsed?.name === "SwapInitiated";
          } catch {
            return false;
          }
        }
      );
      
      const parsedEvent = swapContract.interface.parseLog(swapInitiatedEvent!);
      const encryptedAmount = parsedEvent?.args[1];
      
      // Try to finalize with wrong amount
      const wrongAmount = swapAmount + 100;
      const encryptedAmountHandle = ethers.hexlify(encryptedAmount);
      const decryptionResults = await fhevm.publicDecrypt([encryptedAmountHandle]);
      const decryptionProof = decryptionResults.decryptionProof;
      
      await expect(
        (swapContract as any).finalizeSwap(encryptedAmount, wrongAmount, decryptionProof)
      ).to.be.reverted;
    });

    it("should fail when finalizing swap with invalid handle", async function () {
      const swapAmount = 200;
      const tokenAddress = await erc7984Token.getAddress();
      const swapAddress = await swapContract.getAddress();
      
      // Step 1: Complete a swap to get a finalized handle (not in _pendingSwaps anymore)
      const encrypted1 = await fhevm
        .createEncryptedInput(tokenAddress, signers.user.address)
        .add64(swapAmount)
        .encrypt();

      await (erc7984Token.connect(signers.user) as any)
        .getFunction("confidentialTransfer(address,bytes32,bytes)")
        .send(swapAddress, encrypted1.handles[0], encrypted1.inputProof);

      const swapBalance1 = await erc7984Token.confidentialBalanceOf(swapAddress);
      const tx1 = await (swapContract.connect(signers.user) as any).initiateSwap(swapBalance1);
      const receipt1 = await tx1.wait();
      
      const swapInitiatedEvent1 = receipt1?.logs.find(
        (log: any) => {
          try {
            const parsed = swapContract.interface.parseLog(log);
            return parsed?.name === "SwapInitiated";
          } catch {
            return false;
          }
        }
      );
      const parsedEvent1 = swapContract.interface.parseLog(swapInitiatedEvent1!);
      const finalizedEncryptedAmount = parsedEvent1?.args[1];
      
      // Decrypt and finalize the first swap
      const finalizedHandle = ethers.hexlify(finalizedEncryptedAmount);
      const finalizedDecryption = await fhevm.publicDecrypt([finalizedHandle]);
      const finalizedCleartext = Number((finalizedDecryption.clearValues as any)[finalizedHandle]);
      const finalizedProof = finalizedDecryption.decryptionProof;
      
      // Finalize the swap (removes it from _pendingSwaps)
      await (swapContract as any).finalizeSwap(finalizedEncryptedAmount, finalizedCleartext, finalizedProof);
      
      // Step 2: Try to finalize again with the same handle (now invalid - not in _pendingSwaps)
      // This should fail with InvalidSwapRequest
      await expect(
        (swapContract as any).finalizeSwap(
          finalizedEncryptedAmount,
          finalizedCleartext,
          finalizedProof
        )
      ).to.be.revertedWithCustomError(swapContract, "InvalidSwapRequest");
    });
  });
});
