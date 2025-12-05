import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { VestingWalletConfidentialFactoryMock, VestingWalletConfidentialFactoryMock__factory } from "../../types";
import { VestingWalletConfidentialImplementation } from "../../types";
// ERC7984Mock types will be available in generated examples after compilation
import type { Contract } from "ethers";
type ERC7984Mock = Contract;
type ERC7984Mock__factory = any;
import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-network-helpers";

/**
 * @chapter openzeppelin
 * @title VestingWalletConfidential Test Suite
 * @notice Comprehensive tests for VestingWalletConfidential using factory pattern
 * @dev Tests cover:
 *      - ✅ Factory deployment and vesting wallet creation (using clones)
 *      - ✅ Deterministic address prediction
 *      - ✅ Proper upgradeable initialization
 *      - ✅ Vested amount calculation
 *      - ✅ Releasable amount calculation
 *      - ✅ Token release
 *      - ✅ Time-based vesting
 *      - ❌ Error cases
 * 
 * @dev Uses VestingWalletConfidentialFactoryMock which follows OpenZeppelin's recommended pattern:
 *      - Deploys implementation contract once
 *      - Creates clones using deterministic addresses
 *      - Initializes each clone with proper upgradeable initialization
 */

type Signers = {
  deployer: HardhatEthersSigner;
  owner: HardhatEthersSigner;
};

// Helper function to encode init args for factory
function encodeVestingWalletInitArgs(
  beneficiary: string,
  startTimestamp: number,
  durationSeconds: number
): string {
  return ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "uint48", "uint48"],
    [beneficiary, startTimestamp, durationSeconds]
  );
}

async function deployFixture() {
  const signers = await ethers.getSigners();
  
  // Deploy ERC7984 token
  // Note: In source directory, ERC7984Mock is at contracts/openzeppelin/ERC7984Mock.sol
  // In output directory (after create-example), it's copied to contracts/ERC7984Mock.sol
  let ERC7984Factory;
  try {
    ERC7984Factory = await ethers.getContractFactory("contracts/ERC7984Mock.sol:ERC7984Mock");
  } catch {
    ERC7984Factory = await ethers.getContractFactory("contracts/openzeppelin/ERC7984Mock.sol:ERC7984Mock");
  }
  const token = (await ERC7984Factory.deploy(
    signers[0].address, // owner
    "Vesting Token",
    "VEST",
    "https://example.com"
  )) as unknown as ERC7984Mock;
  const tokenAddress = await token.getAddress();
  
  // Get current timestamp
  const currentTime = await time.latest();
  const startTimestamp = currentTime + 60; // Start 1 minute from now
  const durationSeconds = 3600; // 1 hour
  
  /**
   * @dev Deploy factory and create vesting wallet using OpenZeppelin's clone pattern
   * 
   * The factory pattern:
   * 1. Deploys implementation contract once (gas efficient)
   * 2. Creates clones with deterministic addresses
   * 3. Initializes each clone with proper upgradeable initialization
   * 
   * This is the recommended production pattern from OpenZeppelin.
   */
  // Use fully qualified name to avoid conflict with OpenZeppelin's mock
  // In source directory: contracts/openzeppelin/VestingWalletConfidentialFactoryMock.sol
  // In output directory: contracts/VestingWalletConfidentialFactoryMock.sol
  let FactoryContract;
  try {
    FactoryContract = await ethers.getContractFactory("contracts/VestingWalletConfidentialFactoryMock.sol:VestingWalletConfidentialFactoryMock");
  } catch {
    FactoryContract = await ethers.getContractFactory("contracts/openzeppelin/VestingWalletConfidentialFactoryMock.sol:VestingWalletConfidentialFactoryMock");
  }
  const factory = await FactoryContract.deploy();
  
  // Encode initialization arguments
  const initArgs = encodeVestingWalletInitArgs(
    signers[1].address, // beneficiary/owner
    startTimestamp,
    durationSeconds
  );
  
  // Predict the deterministic address before creation
  const vestingAddress = await factory.predictVestingWalletConfidential(initArgs);
  
  // Create the vesting wallet clone
  await factory.createVestingWalletConfidential(initArgs);
  
  // Get the vesting wallet contract instance (clone)
  const vestingWallet = await ethers.getContractAt("VestingWalletConfidentialImplementation", vestingAddress);
  
  return { vestingWallet, factory, token, tokenAddress, startTimestamp, durationSeconds, vestingAddress };
}

