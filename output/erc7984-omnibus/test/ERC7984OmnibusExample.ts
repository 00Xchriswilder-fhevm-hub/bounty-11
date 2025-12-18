import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import type { Contract } from "ethers";
type ERC7984OmnibusMock = Contract;
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

/**
 * @chapter openzeppelin
 * @title ERC7984 Omnibus Mock Test Suite
 * @notice Comprehensive tests for ERC7984OmnibusMock contract
 * @dev Tests cover:
 *      - ✅ Token creation and metadata
 *      - ✅ Confidential minting
 *      - ✅ Omnibus transfers with encrypted addresses
 *      - ✅ OmnibusConfidentialTransfer events
 *      - ✅ Sub-account tracking (off-chain)
 *      - ✅ Balance queries
 *      - ❌ Failure cases
 */

type Signers = {
  deployer: HardhatEthersSigner;
  owner: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  omnibusFrom: HardhatEthersSigner;
  omnibusTo: HardhatEthersSigner;
};

async function deployFixture() {
  let factory;
  try {
    factory = await ethers.getContractFactory("contracts/ERC7984OmnibusMock.sol:ERC7984OmnibusMock");
  } catch {
    factory = await ethers.getContractFactory("contracts/openzeppelin/ERC7984OmnibusMock.sol:ERC7984OmnibusMock");
  }
  const owner = (await ethers.getSigners())[1];
  const contract = (await factory.deploy(
    await owner.getAddress(), // owner
    "Omnibus Token",
    "OMNI",
    "https://example.com/omnibus"
  )) as unknown as ERC7984OmnibusMock;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("ERC7984OmnibusMock", function () {
  let signers: Signers;
  let contract: ERC7984OmnibusMock;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      owner: ethSigners[1],
      alice: ethSigners[2],
      bob: ethSigners[3],
      omnibusFrom: ethSigners[4],
      omnibusTo: ethSigners[5],
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
      expect(name).to.eq("Omnibus Token");
    });

    it("should return token symbol", async function () {
      const symbol = await contract.symbol();
      expect(symbol).to.eq("OMNI");
    });

    it("should return contract URI", async function () {
      const uri = await contract.contractURI();
      expect(uri).to.eq("https://example.com/omnibus");
    });
  });

  describe("✅ Confidential Minting", function () {
    it("should allow minting tokens to omnibus account", async function () {
      const amount = 1000;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, await signers.owner.getAddress())
        .add64(amount)
        .encrypt();

      await contract
        .connect(signers.owner)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.omnibusFrom.address, encrypted.handles[0], encrypted.inputProof);

      const encryptedBalance = await contract.confidentialBalanceOf(signers.omnibusFrom.address);
      expect(encryptedBalance).to.not.eq(ethers.ZeroHash);
    });
  });

  describe("✅ Omnibus Transfers", function () {
    beforeEach(async function () {
      // Mint tokens to omnibusFrom account first
      const amount = 5000;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, await signers.owner.getAddress())
        .add64(amount)
        .encrypt();
      await contract
        .connect(signers.owner)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.omnibusFrom.address, encrypted.handles[0], encrypted.inputProof);
    });

    it("should perform omnibus transfer with encrypted addresses", async function () {
      const transferAmount = 1000;
      
      // Create all encrypted values in a single encrypted input (they share the same proof)
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, await signers.omnibusFrom.getAddress())
        .addAddress(await signers.alice.getAddress()) // sender (sub-account)
        .addAddress(await signers.bob.getAddress())   // recipient (sub-account)
        .add64(transferAmount)                        // amount
        .encrypt();

      // Perform omnibus transfer
      const tx = await contract
        .connect(signers.omnibusFrom)
        .getFunction("confidentialTransferOmnibus(address,bytes32,bytes32,bytes32,bytes)")
        .send(
          signers.omnibusTo.address, // omnibusTo
          encrypted.handles[0],      // externalSender (first handle)
          encrypted.handles[1],      // externalRecipient (second handle)
          encrypted.handles[2],      // externalAmount (third handle)
          encrypted.inputProof       // shared proof for all three
        );

      // Check that OmnibusConfidentialTransfer event was emitted
      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.topics[0] === ethers.id("OmnibusConfidentialTransfer(address,address,bytes32,bytes32,bytes32)")
      );
      expect(event).to.not.be.undefined;

      // Check balances
      const fromBalance = await contract.confidentialBalanceOf(signers.omnibusFrom.address);
      const toBalance = await contract.confidentialBalanceOf(signers.omnibusTo.address);
      expect(fromBalance).to.not.eq(ethers.ZeroHash);
      expect(toBalance).to.not.eq(ethers.ZeroHash);
    });

    it("should perform omnibus transfer using internal encrypted values", async function () {
      const transferAmount = 500;
      
      // First, create encrypted values using contract functions
      // Use staticCall to get return values without sending transactions
      const encryptedAmountTx = (contract
        .connect(signers.omnibusFrom) as any)
        .createEncryptedAmount.staticCall(transferAmount);
      
      const encryptedSenderTx = (contract
        .connect(signers.omnibusFrom) as any)
        .createEncryptedAddress.staticCall(await signers.alice.getAddress());
      
      const encryptedRecipientTx = (contract
        .connect(signers.omnibusFrom) as any)
        .createEncryptedAddress.staticCall(await signers.bob.getAddress());

      // Execute the transactions to create the encrypted values
      await (contract.connect(signers.omnibusFrom) as any).createEncryptedAmount(transferAmount);
      await (contract.connect(signers.omnibusFrom) as any).createEncryptedAddress(await signers.alice.getAddress());
      await (contract.connect(signers.omnibusFrom) as any).createEncryptedAddress(await signers.bob.getAddress());

      // Get the return values from static calls
      const encryptedAmount = await encryptedAmountTx;
      const encryptedSender = await encryptedSenderTx;
      const encryptedRecipient = await encryptedRecipientTx;

      // Perform omnibus transfer using internal encrypted values
      // Note: The function signature is confidentialTransferOmnibus(address,bytes32,bytes32,bytes32)
      // where bytes32 represents eaddress and euint64
      const tx = await contract
        .connect(signers.omnibusFrom)
        .getFunction("confidentialTransferOmnibus(address,bytes32,bytes32,bytes32)")
        .send(
          signers.omnibusTo.address, // omnibusTo
          encryptedSender,          // sender (eaddress) - bytes32
          encryptedRecipient,        // recipient (eaddress) - bytes32
          encryptedAmount            // amount (euint64) - bytes32
        );

      // Check that event was emitted
      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.topics[0] === ethers.id("OmnibusConfidentialTransfer(address,address,bytes32,bytes32,bytes32)")
      );
      expect(event).to.not.be.undefined;
    });

    it("should perform omnibus transferFrom with encrypted addresses", async function () {
      const transferAmount = 750;
      
      // Create all encrypted values in a single encrypted input (they share the same proof)
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, await signers.omnibusFrom.getAddress())
        .addAddress(await signers.alice.getAddress()) // sender (sub-account)
        .addAddress(await signers.bob.getAddress())   // recipient (sub-account)
        .add64(transferAmount)                        // amount
        .encrypt();

      // Perform transferFrom omnibus
      const tx = await contract
        .connect(signers.omnibusFrom)
        .getFunction("confidentialTransferFromOmnibus(address,address,bytes32,bytes32,bytes32,bytes)")
        .send(
          signers.omnibusFrom.address, // omnibusFrom
          signers.omnibusTo.address,    // omnibusTo
          encrypted.handles[0],        // externalSender (first handle)
          encrypted.handles[1],        // externalRecipient (second handle)
          encrypted.handles[2],       // externalAmount (third handle)
          encrypted.inputProof        // shared proof for all three
        );

      // Check event emission
      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.topics[0] === ethers.id("OmnibusConfidentialTransfer(address,address,bytes32,bytes32,bytes32)")
      );
      expect(event).to.not.be.undefined;
    });
  });

  describe("❌ Failure Cases", function () {
    beforeEach(async function () {
      // Mint tokens first
      const amount = 1000;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, await signers.owner.getAddress())
        .add64(amount)
        .encrypt();
      await contract
        .connect(signers.owner)
        .getFunction("$_mint(address,bytes32,bytes)")
        .send(signers.omnibusFrom.address, encrypted.handles[0], encrypted.inputProof);
    });

    it("should fail when non-owner tries to mint", async function () {
      const amount = 1000;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add64(amount)
        .encrypt();

      await expect(
        contract
          .connect(signers.alice)
          .getFunction("$_mint(address,bytes32,bytes)")
          .send(signers.alice.address, encrypted.handles[0], encrypted.inputProof)
      ).to.be.reverted;
    });

    it("should fail when trying omnibus transfer without proper permissions", async function () {
      const transferAmount = 100;
      const encryptedAmount = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address) // Wrong signer!
        .add64(transferAmount)
        .encrypt();

      const encryptedSender = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .addAddress(await signers.alice.getAddress())
        .encrypt();

      const encryptedRecipient = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .addAddress(await signers.bob.getAddress())
        .encrypt();

      const allHandles = [
        encryptedSender.handles[0],
        encryptedRecipient.handles[0],
        encryptedAmount.handles[0],
      ];
      const combinedProof = encryptedAmount.inputProof;

      // Should fail because bob doesn't have permission to use encrypted values
      await expect(
        contract
          .connect(signers.omnibusFrom)
          .getFunction("confidentialTransferOmnibus(address,bytes32,bytes32,bytes32,bytes)")
          .send(
            signers.omnibusTo.address,
            allHandles[0],
            allHandles[1],
            allHandles[2],
            combinedProof
          )
      ).to.be.reverted;
    });
  });
});

