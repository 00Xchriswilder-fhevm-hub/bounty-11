import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedAccessControl = await deploy("AccessControl", {
    from: deployer,
    log: true,
  });

  console.log(`AccessControl contract: `, deployedAccessControl.address);
};
export default func;
func.id = "deploy_accesscontrol";
func.tags = ["AccessControl"];
