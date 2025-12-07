import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Deploy AccessControl
  const deployedAccessControl = await deploy("AccessControl", {
    from: deployer,
    log: true,
  });
  console.log(`AccessControl contract: ${deployedAccessControl.address}`);

  // Deploy AllowTransient
  const deployedAllowTransient = await deploy("AllowTransient", {
    from: deployer,
    log: true,
  });
  console.log(`AllowTransient contract: ${deployedAllowTransient.address}`);

  // Deploy PermissionExamples
  const deployedPermissionExamples = await deploy("PermissionExamples", {
    from: deployer,
    log: true,
  });
  console.log(`PermissionExamples contract: ${deployedPermissionExamples.address}`);

};

export default func;
func.id = "deploy_all";
func.tags = ["all", "AccessControl", "AllowTransient", "PermissionExamples"];
