import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedVestingWalletCliffConfidentialFactoryMock = await deploy("VestingWalletCliffConfidentialFactoryMock", {
    from: deployer,
    log: true,
  });

  console.log(`VestingWalletCliffConfidentialFactoryMock contract: `, deployedVestingWalletCliffConfidentialFactoryMock.address);
};
export default func;
func.id = "deploy_vestingwalletcliffconfidentialfactorymock";
func.tags = ["VestingWalletCliffConfidentialFactoryMock"];
