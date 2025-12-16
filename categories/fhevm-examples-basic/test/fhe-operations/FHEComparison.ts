import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import type { FHEComparison, FHEComparison__factory } from "../../../types";

type Signers = {
  owner: HardhatEthersSigner;
  alice: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHEComparison")) as unknown as FHEComparison__factory;
  const fheComparison = (await factory.deploy()) as FHEComparison;
  const fheComparison_address = await fheComparison.getAddress();
  return { fheComparison, fheComparison_address };
}

/**
 * @chapter basic
 * @title FHE Comparison Operations Test
 * @notice Tests all FHE comparison operations (eq, ne, gt, lt, ge, le, select)
 */
describe("FHEComparison", function () {
  let contract: FHEComparison;
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
    contractAddress = deployment.fheComparison_address;
    contract = deployment.fheComparison;
  });

  describe("Equality comparisons", function () {
    it("should compute equality (eq) - equal values", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      let tx;

      const a = 100;
      const b = 100;

      const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(a).encrypt();
      tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
      await tx.wait();

      const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(b).encrypt();
      tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
      await tx.wait();

      tx = await contract.connect(bob).computeEq();
      await tx.wait();

      const encryptedResult = await contract.getBoolResult();
      const clearResult = await fhevm.userDecryptEbool(encryptedResult, contractAddress, bob);

      expect(clearResult).to.equal(true);
    });

    it("should compute equality (eq) - different values", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      let tx;

      const a = 100;
      const b = 200;

      const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(a).encrypt();
      tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
      await tx.wait();

      const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(b).encrypt();
      tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
      await tx.wait();

      tx = await contract.connect(bob).computeEq();
      await tx.wait();

      const encryptedResult = await contract.getBoolResult();
      const clearResult = await fhevm.userDecryptEbool(encryptedResult, contractAddress, bob);

      expect(clearResult).to.equal(false);
    });

    it("should compute inequality (ne)", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      let tx;

      const a = 100;
      const b = 200;

      const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(a).encrypt();
      tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
      await tx.wait();

      const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(b).encrypt();
      tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
      await tx.wait();

      tx = await contract.connect(bob).computeNe();
      await tx.wait();

      const encryptedResult = await contract.getBoolResult();
      const clearResult = await fhevm.userDecryptEbool(encryptedResult, contractAddress, bob);

      expect(clearResult).to.equal(true);
    });
  });

  describe("Ordering comparisons", function () {
    it("should compute greater than (gt)", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      let tx;

      const a = 200;
      const b = 100;

      const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(a).encrypt();
      tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
      await tx.wait();

      const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(b).encrypt();
      tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
      await tx.wait();

      tx = await contract.connect(bob).computeGt();
      await tx.wait();

      const encryptedResult = await contract.getBoolResult();
      const clearResult = await fhevm.userDecryptEbool(encryptedResult, contractAddress, bob);

      expect(clearResult).to.equal(true);
    });

    it("should compute less than (lt)", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      let tx;

      const a = 50;
      const b = 100;

      const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(a).encrypt();
      tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
      await tx.wait();

      const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(b).encrypt();
      tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
      await tx.wait();

      tx = await contract.connect(bob).computeLt();
      await tx.wait();

      const encryptedResult = await contract.getBoolResult();
      const clearResult = await fhevm.userDecryptEbool(encryptedResult, contractAddress, bob);

      expect(clearResult).to.equal(true);
    });

    it("should compute greater or equal (ge)", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      let tx;

      const a = 100;
      const b = 100;

      const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(a).encrypt();
      tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
      await tx.wait();

      const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(b).encrypt();
      tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
      await tx.wait();

      tx = await contract.connect(bob).computeGe();
      await tx.wait();

      const encryptedResult = await contract.getBoolResult();
      const clearResult = await fhevm.userDecryptEbool(encryptedResult, contractAddress, bob);

      expect(clearResult).to.equal(true);
    });

    it("should compute less or equal (le)", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      let tx;

      const a = 100;
      const b = 100;

      const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(a).encrypt();
      tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
      await tx.wait();

      const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(b).encrypt();
      tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
      await tx.wait();

      tx = await contract.connect(bob).computeLe();
      await tx.wait();

      const encryptedResult = await contract.getBoolResult();
      const clearResult = await fhevm.userDecryptEbool(encryptedResult, contractAddress, bob);

      expect(clearResult).to.equal(true);
    });
  });

  describe("Select operations", function () {
    it("should compute max via select", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      let tx;

      const a = 80;
      const b = 200;

      const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(a).encrypt();
      tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
      await tx.wait();

      const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(b).encrypt();
      tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
      await tx.wait();

      tx = await contract.connect(bob).computeMaxViaSelect();
      await tx.wait();

      const encryptedResult = await contract.getSelectedResult();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedResult,
        contractAddress,
        bob,
      );

      expect(clearResult).to.equal(Math.max(a, b));
    });

    it("should compute min via select", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      let tx;

      const a = 80;
      const b = 200;

      const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(a).encrypt();
      tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
      await tx.wait();

      const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(b).encrypt();
      tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
      await tx.wait();

      tx = await contract.connect(bob).computeMinViaSelect();
      await tx.wait();

      const encryptedResult = await contract.getSelectedResult();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedResult,
        contractAddress,
        bob,
      );

      expect(clearResult).to.equal(Math.min(a, b));
    });
  });

  // ❌ Common Pitfalls
  describe("❌ Common Pitfalls", function () {
    it("should fail when using wrong signer for encrypted input", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

      // Bob tries to set value with wrong signer
      const inputA = await fhevm.createEncryptedInput(contractAddress, signers.owner.address).add32(100).encrypt();
      
      await expect(
        contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof)
      ).to.be.reverted;
    });
  });
});

