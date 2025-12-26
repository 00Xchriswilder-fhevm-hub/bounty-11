import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import type { FHERem, FHERem__factory } from "../../../types";

type Signers = {
  owner: HardhatEthersSigner;
  alice: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHERem")) as unknown as FHERem__factory;
  const fheRem = (await factory.deploy()) as FHERem;
  const fheRem_address = await fheRem.getAddress();
  return { fheRem, fheRem_address };
}

/**
 * @chapter basic
 * @title FHE Remainder Operation Test
 * @notice Tests FHE.rem operation to compute remainder of encrypted value divided by plaintext modulus
 */
describe("FHERem", function () {
  let contract: FHERem;
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
    contractAddress = deployment.fheRem_address;
    contract = deployment.fheRem;
  });

  it("should compute remainder of encrypted value by plaintext modulus", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
    let tx;

    // Test: 125 % 7 = 6
    const a = 125;
    const modulus = 7;

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    // Set plaintext modulus
    tx = await contract.connect(signers.alice).setModulus(modulus);
    await tx.wait();

    tx = await contract.connect(bob).computeRem();
    await tx.wait();

    const encryptedRem = await contract.result();
    const clearRem = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedRem,
      contractAddress,
      bob,
    );

    expect(clearRem).to.equal(a % modulus);
  });

  it("should compute zero remainder when perfectly divisible", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
    let tx;

    // Test: 120 % 8 = 0
    const a = 120;
    const modulus = 8;

    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    tx = await contract.connect(signers.alice).setModulus(modulus);
    await tx.wait();

    tx = await contract.connect(bob).computeRem();
    await tx.wait();

    const encryptedRem = await contract.result();
    const clearRem = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedRem,
      contractAddress,
      bob,
    );

    expect(clearRem).to.equal(0);
  });

  // ❌ Common Pitfalls
  describe("❌ Common Pitfalls", function () {
    it("should fail when trying to compute without setting values", async function () {
      // Try to compute without setting a and modulus first
      await expect(contract.connect(bob).computeRem()).to.be.reverted;
    });

    it("should fail when using wrong signer for encrypted input", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

      // Bob tries to set value with wrong signer (should use alice's encrypted input)
      const inputA = await fhevm.createEncryptedInput(contractAddress, signers.owner.address).add32(125).encrypt();
      
      // Should fail because signer doesn't match
      await expect(
        contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof)
      ).to.be.reverted;
    });

    it("should fail when modulus is zero", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      let tx;

      const a = 125;
      const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(a).encrypt();
      tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
      await tx.wait();

      // Try to set modulus to zero (should fail)
      await expect(
        contract.connect(signers.alice).setModulus(0)
      ).to.be.reverted;
    });
  });
});

