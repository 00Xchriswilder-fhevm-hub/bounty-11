import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Deploy ERC7984Mock
  const deployedERC7984Mock = await deploy("ERC7984Mock", {
    from: deployer,
    log: true,
  });
  console.log(`ERC7984Mock contract: ${deployedERC7984Mock.address}`);

  // Deploy ERC7984ToERC20Wrapper
  const deployedERC7984ToERC20Wrapper = await deploy("ERC7984ToERC20Wrapper", {
    from: deployer,
    log: true,
  });
  console.log(`ERC7984ToERC20Wrapper contract: ${deployedERC7984ToERC20Wrapper.address}`);

  // Deploy SwapERC7984ToERC20
  const deployedSwapERC7984ToERC20 = await deploy("SwapERC7984ToERC20", {
    from: deployer,
    log: true,
  });
  console.log(`SwapERC7984ToERC20 contract: ${deployedSwapERC7984ToERC20.address}`);

  // Deploy SwapERC7984ToERC7984
  const deployedSwapERC7984ToERC7984 = await deploy("SwapERC7984ToERC7984", {
    from: deployer,
    log: true,
  });
  console.log(`SwapERC7984ToERC7984 contract: ${deployedSwapERC7984ToERC7984.address}`);

  // Deploy VestingWallet
  const deployedVestingWallet = await deploy("VestingWallet", {
    from: deployer,
    log: true,
  });
  console.log(`VestingWallet contract: ${deployedVestingWallet.address}`);

  // Deploy VestingWalletConfidentialFactoryMock
  const deployedVestingWalletConfidentialFactoryMock = await deploy("VestingWalletConfidentialFactoryMock", {
    from: deployer,
    log: true,
  });
  console.log(`VestingWalletConfidentialFactoryMock contract: ${deployedVestingWalletConfidentialFactoryMock.address}`);

  // Deploy VestingWalletCliffConfidentialFactoryMock
  const deployedVestingWalletCliffConfidentialFactoryMock = await deploy("VestingWalletCliffConfidentialFactoryMock", {
    from: deployer,
    log: true,
  });
  console.log(`VestingWalletCliffConfidentialFactoryMock contract: ${deployedVestingWalletCliffConfidentialFactoryMock.address}`);

  // Deploy ERC7984VotesMock
  const deployedERC7984VotesMock = await deploy("ERC7984VotesMock", {
    from: deployer,
    log: true,
  });
  console.log(`ERC7984VotesMock contract: ${deployedERC7984VotesMock.address}`);

  // Deploy ERC7984Initialized
  const deployedERC7984Initialized = await deploy("ERC7984Initialized", {
    from: deployer,
    log: true,
  });
  console.log(`ERC7984Initialized contract: ${deployedERC7984Initialized.address}`);

  // Deploy ERC7984OmnibusMock
  const deployedERC7984OmnibusMock = await deploy("ERC7984OmnibusMock", {
    from: deployer,
    log: true,
  });
  console.log(`ERC7984OmnibusMock contract: ${deployedERC7984OmnibusMock.address}`);

};

export default func;
func.id = "deploy_all";
func.tags = ["all", "ERC7984Mock", "ERC7984ToERC20Wrapper", "SwapERC7984ToERC20", "SwapERC7984ToERC7984", "VestingWallet", "VestingWalletConfidentialFactoryMock", "VestingWalletCliffConfidentialFactoryMock", "ERC7984VotesMock", "ERC7984Initialized", "ERC7984OmnibusMock"];
