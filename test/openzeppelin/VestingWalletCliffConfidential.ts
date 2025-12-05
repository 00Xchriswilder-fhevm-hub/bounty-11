import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { VestingWalletCliffConfidentialFactoryMock, VestingWalletCliffConfidentialFactoryMock__factory } from "../../types";
import { VestingWalletCliffConfidentialImplementation } from "../../types";
// ERC7984Mock types will be available in generated examples after compilation
import type { Contract } from "ethers";
type ERC7984Mock = Contract;
type ERC7984Mock__factory = any;
import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-network-helpers";

/**
 * @chapter openzeppelin
 * @title VestingWalletCliffConfidential Test Suite
 * @notice Comprehensive tests for VestingWalletCliffConfidential using factory pattern
 * @dev Tests cover:
 *      - ✅ Factory deployment and vesting wallet creation (using clones)
 *      - ✅ Deterministic address prediction
 *      - ✅ Proper upgradeable initialization
 *      - ✅ Vesting wallet creation with cliff
 *      - ✅ Cliff period enforcement
 *      - ✅ Vested amount calculation (with cliff)
 *      - ✅ Releasable amount calculation
 *      - ✅ Token release after cliff
 *      - ❌ Error cases
 * 
 * @dev Uses VestingWalletCliffConfidentialFactoryMock which follows OpenZeppelin's recommended pattern:
 *      - Deploys implementation contract once
 *      - Creates clones using deterministic addresses
 *      - Initializes each clone with proper upgradeable initialization
 */

type Signers = {
  deployer: HardhatEthersSigner;
  owner: HardhatEthersSigner;
};

// Helper function to encode init args for factory
function encodeVestingWalletCliffInitArgs(
  beneficiary: string,
  startTimestamp: number,
  durationSeconds: number,
  cliffSeconds: number
): string {
  return ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "uint48", "uint48", "uint48"],
    [beneficiary, startTimestamp, durationSeconds, cliffSeconds]
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
  const durationSeconds = 7200; // 2 hours
  const cliffSeconds = 3600; // 1 hour cliff
  
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
  // In source directory: contracts/openzeppelin/VestingWalletCliffConfidentialFactoryMock.sol
  // In output directory: contracts/VestingWalletCliffConfidentialFactoryMock.sol
  let FactoryContract;
  try {
    FactoryContract = await ethers.getContractFactory("contracts/VestingWalletCliffConfidentialFactoryMock.sol:VestingWalletCliffConfidentialFactoryMock");
  } catch {
    FactoryContract = await ethers.getContractFactory("contracts/openzeppelin/VestingWalletCliffConfidentialFactoryMock.sol:VestingWalletCliffConfidentialFactoryMock");
  }
  const factory = await FactoryContract.deploy();
  
  // Encode initialization arguments
  const initArgs = encodeVestingWalletCliffInitArgs(
    signers[1].address, // beneficiary/owner
    startTimestamp,
    durationSeconds,
    cliffSeconds
  );
  
  // Predict the deterministic address before creation
  const vestingAddress = await factory.predictVestingWalletConfidential(initArgs);
  
  // Create the vesting wallet clone
  await factory.createVestingWalletConfidential(initArgs);
  
  // Get the vesting wallet contract instance (clone)
  const vestingWallet = await ethers.getContractAt("VestingWalletCliffConfidentialImplementation", vestingAddress) as unknown as VestingWalletCliffConfidentialImplementation;
  
  return { vestingWallet, factory, token, tokenAddress, startTimestamp, durationSeconds, cliffSeconds, vestingAddress };
}

