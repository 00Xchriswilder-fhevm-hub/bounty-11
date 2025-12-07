import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { MissingAllowThis, MissingAllowThis__factory } from "../../types";
import { expect } from "chai";

/**
 * @title Missing AllowThis Test Suite
 * @notice Tests demonstrating what happens when FHE.allowThis() is missing
 */

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("MissingAllowThis")) as MissingAllowThis__factory;
  const contract = (await factory.deploy()) as MissingAllowThis;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("MissingAllowThis", function () {
  let signers: Signers;
  let contract: MissingAllowThis;
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

  it("should work with correct pattern (allowThis + allow)", async function () {
    const clearValue = 42;
    const encrypted = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(clearValue)
      .encrypt();

    await contract
      .connect(signers.alice)
      .setValueCorrect(encrypted.handles[0], encrypted.inputProof);

    const handle = await contract.getHandleCorrect();
    expect(handle).to.not.eq(ethers.ZeroHash);
  });

  it("should allow operations with correct permissions", async function () {
    // Set value correctly
    const initialValue = 10;
    const encrypted1 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(initialValue)
      .encrypt();
    await contract.connect(signers.alice).setValueCorrect(encrypted1.handles[0], encrypted1.inputProof);

    // Add to value (should work)
    const addValue = 5;
    const encrypted2 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(addValue)
      .encrypt();
    
    // This should work because allowThis was granted
    await contract
      .connect(signers.alice)
      .useValueCorrect(encrypted2.handles[0], encrypted2.inputProof);

    const handle = await contract.getHandleCorrect();
    expect(handle).to.not.eq(ethers.ZeroHash);
  });

  it("should set value with wrong pattern (missing allowThis)", async function () {
    const clearValue = 100;
    const encrypted = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(clearValue)
      .encrypt();

    // This will set the value, but without allowThis
    await contract
      .connect(signers.alice)
      .setValueWrong(encrypted.handles[0], encrypted.inputProof);

    const handle = await contract.getHandleWrong();
    expect(handle).to.not.eq(ethers.ZeroHash);
  });

  it("should fail when trying to use value without allowThis", async function () {
    // Set value with wrong pattern (missing allowThis)
    const initialValue = 10;
    const encrypted1 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(initialValue)
      .encrypt();
    await contract.connect(signers.alice).setValueWrong(encrypted1.handles[0], encrypted1.inputProof);

    // Try to use the value (should fail)
    const addValue = 5;
    const encrypted2 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(addValue)
      .encrypt();

    // ❌ This should fail because allowThis was not granted
    // The contract cannot perform operations on values it doesn't have permission for
    await expect(
      contract
        .connect(signers.alice)
        .useValueWrong(encrypted2.handles[0], encrypted2.inputProof)
    ).to.be.reverted; // Will revert with permission error
  });

  // ❌ Common Pitfalls
  describe("❌ Common Pitfalls", function () {
    it("should fail when trying to use value without allowThis permission", async function () {
      // Common pitfall: Forgetting to call FHE.allowThis() after setting value
      const clearValue = 200;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      // Set value without allowThis
      await contract.connect(signers.alice).setValueWrong(encrypted.handles[0], encrypted.inputProof);

      // Try to use the value in an operation (should fail)
      const addValue = 10;
      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(addValue)
        .encrypt();

      await expect(
        contract
          .connect(signers.alice)
          .useValueWrong(encrypted2.handles[0], encrypted2.inputProof)
      ).to.be.reverted;
    });

    it("should fail when trying to grant permission after value is already set", async function () {
      // Common pitfall: Trying to grant permissions after the fact
      // Permissions must be granted immediately after creating/using encrypted values
      const clearValue = 150;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      // Set value without allowThis
      await contract.connect(signers.alice).setValueWrong(encrypted.handles[0], encrypted.inputProof);

      // The value is now stored but contract doesn't have permission
      // Trying to use it will fail - you can't grant permission retroactively
      const useValue = 20;
      const encrypted3 = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(useValue)
        .encrypt();

      await expect(
        contract
          .connect(signers.alice)
          .useValueWrong(encrypted3.handles[0], encrypted3.inputProof)
      ).to.be.reverted;
    });

    it("should fail when contract tries to use value it doesn't have permission for", async function () {
      // Common pitfall: Contract operations fail without proper permissions
      const initialValue = 30;
      const encrypted1 = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(initialValue)
        .encrypt();
      
      // Set with wrong pattern (no allowThis)
      await contract.connect(signers.alice).setValueWrong(encrypted1.handles[0], encrypted1.inputProof);

      // Contract cannot perform operations on values without allowThis
      const operationValue = 5;
      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(operationValue)
        .encrypt();

      // This will fail because the contract doesn't have permission to use the stored value
      await expect(
        contract
          .connect(signers.alice)
          .useValueWrong(encrypted2.handles[0], encrypted2.inputProof)
      ).to.be.reverted;
    });
  });
});

