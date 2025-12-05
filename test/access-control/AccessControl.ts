import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { AccessControl, AccessControl__factory } from "../../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

/**
 * @chapter access-control
 * @title Access Control Test Suite
 * @notice Tests for AccessControl contract demonstrating FHE permission patterns
 * @dev This test suite shows:
 *      - ✅ How to properly grant permissions (allowThis + allow)
 *      - ✅ How access control works in FHEVM
 *      - ✅ How to grant access to multiple users
 *      - ❌ What happens when permissions are missing
 */

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  charlie: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("AccessControl")) as unknown as AccessControl__factory;
  const contract = (await factory.deploy()) as AccessControl;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("AccessControl", function () {
  let signers: Signers;
  let contract: AccessControl;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      alice: ethSigners[1],
      bob: ethSigners[2],
      charlie: ethSigners[3],
    };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());
  });

  describe("✅ Initialization", function () {
    it("should initialize with encrypted value", async function () {
      const clearValue = 42;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      await contract
        .connect(signers.alice)
        .initialize(encrypted.handles[0], encrypted.inputProof);

      // Check that alice has access
      expect(await contract.hasAccess(signers.alice.address)).to.be.true;

      // Get encrypted value and decrypt
      const encryptedValue = await contract.connect(signers.alice).getEncryptedValue();
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedValue,
        contractAddress,
        signers.alice,
      );

      expect(decrypted).to.eq(clearValue);
    });
  });

  describe("✅ Access Control", function () {
    beforeEach(async function () {
      // Initialize with alice
      const clearValue = 100;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      await contract
        .connect(signers.alice)
        .initialize(encrypted.handles[0], encrypted.inputProof);
    });

    it("should allow alice to get encrypted value", async function () {
      const encryptedValue = await contract.connect(signers.alice).getEncryptedValue();
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedValue,
        contractAddress,
        signers.alice,
      );

      expect(decrypted).to.eq(100);
    });

    it("should allow alice to grant access to bob", async function () {
      await contract.connect(signers.alice).grantAccess(signers.bob.address);

      expect(await contract.hasAccess(signers.bob.address)).to.be.true;

      // Bob should now be able to get the encrypted value
      const encryptedValue = await contract.connect(signers.bob).getEncryptedValue();
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedValue,
        contractAddress,
        signers.bob,
      );

      expect(decrypted).to.eq(100);
    });

    it("should allow alice to update the value", async function () {
      const newValue = 200;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(newValue)
        .encrypt();

      await contract
        .connect(signers.alice)
        .updateValue(encrypted.handles[0], encrypted.inputProof);

      const encryptedValue = await contract.connect(signers.alice).getEncryptedValue();
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedValue,
        contractAddress,
        signers.alice,
      );

      expect(decrypted).to.eq(newValue);
    });

    it("should allow alice to add to the value", async function () {
      const addValue = 50;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(addValue)
        .encrypt();

      await contract
        .connect(signers.alice)
        .addToValue(encrypted.handles[0], encrypted.inputProof);

      const encryptedValue = await contract.connect(signers.alice).getEncryptedValue();
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedValue,
        contractAddress,
        signers.alice,
      );

      expect(decrypted).to.eq(150); // 100 + 50
    });
  });

  describe("❌ Access Denied Cases", function () {
    beforeEach(async function () {
      // Initialize with alice
      const clearValue = 100;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      await contract
        .connect(signers.alice)
        .initialize(encrypted.handles[0], encrypted.inputProof);
    });

    it("should deny bob access before being granted", async function () {
      expect(await contract.hasAccess(signers.bob.address)).to.be.false;

      await expect(
        contract.connect(signers.bob).getEncryptedValue()
      ).to.be.revertedWith("Access denied");
    });

    it("should deny bob from updating value without access", async function () {
      const newValue = 200;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.bob.address)
        .add32(newValue)
        .encrypt();

      await expect(
        contract
          .connect(signers.bob)
          .updateValue(encrypted.handles[0], encrypted.inputProof)
      ).to.be.revertedWith("Access denied");
    });

    it("should deny bob from granting access without having access", async function () {
      await expect(
        contract.connect(signers.bob).grantAccess(signers.charlie.address)
      ).to.be.revertedWith("Access denied");
    });

    it("should deny zero address from being granted access", async function () {
      await expect(
        contract.connect(signers.alice).grantAccess(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid user address");
    });
  });

  describe("✅ Multiple Users", function () {
    beforeEach(async function () {
      // Initialize with alice
      const clearValue = 100;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(clearValue)
        .encrypt();

      await contract
        .connect(signers.alice)
        .initialize(encrypted.handles[0], encrypted.inputProof);
    });

    it("should allow multiple users to access after being granted", async function () {
      // Grant access to bob and charlie
      await contract.connect(signers.alice).grantAccess(signers.bob.address);
      await contract.connect(signers.alice).grantAccess(signers.charlie.address);

      // Both should be able to access
      const encryptedValueBob = await contract.connect(signers.bob).getEncryptedValue();
      const encryptedValueCharlie = await contract.connect(signers.charlie).getEncryptedValue();

      const decryptedBob = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedValueBob,
        contractAddress,
        signers.bob,
      );

      const decryptedCharlie = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedValueCharlie,
        contractAddress,
        signers.charlie,
      );

      expect(decryptedBob).to.eq(100);
      expect(decryptedCharlie).to.eq(100);
    });
  });
});

