import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedFHEAdd = await deploy("FHEAdd", {
    from: deployer,
    log: true,
  });

  console.log(`FHEAdd contract: `, deployedFHEAdd.address);
};
export default func;
func.id = "deploy_fheadd";
func.tags = ["FHEAdd"];
