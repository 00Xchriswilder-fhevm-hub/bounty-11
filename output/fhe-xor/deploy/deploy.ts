import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedFHEXor = await deploy("FHEXor", {
    from: deployer,
    log: true,
  });

  console.log(`FHEXor contract: `, deployedFHEXor.address);
};
export default func;
func.id = "deploy_fhexor";
func.tags = ["FHEXor"];
