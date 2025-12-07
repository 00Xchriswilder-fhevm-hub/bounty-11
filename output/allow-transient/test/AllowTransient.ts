import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { AllowTransient, AllowTransient__factory } from "../../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

/**
 * @chapter access-control
 * @title Allow Transient Test Suite
 * @notice Tests for AllowTransient contract demonstrating temporary permissions
 * @dev This test suite shows:
 *      - ✅ How to use FHE.allowTransient() for one-time operations
 *      - ✅ Difference between transient and permanent permissions
 *      - ✅ When to use transient vs permanent permissions
 */

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("AllowTransient")) as unknown as AllowTransient__factory;
  const contract = (await factory.deploy()) as AllowTransient;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("AllowTransient", function () {
  let signers: Signers;
  let contract: AllowTransient;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      alice: ethSigners[1],
      bob: ethSigners[2],
    };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());

    // Initialize with a value
    const clearValue = 50;
    const encrypted = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(clearValue)
      .encrypt();

    await contract
      .connect(signers.alice)
      .initialize(encrypted.handles[0], encrypted.inputProof);
  });

  describe("✅ Permanent Permissions", function () {
    it("should allow adding with permanent permission", async function () {
      const addValue = 25;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(addValue)
        .encrypt();

      await contract
        .connect(signers.alice)
        .addWithPermanentPermission(encrypted.handles[0], encrypted.inputProof);

      const encryptedValue = await contract.connect(signers.alice).getEncryptedValue();
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedValue,
        contractAddress,
        signers.alice,
      );

      expect(decrypted).to.eq(75); // 50 + 25
    });
  });

  describe("✅ Transient Permissions", function () {
    it("should allow adding with transient permission", async function () {
      const addValue = 30;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(addValue)
        .encrypt();

      await contract
        .connect(signers.alice)
        .addWithTransientPermission(encrypted.handles[0], encrypted.inputProof);

      const encryptedValue = await contract.connect(signers.alice).getEncryptedValue();
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedValue,
        contractAddress,
        signers.alice,
      );

      expect(decrypted).to.eq(80); // 50 + 30
    });

    it("should allow comparison with transient permission", async function () {
      const compareValue = 50;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(compareValue)
        .encrypt();

      // compareWithTransient returns ebool - get return value using staticCall first
      // This gives us the handle without executing a transaction
      const resultHandle = await contract
        .connect(signers.alice)
        .compareWithTransient.staticCall(encrypted.handles[0], encrypted.inputProof);

      // Now call it normally to grant permissions to the result
      // The result handle already has permissions granted in the function
      await contract
        .connect(signers.alice)
        .compareWithTransient(encrypted.handles[0], encrypted.inputProof);

      // Convert result to string handle - handle BigNumber or other types
      let handle: string;
      if (typeof resultHandle === 'string') {
        handle = resultHandle;
      } else if (resultHandle && typeof resultHandle === 'object' && 'toHexString' in resultHandle) {
        // Handle BigNumber or similar objects
        handle = (resultHandle as any).toHexString();
      } else {
        handle = ethers.hexlify(resultHandle);
      }
      
      const decrypted = await fhevm.userDecryptEbool(
        handle,
        contractAddress,
        signers.alice,
      );

      expect(decrypted).to.be.true; // 50 == 50
    });

    it("should allow comparison with different value using transient", async function () {
      const compareValue = 100;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(compareValue)
        .encrypt();

      // compareWithTransient returns ebool - get return value using staticCall first
      // This gives us the handle without executing a transaction
      const resultHandle = await contract
        .connect(signers.alice)
        .compareWithTransient.staticCall(encrypted.handles[0], encrypted.inputProof);

      // Now call it normally to grant permissions to the result
      // The result handle already has permissions granted in the function
      await contract
        .connect(signers.alice)
        .compareWithTransient(encrypted.handles[0], encrypted.inputProof);

      // Convert result to string handle - handle BigNumber or other types
      let handle: string;
      if (typeof resultHandle === 'string') {
        handle = resultHandle;
      } else if (resultHandle && typeof resultHandle === 'object' && 'toHexString' in resultHandle) {
        // Handle BigNumber or similar objects
        handle = (resultHandle as any).toHexString();
      } else {
        handle = ethers.hexlify(resultHandle);
      }
      
      const decrypted = await fhevm.userDecryptEbool(
        handle,
        contractAddress,
        signers.alice,
      );

      expect(decrypted).to.be.false; // 50 != 100
    });
  });

  describe("✅ Stored Values", function () {
    it("should store value with permanent permission", async function () {
      const storeValue = 200;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(storeValue)
        .encrypt();

      await contract
        .connect(signers.alice)
        .storeValue(encrypted.handles[0], encrypted.inputProof);

      // Value should be stored and accessible
      // Note: The contract doesn't expose getTempValue, but the operation should succeed
      // This demonstrates that stored values need permanent permissions, not transient
    });
  });
});

