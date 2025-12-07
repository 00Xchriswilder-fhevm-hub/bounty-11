import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
// ERC7984Mock types will be available in generated examples after compilation
// Using type assertion to avoid lint errors in source files
import type { Contract } from "ethers";
type ERC7984Mock = Contract;
type ERC7984Mock__factory = any;
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

/**
 * @chapter openzeppelin
 * @title ERC7984 Mock Test Suite
 * @notice Comprehensive tests for ERC7984Mock contract (OpenZeppelin's mock)
 * @dev Tests cover:
 *      - ✅ Token creation and metadata
 *      - ✅ Confidential minting
 *      - ✅ Confidential burning
 *      - ✅ Confidential transfers
 *      - ✅ Balance queries
 *      - ✅ Access control (Ownable)
 *      - ❌ Failure cases
 */

type Signers = {
  deployer: HardhatEthersSigner;
  owner: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  // Use fully qualified name to avoid conflict with OpenZeppelin's mock
  // Note: In source directory, ERC7984Mock is at contracts/openzeppelin/ERC7984Mock.sol
  // In output directory (after create-example), it's copied to contracts/ERC7984Mock.sol
  // Try the output path first (for generated examples), fallback to source path
  let factory;
  try {
    factory = await ethers.getContractFactory("contracts/ERC7984Mock.sol:ERC7984Mock");
  } catch {
    factory = await ethers.getContractFactory("contracts/openzeppelin/ERC7984Mock.sol:ERC7984Mock");
  }
  const owner = (await ethers.getSigners())[1];
  const contract = (await factory.deploy(
    await owner.getAddress(), // owner
    "Test Token",
    "TEST",
    "https://example.com"
  )) as unknown as ERC7984Mock;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("ERC7984Mock", function () {
  let signers: Signers;
  let contract: ERC7984Mock;
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
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());
  });

  describe("✅ Token Info", function () {
    it("should return token name", async function () {
      const name = await contract.name();
      expect(name).to.eq("Test Token");
    });

    it("should return token symbol", async function () {
      const symbol = await contract.symbol();
      expect(symbol).to.eq("TEST");
    });

    it("should return contract URI", async function () {
      const uri = await contract.contractURI();
      expect(uri).to.eq("https://example.com");
    });
  });

  describe("✅ Confidential Minting", function () {
    it("should allow minting tokens", async function () {
      const amount = 1000;
      // IMPORTANT: createEncryptedInput(contractAddress, senderAddress) - contract first, sender second
      // contractAddress: token contract address (where fromExternal is called inside $_mint)
      // senderAddress: signers.owner (who calls $_mint)
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, await signers.owner.getAddress())
        .add64(amount)
        .encrypt();

      // Use $_mint (OpenZeppelin mock function) - only owner can mint
      await contract
        .connect(signers.owner)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.alice.address, encrypted.handles[0], encrypted.inputProof);

      // Check balance (encrypted)
      const encryptedBalance = await contract.confidentialBalanceOf(signers.alice.address);
      expect(encryptedBalance).to.not.eq(ethers.ZeroHash);
    });

    it("should allow minting multiple times", async function () {
      const amount1 = 500;
      const encrypted1 = await fhevm
        .createEncryptedInput(contractAddress, await signers.owner.getAddress())
        .add64(amount1)
        .encrypt();
      await (contract.connect(signers.owner) as any)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.alice.address, encrypted1.handles[0], encrypted1.inputProof);

      const amount2 = 300;
      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, await signers.owner.getAddress())
        .add64(amount2)
        .encrypt();
      await (contract.connect(signers.owner) as any)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.alice.address, encrypted2.handles[0], encrypted2.inputProof);

      const encryptedBalance = await contract.confidentialBalanceOf(signers.alice.address);
      expect(encryptedBalance).to.not.eq(ethers.ZeroHash);
    });

    it("should allow minting to different addresses", async function () {
      const amount = 1000;
      
      // Mint to Alice
      const encrypted1 = await fhevm
        .createEncryptedInput(contractAddress, await signers.owner.getAddress())
        .add64(amount)
        .encrypt();
      await (contract.connect(signers.owner) as any)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.alice.address, encrypted1.handles[0], encrypted1.inputProof);

      // Mint to Bob
      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, await signers.owner.getAddress())
        .add64(amount)
        .encrypt();
      await contract
        .connect(signers.owner)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.bob.address, encrypted2.handles[0], encrypted2.inputProof);

      const aliceBalance = await contract.confidentialBalanceOf(signers.alice.address);
      const bobBalance = await contract.confidentialBalanceOf(signers.bob.address);
      expect(aliceBalance).to.not.eq(ethers.ZeroHash);
      expect(bobBalance).to.not.eq(ethers.ZeroHash);
    });
  });

  describe("✅ Confidential Burning", function () {
    beforeEach(async function () {
      // Mint tokens first (as owner)
      const amount = 1000;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, await signers.owner.getAddress())
        .add64(amount)
        .encrypt();
      // Use $_mint (OpenZeppelin mock function) - only owner can mint
      await contract
        .connect(signers.owner)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.alice.address, encrypted.handles[0], encrypted.inputProof);
    });

    it("should allow owner to burn tokens", async function () {
      const burnAmount = 200;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, await signers.owner.getAddress())
        .add64(burnAmount)
        .encrypt();

      // Only owner can burn (access control via Ownable)
      await contract
        .connect(signers.owner)
        .getFunction("$_burn(address,bytes32,bytes)")
        .send(signers.alice.address, encrypted.handles[0], encrypted.inputProof);

      const encryptedBalance = await contract.confidentialBalanceOf(signers.alice.address);
      expect(encryptedBalance).to.not.eq(ethers.ZeroHash);
    });
  });

  describe("❌ Failure Cases", function () {
    it("should fail when non-owner tries to mint", async function () {
      const amount = 1000;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(amount)
        .encrypt();

      // Alice is not the owner, so minting should fail
      await expect(
        contract
          .connect(signers.alice)
          .getFunction("$_mint(address,bytes32,bytes)")
          .send(signers.alice.address, encrypted.handles[0], encrypted.inputProof)
      ).to.be.reverted;
    });

    it("should fail when non-owner tries to burn", async function () {
      // First mint tokens as owner
      const mintAmount = 1000;
      const encryptedMint = await fhevm
        .createEncryptedInput(contractAddress, await signers.owner.getAddress())
        .add64(mintAmount)
        .encrypt();
      await contract
        .connect(signers.owner)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.alice.address, encryptedMint.handles[0], encryptedMint.inputProof);

      // Now try to burn as non-owner (should fail)
      const burnAmount = 200;
      const encryptedBurn = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(burnAmount)
        .encrypt();

      await expect(
        contract
          .connect(signers.alice)
          .getFunction("$_burn(address,bytes32,bytes)")
          .send(signers.alice.address, encryptedBurn.handles[0], encryptedBurn.inputProof)
      ).to.be.reverted;
    });

    it("should fail when trying to transfer without proper permissions", async function () {
      // First mint tokens as owner
      const amount = 1000;
      const encryptedMint = await fhevm
        .createEncryptedInput(contractAddress, await signers.owner.getAddress())
        .add64(amount)
        .encrypt();
      await contract
        .connect(signers.owner)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.alice.address, encryptedMint.handles[0], encryptedMint.inputProof);

      // Try to transfer with wrong signer (should fail due to ACL)
      const transferAmount = 100;
      const encryptedTransfer = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address) // Wrong signer!
        .add64(transferAmount)
        .encrypt();

      await expect(
        (contract.connect(signers.alice) as any)
          .getFunction("confidentialTransfer(address,bytes32,bytes)")
          .send(signers.bob.address, encryptedTransfer.handles[0], encryptedTransfer.inputProof)
      ).to.be.reverted;
    });
  });

});
