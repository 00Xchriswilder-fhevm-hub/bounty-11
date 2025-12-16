import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import type { FHESub, FHESub__factory } from "../../../types";

type Signers = {
  owner: HardhatEthersSigner;
  alice: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHESub")) as unknown as FHESub__factory;
  const fheSub = (await factory.deploy()) as FHESub;
  const fheSub_address = await fheSub.getAddress();
  return { fheSub, fheSub_address };
}

/**
 * @chapter basic
 * @title FHE Subtraction Operation Test
 * @notice Tests FHE.sub operation to subtract two encrypted values
 */
describe("FHESub", function () {
  let contract: FHESub;
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
    contractAddress = deployment.fheSub_address;
    contract = deployment.fheSub;
  });

  it("should compute subtraction of two values", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
    let tx;

    // Test: 123 - 80 = 43
    const a = 123;
    const b = 80;

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    tx = await contract.connect(bob).computeSub();
    await tx.wait();

    const encryptedSub = await contract.result();
    const clearSub = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      encryptedSub,
      contractAddress,
      bob,
    );

    expect(clearSub).to.equal(a - b);
  });

  it("should compute subtraction resulting in zero", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
    let tx;

    // Test: 100 - 100 = 0
    const a = 100;
    const b = 100;

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    tx = await contract.connect(bob).computeSub();
    await tx.wait();

    const encryptedSub = await contract.result();
    const clearSub = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      encryptedSub,
      contractAddress,
      bob,
    );

    expect(clearSub).to.equal(0);
  });

  // ❌ Common Pitfalls
  describe("❌ Common Pitfalls", function () {
    it("should compute zero when values are not set", async function () {
      // Common pitfall: Computing without setting values
      // FHE operations on uninitialized values return zero, they don't revert
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      const tx = await contract.connect(bob).computeSub();
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

