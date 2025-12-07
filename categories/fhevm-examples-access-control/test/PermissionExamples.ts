import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { PermissionExamples, PermissionExamples__factory } from "../../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

/**
 * @chapter access-control
 * @title Permission Examples Test Suite
 * @notice Tests for PermissionExamples contract showing various permission scenarios
 * @dev This test suite demonstrates:
 *      - ✅ Multiple permission scenarios
 *      - ✅ Permission inheritance in operations
 *      - ✅ Granting permissions to multiple users
 */

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("PermissionExamples")) as PermissionExamples__factory;
  const contract = (await factory.deploy()) as PermissionExamples;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("PermissionExamples", function () {
  let signers: Signers;
  let contract: PermissionExamples;
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
  });

  describe("✅ Setting Values", function () {
    it("should set value A", async function () {
      const valueA = 10;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(valueA)
        .encrypt();

      await contract
        .connect(signers.alice)
        .setValueA(encrypted.handles[0], encrypted.inputProof);

      expect(await contract.hasPermission(signers.alice.address)).to.be.true;

      const encryptedValue = await contract.connect(signers.alice).getValueA();
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedValue,
        contractAddress,
        signers.alice,
      );

      expect(decrypted).to.eq(valueA);
    });

    it("should set value B", async function () {
      const valueB = 20;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(valueB)
        .encrypt();

      await contract
        .connect(signers.alice)
        .setValueB(encrypted.handles[0], encrypted.inputProof);

      const encryptedValue = await contract.connect(signers.alice).getValueB();
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedValue,
        contractAddress,
        signers.alice,
      );

      expect(decrypted).to.eq(valueB);
    });
  });

  describe("✅ Operations", function () {
    beforeEach(async function () {
      // Set value A = 10
      const encryptedA = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(10)
        .encrypt();
      await contract
        .connect(signers.alice)
        .setValueA(encryptedA.handles[0], encryptedA.inputProof);

      // Set value B = 20
      const encryptedB = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(20)
        .encrypt();
      await contract
        .connect(signers.alice)
        .setValueB(encryptedB.handles[0], encryptedB.inputProof);
    });

    it("should add values A and B", async function () {
      await contract.connect(signers.alice).addValues();

      const encryptedResult = await contract.connect(signers.alice).getResult();
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(decrypted).to.eq(30); // 10 + 20
    });

    it("should subtract values (A - B)", async function () {
      await contract.connect(signers.alice).subtractValues();

      const encryptedResult = await contract.connect(signers.alice).getResult();
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      // FHE uint32 subtraction wraps on underflow: 10 - 20 = 2^32 - 10 = 4294967286
      // This is expected behavior for unsigned integers
      expect(decrypted).to.eq(4294967286); // 10 - 20 wraps to max uint32 - 10
    });

    it("should multiply values A and B", async function () {
      await contract.connect(signers.alice).multiplyValues();

      const encryptedResult = await contract.connect(signers.alice).getResult();
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(decrypted).to.eq(200); // 10 * 20
    });

    it("should perform complex operation (A + B) * 2", async function () {
      await contract.connect(signers.alice).complexOperation();

      const encryptedResult = await contract.connect(signers.alice).getResult();
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(decrypted).to.eq(60); // (10 + 20) * 2
    });
  });

  describe("✅ Permission Granting", function () {
    beforeEach(async function () {
      // Set value A with alice
      const encryptedA = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(10)
        .encrypt();
      await contract
        .connect(signers.alice)
        .setValueA(encryptedA.handles[0], encryptedA.inputProof);
    });

    it("should allow alice to grant permission to bob for value A", async function () {
      await contract.connect(signers.alice).grantPermissionForA(signers.bob.address);

      expect(await contract.hasPermission(signers.bob.address)).to.be.true;

      // Bob should now be able to access value A
      const encryptedValue = await contract.connect(signers.bob).getValueA();
      const decrypted = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedValue,
        contractAddress,
        signers.bob,
      );

      expect(decrypted).to.eq(10);
    });
  });

  describe("❌ Permission Denied", function () {
    it("should deny access without permission", async function () {
      await expect(
        contract.connect(signers.bob).getValueA()
      ).to.be.revertedWith("Permission denied");
    });

    it("should deny granting permission without having permission", async function () {
      await expect(
        contract.connect(signers.bob).grantPermissionForA(signers.alice.address)
      ).to.be.revertedWith("You don't have permission");
    });
  });
});

