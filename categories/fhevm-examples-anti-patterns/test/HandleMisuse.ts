import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { HandleMisuse, HandleMisuse__factory } from "../../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

/**
 * @title Handle Misuse Test Suite
 * @notice Tests demonstrating correct handle usage
 */

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("HandleMisuse")) as unknown as HandleMisuse__factory;
  const contract = (await factory.deploy()) as HandleMisuse;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("HandleMisuse", function () {
  let signers: Signers;
  let contract: HandleMisuse;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      this.skip();
    }
    ({ contract, contractAddress } = await deployFixture());
  });

  it("should set value correctly with handle and proof", async function () {
    const clearValue = 42;
    const encrypted = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(clearValue)
      .encrypt();

    await contract
      .connect(signers.alice)
      .setValueCorrect(encrypted.handles[0], encrypted.inputProof);

    const handle = await contract.getHandle();
    expect(handle).to.not.eq(ethers.ZeroHash);
  });

  it("should store handle for later reference", async function () {
    const clearValue = 100;
    const encrypted = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(clearValue)
      .encrypt();

    await contract
      .connect(signers.alice)
      .setValueCorrect(encrypted.handles[0], encrypted.inputProof);

    await contract.connect(signers.alice).storeHandle();

    const storedHandle = await contract.storedHandles(signers.alice.address);
    expect(storedHandle).to.not.eq(ethers.ZeroHash);
  });

  it("should allow operations on handles", async function () {
    // Set initial value
    const initialValue = 10;
    const encrypted1 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(initialValue)
      .encrypt();
    await contract.connect(signers.alice).setValueCorrect(encrypted1.handles[0], encrypted1.inputProof);

    // Add to value
    const addValue = 5;
    const encrypted2 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(addValue)
      .encrypt();
    await contract.connect(signers.alice).addToValue(encrypted2.handles[0], encrypted2.inputProof);

    const handle = await contract.getHandle();
    expect(handle).to.not.eq(ethers.ZeroHash);
  });

  // ❌ Common Pitfalls
  describe("❌ Common Pitfalls", function () {
    it("should fail when using handle without corresponding proof", async function () {
      // Common pitfall: Handle and proof must match
      const clearValue = 42;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      // Try to use handle with wrong/invalid proof
      const invalidProof = "0xdeadbeef";

      // Should fail because proof doesn't match handle
      await expect(
        contract
          .connect(signers.alice)
          .setValueCorrect(encrypted.handles[0], invalidProof)
      ).to.be.reverted;
    });

    it("should fail when using handle from different encrypted input", async function () {
      // Common pitfall: Mixing handles and proofs from different inputs
      const value1 = 10;
      const value2 = 20;
      
      const encrypted1 = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(value1)
        .encrypt();
      
      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(value2)
        .encrypt();

      // Try to use handle from encrypted2 with proof from encrypted1 (should fail)
      await expect(
        contract
          .connect(signers.alice)
          .setValueCorrect(encrypted2.handles[0], encrypted1.inputProof)
      ).to.be.reverted;
    });

    it("should fail when wrong signer tries to use handle", async function () {
      // Common pitfall: Handle created for one signer but used by another
      const clearValue = 100;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.deployer.address) // Proof for deployer
        .add32(clearValue)
        .encrypt();

      // Alice tries to use deployer's handle/proof (should fail)
      await expect(
        contract
          .connect(signers.alice)
          .setValueCorrect(encrypted.handles[0], encrypted.inputProof)
      ).to.be.reverted;
    });

    it("should fail when trying to use handle with mismatched proof", async function () {
      // Common pitfall: Handle and proof must be from the same encrypted input
      const value1 = 10;
      const value2 = 20;
      
      const encrypted1 = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(value1)
        .encrypt();
      
      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(value2)
        .encrypt();

      // First use encrypted1 correctly
      await contract.connect(signers.alice).setValueCorrect(encrypted1.handles[0], encrypted1.inputProof);

      // Try to use handle from encrypted1 with proof from encrypted2 (should fail)
      await expect(
        contract
          .connect(signers.alice)
          .setValueCorrect(encrypted1.handles[0], encrypted2.inputProof)
      ).to.be.reverted;
    });
  });
});

