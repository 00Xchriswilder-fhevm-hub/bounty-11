import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedFHEMin = await deploy("FHEMin", {
    from: deployer,
    log: true,
  });

  console.log(`FHEMin contract: `, deployedFHEMin.address);
};
export default func;
func.id = "deploy_fhemin";
func.tags = ["FHEMin"];
