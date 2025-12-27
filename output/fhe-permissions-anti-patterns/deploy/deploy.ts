import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedFHEPermissionsAntiPatterns = await deploy("FHEPermissionsAntiPatterns", {
    from: deployer,
    log: true,
  });

  console.log(`FHEPermissionsAntiPatterns contract: `, deployedFHEPermissionsAntiPatterns.address);
};
export default func;
func.id = "deploy_fhepermissionsantipatterns";
func.tags = ["FHEPermissionsAntiPatterns"];
