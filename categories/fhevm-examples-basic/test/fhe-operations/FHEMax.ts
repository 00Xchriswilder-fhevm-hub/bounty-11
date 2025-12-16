import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import type { FHEMax, FHEMax__factory } from "../../../types";

type Signers = {
  owner: HardhatEthersSigner;
  alice: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHEMax")) as unknown as FHEMax__factory;
  const fheMax = (await factory.deploy()) as FHEMax;
  const fheMax_address = await fheMax.getAddress();
  return { fheMax, fheMax_address };
}

/**
 * @chapter basic
 * @title FHE Maximum Operation Test
 * @notice Tests FHE.max operation to find maximum of two encrypted values
 */
describe("FHEMax", function () {
  let contract: FHEMax;
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
    contractAddress = deployment.fheMax_address;
    contract = deployment.fheMax;
  });

  it("should compute maximum of two values", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
    let tx;

    // Test: max(80, 123) = 123
    const a = 80;
    const b = 123;

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    tx = await contract.connect(bob).computeMax();
    await tx.wait();

    const encryptedMax = await contract.result();
    const clearMax = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      encryptedMax,
      contractAddress,
      bob,
    );

    expect(clearMax).to.equal(Math.max(a, b));
  });

  it("should compute maximum when first value is larger", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
    let tx;

    // Test: max(200, 50) = 200
    const a = 200;
    const b = 50;

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    tx = await contract.connect(bob).computeMax();
    await tx.wait();

    const encryptedMax = await contract.result();
    const clearMax = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      encryptedMax,
      contractAddress,
      bob,
    );

    expect(clearMax).to.equal(Math.max(a, b));
  });

  // ❌ Common Pitfalls
  describe("❌ Common Pitfalls", function () {
    it("should compute zero when values are not set", async function () {
      // Common pitfall: Computing without setting values
      // FHE operations on uninitialized values return zero, they don't revert
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      const tx = await contract.connect(bob).computeMax();
      await tx.wait();

      const encryptedResult = await contract.result();
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
      const inputA = await fhevm.createEncryptedInput(contractAddress, signers.owner.address).add8(80).encrypt();
      
      // Should fail because signer doesn't match
      await expect(
        contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof)
      ).to.be.reverted;
    });
  });
});

