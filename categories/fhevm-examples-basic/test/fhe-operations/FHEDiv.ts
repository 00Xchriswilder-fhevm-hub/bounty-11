import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import type { FHEDiv, FHEDiv__factory } from "../../../types";

type Signers = {
  owner: HardhatEthersSigner;
  alice: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHEDiv")) as unknown as FHEDiv__factory;
  const fheDiv = (await factory.deploy()) as FHEDiv;
  const fheDiv_address = await fheDiv.getAddress();
  return { fheDiv, fheDiv_address };
}

/**
 * @chapter basic
 * @title FHE Division Operation Test
 * @notice Tests FHE.div operation to divide an encrypted value by a plaintext divisor
 */
describe("FHEDiv", function () {
  let contract: FHEDiv;
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
    contractAddress = deployment.fheDiv_address;
    contract = deployment.fheDiv;
  });

  it("should divide encrypted value by plaintext divisor", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
    let tx;

    // Test: 120 / 8 = 15
    const a = 120;
    const divisor = 8;

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    // Set plaintext divisor
    tx = await contract.connect(signers.alice).setDivisor(divisor);
    await tx.wait();

    tx = await contract.connect(bob).computeDiv();
    await tx.wait();

    const encryptedDiv = await contract.result();
    const clearDiv = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedDiv,
      contractAddress,
      bob,
    );

    expect(clearDiv).to.equal(Math.floor(a / divisor));
  });

  // ❌ Common Pitfalls
  describe("❌ Common Pitfalls", function () {
    it("should fail when trying to compute without setting values", async function () {
      // Try to compute without setting a and divisor first
      await expect(contract.connect(bob).computeDiv()).to.be.reverted;
    });

    it("should fail when using wrong signer for encrypted input", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

      // Bob tries to set value with wrong signer (should use alice's encrypted input)
      const inputA = await fhevm.createEncryptedInput(contractAddress, signers.owner.address).add32(120).encrypt();
      
      // Should fail because signer doesn't match
      await expect(
        contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof)
      ).to.be.reverted;
    });

    it("should fail when divisor is zero", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      let tx;

      const a = 120;
      const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(a).encrypt();
      tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
      await tx.wait();

      // Try to set divisor to zero (should fail or handle gracefully)
      await expect(
        contract.connect(signers.alice).setDivisor(0)
      ).to.be.reverted;
    });
  });
});

