import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { InputProofAntiPatterns, InputProofAntiPatterns__factory } from "../../types";
import { expect } from "chai";

/**
 * @title Input Proof Anti-Patterns Test Suite
 * @notice Tests showing what happens with invalid proofs
 */

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("InputProofAntiPatterns")) as InputProofAntiPatterns__factory;
  const contract = (await factory.deploy()) as InputProofAntiPatterns;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("InputProofAntiPatterns", function () {
  let signers: Signers;
  let contract: InputProofAntiPatterns;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      this.skip();
    }
    ({ contract, contractAddress } = await deployFixture());
  });

  it("should work with correct proof", async function () {
    const clearValue = 42;
    const encrypted = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(clearValue)
      .encrypt();

    await contract
      .connect(signers.alice)
      .correctPattern(encrypted.handles[0], encrypted.inputProof);

    // Should succeed
    const encryptedValue = await contract.getEncryptedValue();
    expect(encryptedValue).to.not.eq(ethers.ZeroHash);
  });

  it("should handle multiple inputs correctly", async function () {
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
      .correctMultipleInputs(
        encrypted1.handles[0],
        encrypted1.inputProof,
        encrypted2.handles[0],
        encrypted2.inputProof
      );

    // Should succeed
    const encryptedValue = await contract.getEncryptedValue();
    expect(encryptedValue).to.not.eq(ethers.ZeroHash);
  });

  // ❌ Common Pitfalls - These tests demonstrate anti-patterns that should fail
  describe("❌ Common Pitfalls", function () {
    it("should fail when using wrong signer for proof", async function () {
      // Anti-pattern: Proof created for wrong signer
      const clearValue = 42;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address) // Proof for bob
        .add32(clearValue)
        .encrypt();

      // Alice tries to use bob's proof (should fail)
      await expect(
        contract
          .connect(signers.alice)
          .correctPattern(encrypted.handles[0], encrypted.inputProof)
      ).to.be.reverted;
    });

    it("should fail when mixing proofs from different inputs", async function () {
      // Anti-pattern: Using proof from one input with handle from another
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

      // Mix proof from encrypted1 with handle from encrypted2 (should fail)
      await expect(
        contract
          .connect(signers.alice)
          .correctMultipleInputs(
            encrypted2.handles[0],
            encrypted1.inputProof, // Wrong proof!
            encrypted2.handles[0],
            encrypted2.inputProof
          )
      ).to.be.reverted;
    });

    it("should fail with invalid proof format", async function () {
      const clearValue = 42;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      // Use completely invalid proof
      const invalidProof = "0xdeadbeef";

      // Should fail with invalid proof
      await expect(
        contract
          .connect(signers.alice)
          .correctPattern(encrypted.handles[0], invalidProof)
      ).to.be.reverted;
    });
  });
});

