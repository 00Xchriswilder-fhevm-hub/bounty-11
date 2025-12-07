import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedConfidentialYieldAggregator = await deploy("ConfidentialYieldAggregator", {
    from: deployer,
    log: true,
  });

  console.log(`ConfidentialYieldAggregator contract: `, deployedConfidentialYieldAggregator.address);
};
export default func;
func.id = "deploy_confidentialyieldaggregator";
func.tags = ["ConfidentialYieldAggregator"];