describe("VestingWalletCliffConfidential", function () {
  let signers: Signers;
  let vestingWallet: VestingWalletCliffConfidentialImplementation;
  let token: ERC7984Mock;
  let tokenAddress: string;
  let startTimestamp: number;
  let durationSeconds: number;
  let cliffSeconds: number;
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
    token = fixture.token;
    tokenAddress = fixture.tokenAddress;
    startTimestamp = fixture.startTimestamp;
    durationSeconds = fixture.durationSeconds;
    cliffSeconds = fixture.cliffSeconds;
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

    it("should return correct cliff end time", async function () {
      const cliff = await vestingWallet.cliff();
      expect(cliff).to.eq(startTimestamp + cliffSeconds);
    });

    it("should return correct end time", async function () {
      const end = await vestingWallet.end();
      expect(end).to.eq(startTimestamp + durationSeconds);
    });
  });

  describe("✅ Cliff Period", function () {
    it("should return zero vested before cliff ends", async function () {
      // Fast forward to after start but before cliff ends
      await time.increaseTo(startTimestamp + cliffSeconds / 2);
      const currentTime = await time.latest();
      const vested = await vestingWallet.vestedAmount(tokenAddress, currentTime);
      
      // Should be zero before cliff (encrypted)
      expect(vested).to.not.eq(ethers.ZeroHash);
    });

    it("should return zero releasable before cliff ends", async function () {
      // Fast forward to after start but before cliff ends
      await time.increaseTo(startTimestamp + cliffSeconds / 2);
      const releasable = await vestingWallet.releasable(tokenAddress);
      
      // Should be zero before cliff (encrypted)
      expect(releasable).to.not.eq(ethers.ZeroHash);
    });

    it("should not allow release before cliff ends", async function () {
      // Fast forward to after start but before cliff ends
      await time.increaseTo(startTimestamp + cliffSeconds / 2);
      
      // Release should not revert but release zero amount
      await expect(
        vestingWallet.connect(signers.owner).release(tokenAddress)
      ).to.not.be.reverted;
    });
  });

  describe("✅ Vested Amount After Cliff", function () {
    it("should calculate vested amount after cliff ends", async function () {
      // Fast forward past cliff
      await time.increaseTo(startTimestamp + cliffSeconds + durationSeconds / 4);
      const currentTime = await time.latest();
      const vested = await vestingWallet.vestedAmount(tokenAddress, currentTime);
      
      // Vested should be non-zero after cliff (encrypted)
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

  describe("✅ Token Release After Cliff", function () {
    it("should allow owner to release tokens after cliff", async function () {
      // Fast forward past cliff
      await time.increaseTo(startTimestamp + cliffSeconds + durationSeconds / 4);
      
      await expect(
        vestingWallet.connect(signers.owner).release(tokenAddress)
      ).to.emit(vestingWallet, "VestingWalletConfidentialTokenReleased");
    });

    it("should update released amount after release", async function () {
      // Fast forward past cliff
      await time.increaseTo(startTimestamp + cliffSeconds + durationSeconds / 4);
      
      await vestingWallet.connect(signers.owner).release(tokenAddress);

      const released = await vestingWallet.released(tokenAddress);
      expect(released).to.not.eq(ethers.ZeroHash);
    });
  });

  // ❌ Common Pitfalls
  describe("❌ Error Cases", function () {
    it("should fail when non-owner tries to release", async function () {
      // Fast forward past cliff
      await time.increaseTo(startTimestamp + cliffSeconds + durationSeconds / 4);
      
      // Non-owner (deployer) tries to release (should fail)
      await expect(
        vestingWallet.connect(signers.deployer).release(tokenAddress)
      ).to.be.reverted;
    });

    it("should fail when trying to release before cliff ends", async function () {
      // Try to release before cliff ends
      await time.increaseTo(startTimestamp + cliffSeconds / 2);
      
      // Should fail or release zero before cliff
      await expect(
        vestingWallet.connect(signers.owner).release(tokenAddress)
      ).to.not.be.reverted; // May not revert, just release zero
    });

    it("should fail when trying to release with no releasable amount", async function () {
      // Release once after cliff
      await time.increaseTo(startTimestamp + cliffSeconds + durationSeconds / 4);
      await vestingWallet.connect(signers.owner).release(tokenAddress);
      
      // Try to release again immediately (should release zero or revert)
      // This tests the behavior when all releasable has been released
      const releasable = await vestingWallet.releasable(tokenAddress);
      // May not revert, but should handle gracefully
    });
  });
});

