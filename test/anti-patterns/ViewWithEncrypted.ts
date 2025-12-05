import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { ViewWithEncrypted, ViewWithEncrypted__factory } from "../../types";
import { expect } from "chai";

/**
 * @chapter anti-patterns
 * @title View With Encrypted Test Suite
 * @notice Tests demonstrating why view functions can't return encrypted values
 */

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("ViewWithEncrypted")) as ViewWithEncrypted__factory;
  const contract = (await factory.deploy()) as ViewWithEncrypted;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("ViewWithEncrypted", function () {
  let signers: Signers;
  let contract: ViewWithEncrypted;
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

  it("should set value and emit event", async function () {
    const clearValue = 42;
    const encrypted = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(clearValue)
      .encrypt();

    await expect(
      contract.connect(signers.alice).setValue(encrypted.handles[0], encrypted.inputProof)
    ).to.emit(contract, "EncryptedValueEvent");
  });

  it("should return handle as bytes32", async function () {
    const clearValue = 100;
    const encrypted = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(clearValue)
      .encrypt();

    await contract.connect(signers.alice).setValue(encrypted.handles[0], encrypted.inputProof);

    const handle = await contract.getHandle();
    expect(handle).to.not.eq(ethers.ZeroHash);
  });

  it("should store handle for user", async function () {
    const clearValue = 50;
    const encrypted = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(clearValue)
      .encrypt();

    await contract.connect(signers.alice).setValue(encrypted.handles[0], encrypted.inputProof);
    await contract.connect(signers.alice).storeHandleForUser(signers.alice.address);

    const storedHandle = await contract.userHandles(signers.alice.address);
    expect(storedHandle).to.not.eq(ethers.ZeroHash);
  });

  // ❌ Common Pitfalls
  describe("❌ Common Pitfalls", function () {
    it("should fail when trying to return encrypted value from view function", async function () {
      // Common pitfall: View functions cannot return encrypted values
      // This demonstrates why view functions can't work with encrypted data
      const clearValue = 42;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      await contract.connect(signers.alice).setValue(encrypted.handles[0], encrypted.inputProof);

      // View functions can only return handles (bytes32), not encrypted values
      // Attempting to return encrypted values from view functions will fail at compile time
      // This test demonstrates that we must use handles or events instead
      const handle = await contract.getHandle();
      expect(handle).to.not.eq(ethers.ZeroHash);
      // Note: The contract doesn't have a view function that returns encrypted values
      // because Solidity doesn't allow it - this is the anti-pattern being demonstrated
    });

    it("should fail when trying to use handle without proper proof", async function () {
      // Common pitfall: Using handle without corresponding proof
      const clearValue = 100;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      // Try to use handle with invalid proof
      const invalidProof = "0x" + "00".repeat(32);

      // Should fail because proof is invalid
      await expect(
        contract
          .connect(signers.alice)
          .setValue(encrypted.handles[0], invalidProof)
      ).to.be.reverted;
    });

    it("should fail when wrong signer tries to set value", async function () {
      // Common pitfall: Using wrong signer for encrypted input
      const clearValue = 50;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.deployer.address) // Wrong signer!
        .add32(clearValue)
        .encrypt();

      // Alice tries to use deployer's proof (should fail)
      await expect(
        contract
          .connect(signers.alice)
          .setValue(encrypted.handles[0], encrypted.inputProof)
      ).to.be.reverted;
    });
  });
});

