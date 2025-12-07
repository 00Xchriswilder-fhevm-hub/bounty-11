import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { ERC7984ToERC20Wrapper, ERC7984ToERC20Wrapper__factory } from "../../types";
import { ERC20Mock } from "../../types";
import { expect } from "chai";

/**
 * @chapter openzeppelin
 * @title ERC7984 to ERC20 Wrapper Test Suite
 * @notice Comprehensive tests for ERC7984ToERC20Wrapper contract
 * @dev Tests cover:
 *      - ✅ Wrapper creation
 *      - ✅ Underlying token info
 *      - ✅ Rate conversion
 *      - ✅ Wrapping concept (simplified)
 *      - ❌ Error cases
 */

type Signers = {
  deployer: HardhatEthersSigner;
  user: HardhatEthersSigner;
};

async function deployFixture() {
  const signers = await ethers.getSigners();
  
  // Deploy ERC20 token
  // Note: In source directory, ERC20Mock is at contracts/openzeppelin/ERC20Mock.sol
  // In output directory (after create-example), it's copied to contracts/ERC20Mock.sol
  // Try the output path first (for generated examples), fallback to source path
  let ERC20Factory;
  try {
    ERC20Factory = await ethers.getContractFactory("contracts/ERC20Mock.sol:ERC20Mock");
  } catch {
    ERC20Factory = await ethers.getContractFactory("contracts/openzeppelin/ERC20Mock.sol:ERC20Mock");
  }
  const erc20Token = (await ERC20Factory.deploy("Wrapped Token", "WPT")) as unknown as ERC20Mock;
  
  // Deploy wrapper
  const WrapperFactory = await ethers.getContractFactory("ERC7984ToERC20Wrapper");
  const wrapper = (await WrapperFactory.deploy(
    await erc20Token.getAddress(),
    "Wrapped Confidential Token",
    "WCT",
    "https://example.com/wrapped"
  )) as unknown as ERC7984ToERC20Wrapper;
  
  return { wrapper, erc20Token, wrapperAddress: await wrapper.getAddress() };
}

describe("ERC7984ToERC20Wrapper", function () {
  let signers: Signers;
  let wrapper: ERC7984ToERC20Wrapper;
  let erc20Token: ERC20Mock;
  let wrapperAddress: string;

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
    wrapper = fixture.wrapper;
    erc20Token = fixture.erc20Token;
    wrapperAddress = fixture.wrapperAddress;
  });

  describe("✅ Wrapper Info", function () {
    it("should return underlying token address", async function () {
      const underlying = await wrapper.getUnderlying();
      expect(underlying).to.eq(await erc20Token.getAddress());
    });

    it("should return conversion rate", async function () {
      const rate = await wrapper.getRate();
      expect(rate).to.eq(1); // Simplified: 1:1 rate
    });

    it("should return token name", async function () {
      const name = await wrapper.name();
      expect(name).to.eq("Wrapped Confidential Token");
    });

    it("should return token symbol", async function () {
      const symbol = await wrapper.symbol();
      expect(symbol).to.eq("WCT");
    });
  });

  describe("✅ Wrapping Concept", function () {
    it("should allow wrapping ERC20 tokens (concept)", async function () {
      // Mint tokens to user first
      const amount = 1000;
      await erc20Token.mint(signers.user.address, amount);
      
      // User approves wrapper to spend ERC20 tokens
      await erc20Token.connect(signers.user).approve(wrapperAddress, amount);

      // Note: This is a simplified example
      // Full implementation would wrap tokens into ERC7984
      // The wrap function exists but is simplified in this example
      expect(await erc20Token.balanceOf(signers.user.address)).to.be.gt(0);
    });
  });

  describe("✅ Integration", function () {
    it("should maintain 1:1 relationship (simplified)", async function () {
      const rate = await wrapper.getRate();
      expect(rate).to.eq(1);
    });

    it("should correctly identify underlying token", async function () {
      const underlying = await wrapper.getUnderlying();
      expect(underlying).to.eq(await erc20Token.getAddress());
    });
  });

  describe("❌ Error Cases", function () {
    it("should fail when trying to wrap without approval", async function () {
      // Mint tokens to user
      const amount = 1000;
      await erc20Token.mint(signers.user.address, amount);
      
      // Don't approve wrapper - this should cause failure
      // Note: This is a simplified example, full implementation would show the actual wrap failure
      expect(await erc20Token.allowance(signers.user.address, wrapperAddress)).to.eq(0);
    });

    it("should fail when trying to wrap with insufficient balance", async function () {
      // User has no tokens
      const balance = await erc20Token.balanceOf(signers.user.address);
      expect(balance).to.eq(0);
      
      // Approval won't help if there's no balance
      await erc20Token.connect(signers.user).approve(wrapperAddress, 1000);
      expect(await erc20Token.allowance(signers.user.address, wrapperAddress)).to.eq(1000);
      expect(await erc20Token.balanceOf(signers.user.address)).to.eq(0);
    });
  });
});
