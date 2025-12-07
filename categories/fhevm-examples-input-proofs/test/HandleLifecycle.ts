import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { HandleLifecycle, HandleLifecycle__factory } from "../../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

/**
 * @title Handle Lifecycle Test Suite
 * @notice Tests demonstrating handle generation and lifecycle
 */

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("HandleLifecycle")) as HandleLifecycle__factory;
  const contract = (await factory.deploy()) as HandleLifecycle;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("HandleLifecycle", function () {
  let signers: Signers;
  let contract: HandleLifecycle;
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

  it("should store handle when setting value", async function () {
    const clearValue = 42;
    const encrypted = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(clearValue)
      .encrypt();

    await contract
      .connect(signers.alice)
      .setValue(encrypted.handles[0], encrypted.inputProof);

    const storedHandle = await contract.storedHandle();
    expect(storedHandle).to.not.eq(ethers.ZeroHash);
  });

  it("should return handle as bytes32", async function () {
    const clearValue = 100;
    const encrypted = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(clearValue)
      .encrypt();

    await contract
      .connect(signers.alice)
      .setValue(encrypted.handles[0], encrypted.inputProof);

    const handle = await contract.getHandle();
    expect(handle).to.not.eq(ethers.ZeroHash);
  });

  it("should update handle after operation", async function () {
    // Set initial value
    const initialValue = 10;
    const encrypted1 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(initialValue)
      .encrypt();
    await contract.connect(signers.alice).setValue(encrypted1.handles[0], encrypted1.inputProof);
    const handle1 = await contract.getHandle();

    // Add to value (creates new handle)
    const addValue = 5;
    const encrypted2 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(addValue)
      .encrypt();
    await contract.connect(signers.alice).addToValue(encrypted2.handles[0], encrypted2.inputProof);
    const handle2 = await contract.getHandle();

    // Handles should be different (new operation creates new handle)
    expect(handle2).to.not.eq(handle1);
  });

  // ❌ Common Pitfalls
  describe("❌ Common Pitfalls", function () {
    it("should fail when using wrong signer for handle creation", async function () {
      // Common pitfall: Handle created with wrong signer
      const clearValue = 42;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.deployer.address) // Wrong signer!
        .add32(clearValue)
        .encrypt();

      // Should fail because signer doesn't match
      await expect(
        contract
          .connect(signers.alice)
          .setValue(encrypted.handles[0], encrypted.inputProof)
      ).to.be.reverted;
    });

    it("should fail when trying to use handle without proof", async function () {
      // Common pitfall: Trying to use handle directly without proof
      const clearValue = 42;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      // Try to use handle with empty/invalid proof
      const emptyProof = "0x";

      // Should fail without valid proof
      await expect(
        contract
          .connect(signers.alice)
          .setValue(encrypted.handles[0], emptyProof)
      ).to.be.reverted;
    });

    it("should fail when handle and proof don't match", async function () {
      // Set initial value to get a valid handle
      const value1 = 10;
      const encrypted1 = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(value1)
        .encrypt();
      await contract.connect(signers.alice).setValue(encrypted1.handles[0], encrypted1.inputProof);

      // Create new encrypted input
      const value2 = 20;
      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(value2)
        .encrypt();

      // Try to use handle from encrypted2 with proof from encrypted1 (should fail)
      await expect(
        contract
          .connect(signers.alice)
          .setValue(encrypted2.handles[0], encrypted1.inputProof)
      ).to.be.reverted;
    });
  });
});

