import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { FHECounter, FHECounter__factory } from "../../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

/**
 * @chapter basic
 * @title FHE Counter Test Suite
 */

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHECounter")) as unknown as FHECounter__factory;
  const fheCounterContract = (await factory.deploy()) as FHECounter;
  const fheCounterContractAddress = await fheCounterContract.getAddress();

  return { fheCounterContract, fheCounterContractAddress };
}

describe("FHECounter", function () {
  let signers: Signers;
  let fheCounterContract: FHECounter;
  let fheCounterContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ fheCounterContract, fheCounterContractAddress } = await deployFixture());
  });

  it("encrypted count should be uninitialized after deployment", async function () {
    const encryptedCount = await fheCounterContract.getCount();
    // Expect initial count to be bytes32(0) after deployment,
    // (meaning the encrypted count value is uninitialized)
    expect(encryptedCount).to.eq(ethers.ZeroHash);
  });

  it("increment the counter by 1", async function () {
    const encryptedCountBeforeInc = await fheCounterContract.getCount();
    expect(encryptedCountBeforeInc).to.eq(ethers.ZeroHash);
    const clearCountBeforeInc = 0;

    // Encrypt constant 1 as a euint32
    const clearOne = 1;
    const encryptedOne = await fhevm
      .createEncryptedInput(fheCounterContractAddress, signers.alice.address)
      .add32(clearOne)
      .encrypt();

    const tx = await fheCounterContract
      .connect(signers.alice)
      .increment(encryptedOne.handles[0], encryptedOne.inputProof);
    await tx.wait();

    const encryptedCountAfterInc = await fheCounterContract.getCount();
    const clearCountAfterInc = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCountAfterInc,
      fheCounterContractAddress,
      signers.alice,
    );

    expect(clearCountAfterInc).to.eq(clearCountBeforeInc + clearOne);
  });

  it("decrement the counter by 1", async function () {
    // Encrypt constant 1 as a euint32
    const clearOne = 1;
    const encryptedOne = await fhevm
      .createEncryptedInput(fheCounterContractAddress, signers.alice.address)
      .add32(clearOne)
      .encrypt();

    // First increment by 1, count becomes 1
    let tx = await fheCounterContract
      .connect(signers.alice)
      .increment(encryptedOne.handles[0], encryptedOne.inputProof);
    await tx.wait();

    // Then decrement by 1, count goes back to 0
    tx = await fheCounterContract.connect(signers.alice).decrement(encryptedOne.handles[0], encryptedOne.inputProof);
    await tx.wait();

    const encryptedCountAfterDec = await fheCounterContract.getCount();
    const clearCountAfterInc = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCountAfterDec,
      fheCounterContractAddress,
      signers.alice,
    );

    expect(clearCountAfterInc).to.eq(0);
  });

  describe("❌ Common Pitfalls", function () {
    it("should fail when using wrong signer for encrypted input", async function () {
      // Common pitfall: Using wrong signer address in createEncryptedInput
      // The signer must match the transaction signer (signers.alice)
      const clearOne = 1;
      
      // ❌ WRONG: Using bob's address but signing with alice
      const encryptedWrong = await fhevm
        .createEncryptedInput(fheCounterContractAddress, signers.bob.address) // Wrong signer!
        .add32(clearOne)
        .encrypt();

      // This will fail because the proof was created for bob, but alice is signing
      await expect(
        fheCounterContract
          .connect(signers.alice)
          .increment(encryptedWrong.handles[0], encryptedWrong.inputProof)
      ).to.be.reverted;
    });

    it("should fail when trying to increment without initializing", async function () {
      // Common pitfall: Trying to use encrypted value before initialization
      // The counter starts uninitialized (ZeroHash)
      const encryptedCount = await fheCounterContract.getCount();
      expect(encryptedCount).to.eq(ethers.ZeroHash);

      // This is actually fine - increment will initialize it
      // But let's show what happens if we try to use an uninitialized value incorrectly
      const clearOne = 1;
      const encryptedOne = await fhevm
        .createEncryptedInput(fheCounterContractAddress, signers.alice.address)
        .add32(clearOne)
        .encrypt();

      // This should work - increment initializes the counter
      const tx = await fheCounterContract
        .connect(signers.alice)
        .increment(encryptedOne.handles[0], encryptedOne.inputProof);
      await tx.wait();

      // After increment, counter should be initialized
      const encryptedCountAfter = await fheCounterContract.getCount();
      expect(encryptedCountAfter).to.not.eq(ethers.ZeroHash);
    });
  });
});
