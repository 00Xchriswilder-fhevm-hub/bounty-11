import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedConfidentialLendingPool = await deploy("ConfidentialLendingPool", {
    from: deployer,
    log: true,
  });

  console.log(`ConfidentialLendingPool contract: `, deployedConfidentialLendingPool.address);
};
export default func;
func.id = "deploy_confidentiallendingpool";
func.tags = ["ConfidentialLendingPool"];
