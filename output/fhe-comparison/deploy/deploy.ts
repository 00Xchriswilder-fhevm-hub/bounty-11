import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedFHEComparison = await deploy("FHEComparison", {
    from: deployer,
    log: true,
  });

  console.log(`FHEComparison contract: `, deployedFHEComparison.address);
};
export default func;
func.id = "deploy_fhecomparison";
func.tags = ["FHEComparison"];
