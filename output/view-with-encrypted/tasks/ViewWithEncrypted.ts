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
 * 2. Deploy the ViewWithEncrypted contract
 *
 *   npx hardhat --network localhost deploy
 *
 * 3. Interact with the ViewWithEncrypted contract
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
 * 1. Deploy the ViewWithEncrypted contract
 *
 *   npx hardhat --network sepolia deploy
 *
 * 2. Interact with the ViewWithEncrypted contract
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
task("task:address", "Prints the ViewWithEncrypted address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;

  const viewWithEncrypted = await deployments.get("ViewWithEncrypted");

  console.log("ViewWithEncrypted address is " + viewWithEncrypted.address);
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

    const ViewWithEncryptedDeployement = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("ViewWithEncrypted");
    console.log(`ViewWithEncrypted: ${ViewWithEncryptedDeployement.address}`);

    const signers = await ethers.getSigners();

    const viewWithEncryptedContract = await ethers.getContractAt("ViewWithEncrypted", ViewWithEncryptedDeployement.address);

    const encryptedCount = await viewWithEncryptedContract.getCount();
    if (encryptedCount === ethers.ZeroHash) {
      console.log(`encrypted count: ${encryptedCount}`);
      console.log("clear count    : 0");
      return;
    }

    const clearCount = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCount,
      ViewWithEncryptedDeployement.address,
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
task("task:increment", "Calls the increment() function of ViewWithEncrypted Contract")
  .addOptionalParam("address", "Optionally specify the ViewWithEncrypted contract address")
  .addParam("value", "The increment value")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const value = parseInt(taskArguments.value);
    if (!Number.isInteger(value)) {
      throw new Error(`Argument --value is not an integer`);
    }

    await fhevm.initializeCLIApi();

    const ViewWithEncryptedDeployement = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("ViewWithEncrypted");
    console.log(`ViewWithEncrypted: ${ViewWithEncryptedDeployement.address}`);

    const signers = await ethers.getSigners();

    const viewWithEncryptedContract = await ethers.getContractAt("ViewWithEncrypted", ViewWithEncryptedDeployement.address);

    // Encrypt the value passed as argument
    const encryptedValue = await fhevm
      .createEncryptedInput(ViewWithEncryptedDeployement.address, signers[0].address)
      .add32(value)
      .encrypt();

    const tx = await viewWithEncryptedContract
      .connect(signers[0])
      .increment(encryptedValue.handles[0], encryptedValue.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    const newEncryptedCount = await viewWithEncryptedContract.getCount();
    console.log("Encrypted count after increment:", newEncryptedCount);

    console.log(`ViewWithEncrypted increment(${value}) succeeded!`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:decrement --value 1
 *   - npx hardhat --network sepolia task:decrement --value 1
 */
task("task:decrement", "Calls the decrement() function of ViewWithEncrypted Contract")
  .addOptionalParam("address", "Optionally specify the ViewWithEncrypted contract address")
  .addParam("value", "The decrement value")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const value = parseInt(taskArguments.value);
    if (!Number.isInteger(value)) {
      throw new Error(`Argument --value is not an integer`);
    }

    await fhevm.initializeCLIApi();

    const ViewWithEncryptedDeployement = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("ViewWithEncrypted");
    console.log(`ViewWithEncrypted: ${ViewWithEncryptedDeployement.address}`);

    const signers = await ethers.getSigners();

    const viewWithEncryptedContract = await ethers.getContractAt("ViewWithEncrypted", ViewWithEncryptedDeployement.address);

    // Encrypt the value passed as argument
    const encryptedValue = await fhevm
      .createEncryptedInput(ViewWithEncryptedDeployement.address, signers[0].address)
      .add32(value)
      .encrypt();

    const tx = await viewWithEncryptedContract
      .connect(signers[0])
      .decrement(encryptedValue.handles[0], encryptedValue.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    const newEncryptedCount = await viewWithEncryptedContract.getCount();
    console.log("Encrypted count after decrement:", newEncryptedCount);

    console.log(`ViewWithEncrypted decrement(${value}) succeeded!`);
  });
