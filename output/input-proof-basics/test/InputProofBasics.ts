import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { InputProofBasics, InputProofBasics__factory } from "../../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

/**
 * @chapter input-proofs
 * @title Input Proof Basics Test Suite
 * @notice Tests demonstrating what input proofs are and why they're needed
 */

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("InputProofBasics")) as InputProofBasics__factory;
  const contract = (await factory.deploy()) as InputProofBasics;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("InputProofBasics", function () {
  let signers: Signers;
  let contract: InputProofBasics;
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

  it("should set value with encrypted input and proof", async function () {
    const clearValue = 42;
    const encrypted = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(clearValue)
      .encrypt();

    await contract
      .connect(signers.alice)
      .setValue(encrypted.handles[0], encrypted.inputProof);

    const encryptedValue = await contract.connect(signers.alice).getEncryptedValue();
    const decrypted = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedValue,
      contractAddress,
      signers.alice,
    );

    expect(decrypted).to.eq(clearValue);
  });

  it("should add to value with proof", async function () {
    // Set initial value
    const initialValue = 10;
    const encrypted1 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(initialValue)
      .encrypt();
    await contract.connect(signers.alice).setValue(encrypted1.handles[0], encrypted1.inputProof);

    // Add to value
    const addValue = 5;
    const encrypted2 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(addValue)
      .encrypt();
    await contract.connect(signers.alice).addToValue(encrypted2.handles[0], encrypted2.inputProof);

    const encryptedValue = await contract.connect(signers.alice).getEncryptedValue();
    const decrypted = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedValue,
      contractAddress,
      signers.alice,
    );

    expect(decrypted).to.eq(15); // 10 + 5
  });

  it("should handle multiple inputs with separate proofs", async function () {
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

    await contract
      .connect(signers.alice)
      .addTwoValues(
        encrypted1.handles[0],
        encrypted1.inputProof,
        encrypted2.handles[0],
        encrypted2.inputProof
      );

    const encryptedValue = await contract.connect(signers.alice).getEncryptedValue();
    const decrypted = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedValue,
      contractAddress,
      signers.alice,
    );

    expect(decrypted).to.eq(30); // 10 + 20
  });

  // ❌ Common Pitfalls
  describe("❌ Common Pitfalls", function () {
    it("should fail when using wrong signer for encrypted input", async function () {
      // Common pitfall: Using wrong signer address in createEncryptedInput
      const clearValue = 42;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.deployer.address) // Wrong signer!
        .add32(clearValue)
        .encrypt();

      // Should fail because signer doesn't match the transaction signer
      await expect(
        contract
          .connect(signers.alice)
          .setValue(encrypted.handles[0], encrypted.inputProof)
      ).to.be.reverted;
    });

    it("should fail when using invalid input proof", async function () {
      const clearValue = 42;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      // Use invalid proof (wrong format)
      const invalidProof = "0x" + "00".repeat(32);

      // Should fail with invalid proof
      await expect(
        contract
          .connect(signers.alice)
          .setValue(encrypted.handles[0], invalidProof)
      ).to.be.reverted;
    });

    it("should fail when using proof for different handle", async function () {
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

      // Use proof from encrypted1 with handle from encrypted2 (should fail)
      await expect(
        contract
          .connect(signers.alice)
          .setValue(encrypted2.handles[0], encrypted1.inputProof)
      ).to.be.reverted;
    });
  });
});

