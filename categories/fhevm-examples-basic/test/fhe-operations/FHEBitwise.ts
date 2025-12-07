import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import type { FHEBitwise, FHEBitwise__factory } from "../../../types";

type Signers = {
  owner: HardhatEthersSigner;
  alice: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHEBitwise")) as unknown as FHEBitwise__factory;
  const fheBitwise = (await factory.deploy()) as FHEBitwise;
  const fheBitwise_address = await fheBitwise.getAddress();
  return { fheBitwise, fheBitwise_address };
}

/**
 * @chapter basic
 * @title FHE Bitwise Operations Test
 * @notice Tests FHE.and, FHE.or, and FHE.not operations
 */
describe("FHEBitwise", function () {
  let contract: FHEBitwise;
  let contractAddress: string;
  let signers: Signers;
  let bob: HardhatEthersSigner;

  before(async function () {
    if (!hre.fhevm.isMock) {
      throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`);
    }
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { owner: ethSigners[0], alice: ethSigners[1] };
    bob = ethSigners[2];
  });

  beforeEach(async function () {
    const deployment = await deployFixture();
    contractAddress = deployment.fheBitwise_address;
    contract = deployment.fheBitwise;
  });

  it("should compute AND of two values", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
    let tx;

    // Test: 0b1010 (10) AND 0b1100 (12) = 0b1000 (8)
    const a = 10;
    const b = 12;

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    tx = await contract.connect(bob).computeAnd();
    await tx.wait();

    const encryptedAnd = await contract.getAndResult();
    const clearAnd = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      encryptedAnd,
      contractAddress,
      bob,
    );

    expect(clearAnd).to.equal(a & b);
  });

  it("should compute OR of two values", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
    let tx;

    // Test: 0b1010 (10) OR 0b1100 (12) = 0b1110 (14)
    const a = 10;
    const b = 12;

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    tx = await contract.connect(bob).computeOr();
    await tx.wait();

    const encryptedOr = await contract.getOrResult();
    const clearOr = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      encryptedOr,
      contractAddress,
      bob,
    );

    expect(clearOr).to.equal(a | b);
  });

  it("should compute NOT of a boolean value", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
    let tx;

    // Test: NOT(true) = false, NOT(false) = true
    const boolValue = true;

    // Create encrypted input for bob since bob will call computeNot
    const inputBool = await fhevm.createEncryptedInput(contractAddress, await bob.getAddress()).addBool(boolValue).encrypt();
    tx = await contract.connect(bob).computeNot(inputBool.handles[0], inputBool.inputProof);
    await tx.wait();

    const encryptedNot = await contract.getNotResult();
    const clearNot = await fhevm.userDecryptEbool(
      encryptedNot,
      contractAddress,
      bob,
    );

    expect(clearNot).to.equal(!boolValue);
  });

  // ❌ Common Pitfalls
  describe("❌ Common Pitfalls", function () {
    it("should compute zero when values are not set for AND", async function () {
      // Common pitfall: Computing without setting values
      // FHE operations on uninitialized values return zero, they don't revert
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      const tx = await contract.connect(bob).computeAnd();
      await tx.wait();

      const encryptedResult = await contract.getAndResult();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint8,
        encryptedResult,
        contractAddress,
        bob,
      );

      // Uninitialized values result in zero
      expect(clearResult).to.equal(0);
    });

    it("should compute zero when values are not set for OR", async function () {
      // Common pitfall: Computing without setting values
      // FHE operations on uninitialized values return zero, they don't revert
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      const tx = await contract.connect(bob).computeOr();
      await tx.wait();

      const encryptedResult = await contract.getOrResult();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint8,
        encryptedResult,
        contractAddress,
        bob,
      );

      // Uninitialized values result in zero
      expect(clearResult).to.equal(0);
    });

    it("should fail when using wrong signer for encrypted input", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

      // Bob tries to set value with wrong signer (should use alice's encrypted input)
      const inputA = await fhevm.createEncryptedInput(contractAddress, signers.owner.address).add8(10).encrypt();
      
      // Should fail because signer doesn't match
      await expect(
        contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof)
      ).to.be.reverted;
    });

    it("should fail when using wrong signer for NOT operation", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

      // Alice tries to use encrypted input created for bob
      const inputBool = await fhevm.createEncryptedInput(contractAddress, await bob.getAddress()).addBool(true).encrypt();
      
      // Should fail because signer doesn't match
      await expect(
        contract.connect(signers.alice).computeNot(inputBool.handles[0], inputBool.inputProof)
      ).to.be.reverted;
    });
  });
});

