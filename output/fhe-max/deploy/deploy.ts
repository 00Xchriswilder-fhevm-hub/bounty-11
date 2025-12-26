import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedFHEMax = await deploy("FHEMax", {
    from: deployer,
    log: true,
  });

  console.log(`FHEMax contract: `, deployedFHEMax.address);
};
export default func;
func.id = "deploy_fhemax";
func.tags = ["FHEMax"];
