import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Deploy FHEPermissionsAntiPatterns
  const deployedFHEPermissionsAntiPatterns = await deploy("FHEPermissionsAntiPatterns", {
    from: deployer,
    log: true,
  });
  console.log(`FHEPermissionsAntiPatterns contract: ${deployedFHEPermissionsAntiPatterns.address}`);

  // Deploy MissingAllowThis
  const deployedMissingAllowThis = await deploy("MissingAllowThis", {
    from: deployer,
    log: true,
  });
  console.log(`MissingAllowThis contract: ${deployedMissingAllowThis.address}`);

  // Deploy HandleMisuse
  const deployedHandleMisuse = await deploy("HandleMisuse", {
    from: deployer,
    log: true,
  });
  console.log(`HandleMisuse contract: ${deployedHandleMisuse.address}`);

};

export default func;
func.id = "deploy_all";
func.tags = ["all", "FHEPermissionsAntiPatterns", "MissingAllowThis", "HandleMisuse"];