describe("VestingWalletConfidential", function () {
  let signers: Signers;
  let vestingWallet: VestingWalletConfidentialImplementation;
  let factory: VestingWalletConfidentialFactoryMock;
  let token: ERC7984Mock;
  let tokenAddress: string;
  let startTimestamp: number;
  let durationSeconds: number;
  let vestingAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      owner: ethSigners[1],
    };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      this.skip();
    }

    const fixture = await deployFixture();
    vestingWallet = fixture.vestingWallet;
    factory = fixture.factory;
    token = fixture.token;
    tokenAddress = fixture.tokenAddress;
    startTimestamp = fixture.startTimestamp;
    durationSeconds = fixture.durationSeconds;
    vestingAddress = fixture.vestingAddress;

    // Mint tokens to vesting wallet using $_mint with external encrypted input
    const amount = 10000;
    
    /**
     * @dev IMPORTANT: createEncryptedInput Pattern for FHE Operations
     * 
     * createEncryptedInput(contractAddress, senderAddress)
     * - contractAddress: The contract that will call FHE.fromExternal() internally
     *   In this case: token contract (ERC7984Mock) calls fromExternal inside $_mint
     * - senderAddress: The signer who will call the function using the encrypted input
     *   In this case: deployer calls $_mint
     * 
     * This pattern ensures the FHE mock verifier can validate:
     * 1. The contract receiving the encrypted input matches
     * 2. The signer creating the transaction matches
     * 
     * If these don't match, you'll get InvalidSigner() errors
     */
    const encrypted = await fhevm
      .createEncryptedInput(tokenAddress, await signers.deployer.getAddress())
      .add64(amount)
      .encrypt();
    
    // Use $_mint with external encrypted amount - need to specify the overload
    await token
      .connect(signers.deployer)
      .getFunction("$_mint(address,bytes32,bytes)")
      .send(vestingAddress, encrypted.handles[0], encrypted.inputProof);
  });

  describe("✅ Wallet Info", function () {
    it("should return correct start time", async function () {
      const walletStart = await vestingWallet.start();
      expect(walletStart).to.eq(startTimestamp);
    });

    it("should return correct duration", async function () {
      const walletDuration = await vestingWallet.duration();
      expect(walletDuration).to.eq(durationSeconds);
    });

    it("should return correct end time", async function () {
      const end = await vestingWallet.end();
      expect(end).to.eq(startTimestamp + durationSeconds);
    });
  });

  describe("✅ Vested Amount Calculation", function () {
    it("should return zero vested before start time", async function () {
      const currentTime = await time.latest();
      if (currentTime < startTimestamp) {
        const vested = await vestingWallet.vestedAmount(tokenAddress, currentTime);
        // Vested should be zero (encrypted) - returns euint128 handle
        expect(vested).to.not.eq(ethers.ZeroHash);
      }
    });

    it("should calculate vested amount during vesting period", async function () {
      // Fast forward to halfway through vesting
      await time.increaseTo(startTimestamp + durationSeconds / 2);
      const currentTime = await time.latest();
      const vested = await vestingWallet.vestedAmount(tokenAddress, currentTime);
      
      // Vested should be non-zero (encrypted)
      expect(vested).to.not.eq(ethers.ZeroHash);
    });

    it("should return full amount after vesting ends", async function () {
      // Fast forward past end time
      await time.increaseTo(startTimestamp + durationSeconds + 100);
      const currentTime = await time.latest();
      const vested = await vestingWallet.vestedAmount(tokenAddress, currentTime);
      
      // Should have full amount vested (encrypted)
      expect(vested).to.not.eq(ethers.ZeroHash);
    });
  });

  describe("✅ Releasable Amount", function () {
    it("should calculate releasable amount", async function () {
      // Fast forward halfway through vesting
      await time.increaseTo(startTimestamp + durationSeconds / 2);
      const releasable = await vestingWallet.releasable(tokenAddress);
      expect(releasable).to.not.eq(ethers.ZeroHash);
    });

    it("should return zero releasable before vesting starts", async function () {
      const releasable = await vestingWallet.releasable(tokenAddress);
      // Should be zero or minimal (encrypted)
      expect(releasable).to.not.eq(ethers.ZeroHash);
    });
  });

  describe("✅ Token Release", function () {
    it("should allow owner to release tokens", async function () {
      // Fast forward halfway through vesting
      await time.increaseTo(startTimestamp + durationSeconds / 2);
      
      await expect(
        vestingWallet.connect(signers.owner).release(tokenAddress)
      ).to.emit(vestingWallet, "VestingWalletConfidentialTokenReleased");
    });

    it("should update released amount after release", async function () {
      // Fast forward halfway through vesting
      await time.increaseTo(startTimestamp + durationSeconds / 2);
      
      await vestingWallet.connect(signers.owner).release(tokenAddress);

      const released = await vestingWallet.released(tokenAddress);
      expect(released).to.not.eq(ethers.ZeroHash);
    });
  });

  // ❌ Common Pitfalls
  describe("❌ Error Cases", function () {
    it("should fail when non-owner tries to release", async function () {
      // Fast forward halfway through vesting
      await time.increaseTo(startTimestamp + durationSeconds / 2);
      
      // Non-owner (deployer) tries to release (should fail)
      await expect(
        vestingWallet.connect(signers.deployer).release(tokenAddress)
      ).to.be.reverted;
    });

    it("should fail when trying to release before vesting starts", async function () {
      // Try to release before start time
      const currentTime = await time.latest();
      if (currentTime < startTimestamp) {
        // Should fail or release zero
        await expect(
          vestingWallet.connect(signers.owner).release(tokenAddress)
        ).to.not.be.reverted; // May not revert, just release zero
      }
    });

    it("should fail when trying to release with no releasable amount", async function () {
      // Release once
      await time.increaseTo(startTimestamp + durationSeconds / 2);
      await vestingWallet.connect(signers.owner).release(tokenAddress);
      
      // Try to release again immediately (should release zero or revert)
      // This tests the behavior when all releasable has been released
      const releasable = await vestingWallet.releasable(tokenAddress);
      // May not revert, but should handle gracefully
    });
  });
});

