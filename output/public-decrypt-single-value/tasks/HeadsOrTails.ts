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
 * 2. Deploy the HeadsOrTails contract
 *
 *   npx hardhat --network localhost deploy
 *
 * 3. Interact with the HeadsOrTails contract
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
 * 1. Deploy the HeadsOrTails contract
 *
 *   npx hardhat --network sepolia deploy
 *
 * 2. Interact with the HeadsOrTails contract
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
task("task:address", "Prints the HeadsOrTails address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;

  const headsOrTails = await deployments.get("HeadsOrTails");

  console.log("HeadsOrTails address is " + headsOrTails.address);
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

    const HeadsOrTailsDeployement = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("HeadsOrTails");
    console.log(`HeadsOrTails: ${HeadsOrTailsDeployement.address}`);

    const signers = await ethers.getSigners();

    const headsOrTailsContract = await ethers.getContractAt("HeadsOrTails", HeadsOrTailsDeployement.address);

    const encryptedCount = await headsOrTailsContract.getCount();
    if (encryptedCount === ethers.ZeroHash) {
      console.log(`encrypted count: ${encryptedCount}`);
      console.log("clear count    : 0");
      return;
    }

    const clearCount = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCount,
      HeadsOrTailsDeployement.address,
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
task("task:increment", "Calls the increment() function of HeadsOrTails Contract")
  .addOptionalParam("address", "Optionally specify the HeadsOrTails contract address")
  .addParam("value", "The increment value")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const value = parseInt(taskArguments.value);
    if (!Number.isInteger(value)) {
      throw new Error(`Argument --value is not an integer`);
    }

    await fhevm.initializeCLIApi();

    const HeadsOrTailsDeployement = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("HeadsOrTails");
    console.log(`HeadsOrTails: ${HeadsOrTailsDeployement.address}`);

    const signers = await ethers.getSigners();

    const headsOrTailsContract = await ethers.getContractAt("HeadsOrTails", HeadsOrTailsDeployement.address);

    // Encrypt the value passed as argument
    const encryptedValue = await fhevm
      .createEncryptedInput(HeadsOrTailsDeployement.address, signers[0].address)
      .add32(value)
      .encrypt();

    const tx = await headsOrTailsContract
      .connect(signers[0])
      .increment(encryptedValue.handles[0], encryptedValue.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    const newEncryptedCount = await headsOrTailsContract.getCount();
    console.log("Encrypted count after increment:", newEncryptedCount);

    console.log(`HeadsOrTails increment(${value}) succeeded!`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:decrement --value 1
 *   - npx hardhat --network sepolia task:decrement --value 1
 */
task("task:decrement", "Calls the decrement() function of HeadsOrTails Contract")
  .addOptionalParam("address", "Optionally specify the HeadsOrTails contract address")
  .addParam("value", "The decrement value")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const value = parseInt(taskArguments.value);
    if (!Number.isInteger(value)) {
      throw new Error(`Argument --value is not an integer`);
    }

    await fhevm.initializeCLIApi();

    const HeadsOrTailsDeployement = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("HeadsOrTails");
    console.log(`HeadsOrTails: ${HeadsOrTailsDeployement.address}`);

    const signers = await ethers.getSigners();

    const headsOrTailsContract = await ethers.getContractAt("HeadsOrTails", HeadsOrTailsDeployement.address);

    // Encrypt the value passed as argument
    const encryptedValue = await fhevm
      .createEncryptedInput(HeadsOrTailsDeployement.address, signers[0].address)
      .add32(value)
      .encrypt();

    const tx = await headsOrTailsContract
      .connect(signers[0])
      .decrement(encryptedValue.handles[0], encryptedValue.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    const newEncryptedCount = await headsOrTailsContract.getCount();
    console.log("Encrypted count after decrement:", newEncryptedCount);

    console.log(`HeadsOrTails decrement(${value}) succeeded!`);
  });
