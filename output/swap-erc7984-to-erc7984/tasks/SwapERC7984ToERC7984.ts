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
 * 2. Deploy the SwapERC7984ToERC7984 contract
 *
 *   npx hardhat --network localhost deploy
 *
 * 3. Interact with the SwapERC7984ToERC7984 contract
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
 * 1. Deploy the SwapERC7984ToERC7984 contract
 *
 *   npx hardhat --network sepolia deploy
 *
 * 2. Interact with the SwapERC7984ToERC7984 contract
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
task("task:address", "Prints the SwapERC7984ToERC7984 address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;

  const swapERC7984ToERC7984 = await deployments.get("SwapERC7984ToERC7984");

  console.log("SwapERC7984ToERC7984 address is " + swapERC7984ToERC7984.address);
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

    const SwapERC7984ToERC7984Deployement = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("SwapERC7984ToERC7984");
    console.log(`SwapERC7984ToERC7984: ${SwapERC7984ToERC7984Deployement.address}`);

    const signers = await ethers.getSigners();

    const swapERC7984ToERC7984Contract = await ethers.getContractAt("SwapERC7984ToERC7984", SwapERC7984ToERC7984Deployement.address);

    const encryptedCount = await swapERC7984ToERC7984Contract.getCount();
    if (encryptedCount === ethers.ZeroHash) {
      console.log(`encrypted count: ${encryptedCount}`);
      console.log("clear count    : 0");
      return;
    }

    const clearCount = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCount,
      SwapERC7984ToERC7984Deployement.address,
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
task("task:increment", "Calls the increment() function of SwapERC7984ToERC7984 Contract")
  .addOptionalParam("address", "Optionally specify the SwapERC7984ToERC7984 contract address")
  .addParam("value", "The increment value")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const value = parseInt(taskArguments.value);
    if (!Number.isInteger(value)) {
      throw new Error(`Argument --value is not an integer`);
    }

    await fhevm.initializeCLIApi();

    const SwapERC7984ToERC7984Deployement = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("SwapERC7984ToERC7984");
    console.log(`SwapERC7984ToERC7984: ${SwapERC7984ToERC7984Deployement.address}`);

    const signers = await ethers.getSigners();

    const swapERC7984ToERC7984Contract = await ethers.getContractAt("SwapERC7984ToERC7984", SwapERC7984ToERC7984Deployement.address);

    // Encrypt the value passed as argument
    const encryptedValue = await fhevm
      .createEncryptedInput(SwapERC7984ToERC7984Deployement.address, signers[0].address)
      .add32(value)
      .encrypt();

    const tx = await swapERC7984ToERC7984Contract
      .connect(signers[0])
      .increment(encryptedValue.handles[0], encryptedValue.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    const newEncryptedCount = await swapERC7984ToERC7984Contract.getCount();
    console.log("Encrypted count after increment:", newEncryptedCount);

    console.log(`SwapERC7984ToERC7984 increment(${value}) succeeded!`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:decrement --value 1
 *   - npx hardhat --network sepolia task:decrement --value 1
 */
task("task:decrement", "Calls the decrement() function of SwapERC7984ToERC7984 Contract")
  .addOptionalParam("address", "Optionally specify the SwapERC7984ToERC7984 contract address")
  .addParam("value", "The decrement value")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const value = parseInt(taskArguments.value);
    if (!Number.isInteger(value)) {
      throw new Error(`Argument --value is not an integer`);
    }

    await fhevm.initializeCLIApi();

    const SwapERC7984ToERC7984Deployement = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("SwapERC7984ToERC7984");
    console.log(`SwapERC7984ToERC7984: ${SwapERC7984ToERC7984Deployement.address}`);

    const signers = await ethers.getSigners();

    const swapERC7984ToERC7984Contract = await ethers.getContractAt("SwapERC7984ToERC7984", SwapERC7984ToERC7984Deployement.address);

    // Encrypt the value passed as argument
    const encryptedValue = await fhevm
      .createEncryptedInput(SwapERC7984ToERC7984Deployement.address, signers[0].address)
      .add32(value)
      .encrypt();

    const tx = await swapERC7984ToERC7984Contract
      .connect(signers[0])
      .decrement(encryptedValue.handles[0], encryptedValue.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    const newEncryptedCount = await swapERC7984ToERC7984Contract.getCount();
    console.log("Encrypted count after decrement:", newEncryptedCount);

    console.log(`SwapERC7984ToERC7984 decrement(${value}) succeeded!`);
  });
