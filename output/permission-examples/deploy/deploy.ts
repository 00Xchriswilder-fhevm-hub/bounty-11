import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedPermissionExamples = await deploy("PermissionExamples", {
    from: deployer,
    log: true,
  });

  console.log(`PermissionExamples contract: `, deployedPermissionExamples.address);
};
export default func;
func.id = "deploy_permissionexamples";
func.tags = ["PermissionExamples"];
