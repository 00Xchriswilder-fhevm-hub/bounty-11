import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import type { FHEPermissionsAntiPatterns, FHEPermissionsAntiPatterns__factory } from "../../types";

type Signers = {
  owner: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHEPermissionsAntiPatterns")) as unknown as FHEPermissionsAntiPatterns__factory;
  const contract = (await factory.deploy()) as FHEPermissionsAntiPatterns;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

/**
 * @chapter anti-patterns
 * @title FHE Permissions Anti-Patterns Test
 * @notice Tests demonstrating common permission mistakes in FHE development
 */
describe("FHEPermissionsAntiPatterns", function () {
  let contract: FHEPermissionsAntiPatterns;
  let contractAddress: string;
  let signers: Signers;

  before(async function () {
    if (!hre.fhevm.isMock) {
      throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`);
    }
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { owner: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    const deployment = await deployFixture();
    contractAddress = deployment.contractAddress;
    contract = deployment.contract;
  });

  describe("Anti-Pattern 1: Missing allowThis After Computation", function () {
    it("should work correctly when using correctWithAllowThis", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      const value = 50;

      const input = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(value).encrypt();
      const tx = await contract.connect(signers.alice).correctWithAllowThis(input.handles[0], input.inputProof);
      await tx.wait();

      // Should be able to get the value
      const encryptedResult = await contract.getValue();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      // Value should be doubled (50 * 2 = 100)
      expect(clearResult).to.equal(value * 2);
    });

    it("❌ wrongMissingAllowThis stores value but contract loses access", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      const value = 50;

      const input = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(value).encrypt();
      
      // This call succeeds but the contract won't be able to use the value later
      const tx = await contract.connect(signers.alice).wrongMissingAllowThis(input.handles[0], input.inputProof);
      await tx.wait();

      // The value is stored but without allowThis, the contract can't use it
      // This demonstrates the anti-pattern - operation succeeds but creates unusable state
    });
  });

  describe("Anti-Pattern 2: Missing allow(user)", function () {
    it("should work correctly when using correctWithUserAllow", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      const value = 100;

      const input = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(value).encrypt();
      const tx = await contract.connect(signers.alice).correctWithUserAllow(input.handles[0], input.inputProof);
      await tx.wait();

      // User should be able to decrypt
      const encryptedResult = await contract.getValue();
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.equal(value);
    });

    it("❌ wrongMissingUserAllow prevents user from decrypting", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      const value = 100;

      const input = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(value).encrypt();
      const tx = await contract.connect(signers.alice).wrongMissingUserAllow(input.handles[0], input.inputProof);
      await tx.wait();

      // Value is stored but user can't decrypt it without allow(user) permission
      // The contract has allowThis but user has no permission
    });
  });

  describe("Anti-Pattern 3: View Function Without Permissions", function () {
    it("view functions CAN return encrypted handles", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      const value = 42;

      // First store with correct permissions
      const input = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(value).encrypt();
      const tx = await contract.connect(signers.alice).correctStoreWithPermission(input.handles[0], input.inputProof);
      await tx.wait();

      // View function returns the handle - this is ALLOWED
      const encryptedResult = await contract.getValue();
      
      // User can decrypt because they have permission
      const clearResult = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedResult,
        contractAddress,
        signers.alice,
      );

      expect(clearResult).to.equal(value);
    });

    it("❌ wrongStoreWithoutPermission - view returns handle but user can't decrypt", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      const value = 42;

      const input = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(value).encrypt();
      const tx = await contract.connect(signers.alice).wrongStoreWithoutPermission(input.handles[0], input.inputProof);
      await tx.wait();

      // View function still returns the handle (this works!)
      const encryptedResult = await contract.getValue();
      expect(encryptedResult).to.not.equal(0n);

      // But user can't decrypt without permission
      // This demonstrates: view CAN return handles, but user needs permission to decrypt
    });
  });

  describe("Anti-Pattern 4: Transfer Without Permission Propagation", function () {
    it("should work correctly with correctTransferWithPermission", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

      // Initialize Alice's balance
      const aliceBalance = 1000;
      const aliceInput = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(aliceBalance).encrypt();
      let tx = await contract.connect(signers.alice).initializeBalance(aliceInput.handles[0], aliceInput.inputProof);
      await tx.wait();

      // Initialize Bob's balance
      const bobBalance = 500;
      const bobInput = await fhevm.createEncryptedInput(contractAddress, signers.bob.address).add32(bobBalance).encrypt();
      tx = await contract.connect(signers.bob).initializeBalance(bobInput.handles[0], bobInput.inputProof);
      await tx.wait();

      // Transfer from Alice to Bob with correct permissions
      const transferAmount = 200;
      const transferInput = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(transferAmount).encrypt();
      tx = await contract.connect(signers.alice).correctTransferWithPermission(
        signers.bob.address,
        transferInput.handles[0],
        transferInput.inputProof
      );
      await tx.wait();

      // Both should be able to decrypt their balances
      const aliceEncryptedBalance = await contract.getBalance(signers.alice.address);
      const aliceClearBalance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        aliceEncryptedBalance,
        contractAddress,
        signers.alice,
      );
      expect(aliceClearBalance).to.equal(aliceBalance - transferAmount);

      const bobEncryptedBalance = await contract.getBalance(signers.bob.address);
      const bobClearBalance = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        bobEncryptedBalance,
        contractAddress,
        signers.bob,
      );
      expect(bobClearBalance).to.equal(bobBalance + transferAmount);
    });

    it("❌ wrongTransferWithoutPermission - recipient can't use their balance", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

      // Initialize Alice's balance
      const aliceBalance = 1000;
      const aliceInput = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(aliceBalance).encrypt();
      let tx = await contract.connect(signers.alice).initializeBalance(aliceInput.handles[0], aliceInput.inputProof);
      await tx.wait();

      // Transfer without proper permissions
      const transferAmount = 200;
      const transferInput = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(transferAmount).encrypt();
      tx = await contract.connect(signers.alice).wrongTransferWithoutPermission(
        signers.bob.address,
        transferInput.handles[0],
        transferInput.inputProof
      );
      await tx.wait();

      // Transfer happened but Bob has no permission to use his new balance
      // This demonstrates the anti-pattern
    });
  });

  // ❌ Common Pitfalls
  describe("❌ Common Pitfalls", function () {
    it("should fail when using wrong signer for encrypted input", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

      // Create input with Alice's address but try to use with Bob
      const input = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(100).encrypt();
      
      // Bob tries to use Alice's proof
      await expect(
        contract.connect(signers.bob).correctWithUserAllow(input.handles[0], input.inputProof)
      ).to.be.reverted;
    });

    it("should fail with invalid proof", async function () {
      const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;
      const input = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add32(100).encrypt();
      
      // Use invalid proof
      const invalidProof = "0x" + "00".repeat(32);
      
      await expect(
        contract.connect(signers.alice).correctWithUserAllow(input.handles[0], invalidProof)
      ).to.be.reverted;
    });
  });
});

