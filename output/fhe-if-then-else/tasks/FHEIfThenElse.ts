import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

/**
 * Tutorial: Deploy and Interact Locally (--network localhost)
 * ===========================================================
 *
 * 1. From a separate terminal window:
 *
 *   npx hardhat node
 *
 * 2. Deploy the FHEIfThenElse contract
 *
 *   npx hardhat --network localhost deploy
 *
 * 3. Interact with the FHEIfThenElse contract
 *
 *   npx hardhat --network localhost task:decrypt-count
 *   npx hardhat --network localhost task:increment --value 2
 *   npx hardhat --network localhost task:decrement --value 1
 *   npx hardhat --network localhost task:decrypt-count
 *
 *
 * Tutorial: Deploy and Interact on Sepolia (--network sepolia)
 * ===========================================================
 *
 * 1. Deploy the FHEIfThenElse contract
 *
 *   npx hardhat --network sepolia deploy
 *
 * 2. Interact with the FHEIfThenElse contract
 *
 *   npx hardhat --network sepolia task:decrypt-count
 *   npx hardhat --network sepolia task:increment --value 2
 *   npx hardhat --network sepolia task:decrement --value 1
 *   npx hardhat --network sepolia task:decrypt-count
 *
 */

/**
 * Example:
 *   - npx hardhat --network localhost task:address
 *   - npx hardhat --network sepolia task:address
 */
task("task:address", "Prints the FHEIfThenElse address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;

  const fHEIfThenElse = await deployments.get("FHEIfThenElse");

  console.log("FHEIfThenElse address is " + fHEIfThenElse.address);
});

/**
 * Example:
 *   - npx hardhat --network localhost task:decrypt-count
 *   - npx hardhat --network sepolia task:decrypt-count
 */
task("task:decrypt-count", "Calls the getCount() function of Counter Contract")
  .addOptionalParam("address", "Optionally specify the Counter contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const FHEIfThenElseDeployement = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("FHEIfThenElse");
    console.log(`FHEIfThenElse: ${FHEIfThenElseDeployement.address}`);

    const signers = await ethers.getSigners();

    const fHEIfThenElseContract = await ethers.getContractAt("FHEIfThenElse", FHEIfThenElseDeployement.address);

    const encryptedCount = await fHEIfThenElseContract.getCount();
    if (encryptedCount === ethers.ZeroHash) {
      console.log(`encrypted count: ${encryptedCount}`);
      console.log("clear count    : 0");
      return;
    }

    const clearCount = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCount,
      FHEIfThenElseDeployement.address,
      signers[0],
    );
    console.log(`Encrypted count: ${encryptedCount}`);
    console.log(`Clear count    : ${clearCount}`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:increment --value 1
 *   - npx hardhat --network sepolia task:increment --value 1
 */
task("task:increment", "Calls the increment() function of FHEIfThenElse Contract")
  .addOptionalParam("address", "Optionally specify the FHEIfThenElse contract address")
  .addParam("value", "The increment value")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const value = parseInt(taskArguments.value);
    if (!Number.isInteger(value)) {
      throw new Error(`Argument --value is not an integer`);
    }

    await fhevm.initializeCLIApi();

    const FHEIfThenElseDeployement = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("FHEIfThenElse");
    console.log(`FHEIfThenElse: ${FHEIfThenElseDeployement.address}`);

    const signers = await ethers.getSigners();

    const fHEIfThenElseContract = await ethers.getContractAt("FHEIfThenElse", FHEIfThenElseDeployement.address);

    // Encrypt the value passed as argument
    const encryptedValue = await fhevm
      .createEncryptedInput(FHEIfThenElseDeployement.address, signers[0].address)
      .add32(value)
      .encrypt();

    const tx = await fHEIfThenElseContract
      .connect(signers[0])
      .increment(encryptedValue.handles[0], encryptedValue.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    const newEncryptedCount = await fHEIfThenElseContract.getCount();
    console.log("Encrypted count after increment:", newEncryptedCount);

    console.log(`FHEIfThenElse increment(${value}) succeeded!`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:decrement --value 1
 *   - npx hardhat --network sepolia task:decrement --value 1
 */
task("task:decrement", "Calls the decrement() function of FHEIfThenElse Contract")
  .addOptionalParam("address", "Optionally specify the FHEIfThenElse contract address")
  .addParam("value", "The decrement value")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const value = parseInt(taskArguments.value);
    if (!Number.isInteger(value)) {
      throw new Error(`Argument --value is not an integer`);
    }

    await fhevm.initializeCLIApi();

    const FHEIfThenElseDeployement = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("FHEIfThenElse");
    console.log(`FHEIfThenElse: ${FHEIfThenElseDeployement.address}`);

    const signers = await ethers.getSigners();

    const fHEIfThenElseContract = await ethers.getContractAt("FHEIfThenElse", FHEIfThenElseDeployement.address);

    // Encrypt the value passed as argument
    const encryptedValue = await fhevm
      .createEncryptedInput(FHEIfThenElseDeployement.address, signers[0].address)
      .add32(value)
      .encrypt();

    const tx = await fHEIfThenElseContract
      .connect(signers[0])
      .decrement(encryptedValue.handles[0], encryptedValue.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    const newEncryptedCount = await fHEIfThenElseContract.getCount();
    console.log("Encrypted count after decrement:", newEncryptedCount);

    console.log(`FHEIfThenElse decrement(${value}) succeeded!`);
  });
