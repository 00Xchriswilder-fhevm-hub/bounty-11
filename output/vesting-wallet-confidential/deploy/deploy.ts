import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedVestingWalletConfidentialFactoryMock = await deploy("VestingWalletConfidentialFactoryMock", {
    from: deployer,
    log: true,
  });

  console.log(`VestingWalletConfidentialFactoryMock contract: `, deployedVestingWalletConfidentialFactoryMock.address);
};
export default func;
func.id = "deploy_vestingwalletconfidentialfactorymock";
func.tags = ["VestingWalletConfidentialFactoryMock"];
