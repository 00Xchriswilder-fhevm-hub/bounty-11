import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedFHERem = await deploy("FHERem", {
    from: deployer,
    log: true,
  });

  console.log(`FHERem contract: `, deployedFHERem.address);
};
export default func;
func.id = "deploy_fherem";
func.tags = ["FHERem"];
