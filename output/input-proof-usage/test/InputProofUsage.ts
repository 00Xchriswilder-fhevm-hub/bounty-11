import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { InputProofUsage, InputProofUsage__factory } from "../../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

/**
 * @title Input Proof Usage Test Suite
 * @notice Tests demonstrating correct usage of input proofs
 */

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("InputProofUsage")) as unknown as InputProofUsage__factory;
  const contract = (await factory.deploy()) as InputProofUsage;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("InputProofUsage", function () {
  let signers: Signers;
  let contract: InputProofUsage;
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

  it("should set value with matching signer", async function () {
    const clearValue = 100;
    const encrypted = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(clearValue)
      .encrypt();

    await contract
      .connect(signers.alice)
      .setValue(encrypted.handles[0], encrypted.inputProof);

    expect(await contract.hasSetValue(signers.alice.address)).to.be.true;
  });

  it("should update value with fresh proof", async function () {
    // Set initial value
    const initialValue = 50;
    const encrypted1 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(initialValue)
      .encrypt();
    await contract.connect(signers.alice).setValue(encrypted1.handles[0], encrypted1.inputProof);

    // Update with new value and fresh proof
    const newValue = 75;
    const encrypted2 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(newValue)
      .encrypt();
    await contract.connect(signers.alice).updateValue(encrypted2.handles[0], encrypted2.inputProof);

    const encryptedValue = await contract.connect(signers.alice).getEncryptedValue();
    const decrypted = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedValue,
      contractAddress,
      signers.alice,
    );

    expect(decrypted).to.eq(newValue);
  });

  // ❌ Common Pitfalls
  describe("❌ Common Pitfalls", function () {
    it("should fail when signer doesn't match encrypted input", async function () {
      // Common pitfall: Proof created for one signer but transaction from another
      const clearValue = 100;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address) // Proof for bob
        .add32(clearValue)
        .encrypt();

      // Alice tries to use bob's proof (should fail)
      await expect(
        contract
          .connect(signers.alice)
          .setValue(encrypted.handles[0], encrypted.inputProof)
      ).to.be.reverted;
    });

    it("should fail when reusing old proof", async function () {
      // Set initial value
      const initialValue = 50;
      const encrypted1 = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(initialValue)
        .encrypt();
      await contract.connect(signers.alice).setValue(encrypted1.handles[0], encrypted1.inputProof);

      // Try to reuse the old proof with a new handle (should fail)
      const newValue = 75;
      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(newValue)
        .encrypt();

      // Reusing old proof with new handle should fail
      await expect(
        contract.connect(signers.alice).updateValue(encrypted2.handles[0], encrypted1.inputProof)
      ).to.be.reverted;
    });

    it("should fail with corrupted input proof", async function () {
      const clearValue = 100;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      // Corrupt the proof by modifying the last byte
      const proofBytes = ethers.getBytes(encrypted.inputProof);
      proofBytes[proofBytes.length - 1] = (proofBytes[proofBytes.length - 1] + 1) % 256;
      const corruptedProof = ethers.hexlify(proofBytes);

      // Should fail with corrupted proof
      await expect(
        contract
          .connect(signers.alice)
          .setValue(encrypted.handles[0], corruptedProof)
      ).to.be.reverted;
    });
  });
});

