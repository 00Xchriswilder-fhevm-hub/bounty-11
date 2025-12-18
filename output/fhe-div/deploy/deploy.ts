import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedFHEDiv = await deploy("FHEDiv", {
    from: deployer,
    log: true,
  });

  console.log(`FHEDiv contract: `, deployedFHEDiv.address);
};
export default func;
func.id = "deploy_fhediv";
func.tags = ["FHEDiv"];
