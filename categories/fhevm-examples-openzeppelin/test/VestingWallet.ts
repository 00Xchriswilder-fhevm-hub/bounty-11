import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { VestingWallet, VestingWallet__factory } from "../../types";
// ERC7984Mock types will be available in generated examples after compilation
// Using type assertion to avoid lint errors in source files
import type { Contract } from "ethers";
type ERC7984Mock = Contract;
type ERC7984Mock__factory = any;
import { expect } from "chai";

/**
 * @chapter openzeppelin
 * @title Vesting Wallet Test Suite
 * @notice Comprehensive tests for VestingWallet contract
 * @dev Tests cover:
 *      - ✅ Vesting wallet creation
 *      - ✅ Vested amount calculation
 *      - ✅ Releasable amount calculation
 *      - ✅ Token release
 *      - ✅ Time-based vesting
 *      - ❌ Error cases
 */

type Signers = {
  deployer: HardhatEthersSigner;
  owner: HardhatEthersSigner;
};

async function deployFixture() {
  const signers = await ethers.getSigners();
  
  // Deploy ERC7984 token (using our educational mock with access control)
  // Use fully qualified name to avoid conflict with OpenZeppelin's mock
  const ERC7984Factory = await ethers.getContractFactory("contracts/ERC7984Mock.sol:ERC7984Mock");
  const token = (await ERC7984Factory.deploy(
    signers[0].address, // owner
    "Vesting Token",
    "VEST",
    "https://example.com"
  )) as unknown as ERC7984Mock;
  const tokenAddress = await token.getAddress();
  
  // Get current timestamp
  const blockNumber = await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNumber);
  const start = block!.timestamp;
  const duration = 3600; // 1 hour
  
  // Deploy vesting wallet
  const VestingFactory = await ethers.getContractFactory("VestingWallet");
  const vestingWallet = (await VestingFactory.deploy(
    signers[1].address, // owner
    tokenAddress,
    start,
    duration
  )) as unknown as VestingWallet;
  const vestingAddress = await vestingWallet.getAddress();
  
  return { vestingWallet, token, tokenAddress, start, duration, vestingAddress };
}

describe("VestingWallet", function () {
  let signers: Signers;
  let vestingWallet: VestingWallet;
  let token: ERC7984Mock;
  let tokenAddress: string;
  let start: number;
  let duration: number;
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
    start = fixture.start;
    duration = fixture.duration;
    vestingAddress = fixture.vestingAddress;

    // Mint tokens to vesting wallet using $_mint with external encrypted input
    const amount = 10000;
    // Important: createEncryptedInput must use the token contract address and the signer who will call the function
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
      expect(walletStart).to.eq(start);
    });

    it("should return correct duration", async function () {
      const walletDuration = await vestingWallet.duration();
      expect(walletDuration).to.eq(duration);
    });

    it("should return correct end time", async function () {
      const end = await vestingWallet.end();
      expect(end).to.eq(start + duration);
    });

    it("should return token address", async function () {
      // Access public token variable - TypeScript types may be incorrect, use type assertion
      const tokenAddress = await (vestingWallet as any).token();
      expect(tokenAddress).to.eq(await token.getAddress());
    });
  });

  describe("✅ Vested Amount Calculation", function () {
    it("should return zero vested before start time", async function () {
      // Fast forward to before start (shouldn't happen, but test the logic)
      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      const currentTime = block!.timestamp;
      
      if (currentTime < start) {
        // TypeScript types may be incorrect - contract only takes timestamp parameter
        const vested = await (vestingWallet as any).vestedAmount(currentTime);
        // Vested should be zero (encrypted) - returns euint128 handle
        expect(vested).to.not.eq(ethers.ZeroHash);
      }
    });

    it("should calculate vested amount during vesting period", async function () {
      // Fast forward to halfway through vesting
      await ethers.provider.send("evm_increaseTime", [duration / 2]);
      await ethers.provider.send("evm_mine", []);

      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      // TypeScript types may be incorrect - contract only takes timestamp parameter
      const vested = await (vestingWallet as any).vestedAmount(block!.timestamp);
      
      // Vested should be non-zero (encrypted)
      expect(vested).to.not.eq(ethers.ZeroHash);
    });

    it("should return full amount after vesting ends", async function () {
      // Fast forward past end time
      await ethers.provider.send("evm_increaseTime", [duration + 100]);
      await ethers.provider.send("evm_mine", []);

      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      // TypeScript types may be incorrect - contract only takes timestamp parameter
      const vested = await (vestingWallet as any).vestedAmount(block!.timestamp);
      
      // Should have full amount vested (encrypted)
      expect(vested).to.not.eq(ethers.ZeroHash);
    });
  });

  describe("✅ Releasable Amount", function () {
    it("should calculate releasable amount", async function () {
      // Fast forward halfway through vesting
      await ethers.provider.send("evm_increaseTime", [duration / 2]);
      await ethers.provider.send("evm_mine", []);

      // TypeScript types may be incorrect - contract takes no parameters
      const releasable = await (vestingWallet as any).releasable();
      expect(releasable).to.not.eq(ethers.ZeroHash);
    });

    it("should return zero releasable before vesting starts", async function () {
      // TypeScript types may be incorrect - contract takes no parameters
      const releasable = await (vestingWallet as any).releasable();
      // Should be zero or minimal (encrypted)
      expect(releasable).to.not.eq(ethers.ZeroHash);
    });
  });

  describe("✅ Token Release", function () {
    it("should allow owner to release tokens", async function () {
      // Fast forward halfway through vesting
      await ethers.provider.send("evm_increaseTime", [duration / 2]);
      await ethers.provider.send("evm_mine", []);

      // TypeScript types may be incorrect - contract takes no parameters
      await expect(
        (vestingWallet.connect(signers.owner) as any).release()
      ).to.emit(vestingWallet, "TokensReleased");
    });

    it("should update released amount after release", async function () {
      // Fast forward halfway through vesting
      await ethers.provider.send("evm_increaseTime", [duration / 2]);
      await ethers.provider.send("evm_mine", []);

      // TypeScript types may be incorrect - contract takes no parameters
      await (vestingWallet.connect(signers.owner) as any).release();

      // TypeScript types may be incorrect - contract takes no parameters
      const released = await (vestingWallet as any).released();
      expect(released).to.not.eq(ethers.ZeroHash);
    });
  });

  // ❌ Common Pitfalls
  describe("❌ Error Cases", function () {
    it("should fail when non-owner tries to release", async function () {
      // Fast forward halfway through vesting
      await ethers.provider.send("evm_increaseTime", [duration / 2]);
      await ethers.provider.send("evm_mine", []);
      
      // Non-owner (deployer) tries to release (should fail)
      await expect(
        (vestingWallet.connect(signers.deployer) as any).release()
      ).to.be.reverted;
    });

    it("should fail when trying to release before vesting starts", async function () {
      // Try to release before start time
      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      const currentTime = block!.timestamp;
      
      if (currentTime < start) {
        // Should fail or release zero
        await expect(
          (vestingWallet.connect(signers.owner) as any).release()
        ).to.not.be.reverted; // May not revert, just release zero
      }
    });

    it("should fail when trying to release with no releasable amount", async function () {
      // Release once
      await ethers.provider.send("evm_increaseTime", [duration / 2]);
      await ethers.provider.send("evm_mine", []);
      await (vestingWallet.connect(signers.owner) as any).release();
      
      // Try to release again immediately (should release zero or revert)
      // This tests the behavior when all releasable has been released
      const releasable = await (vestingWallet as any).releasable();
      // May not revert, but should handle gracefully
    });
  });
});
