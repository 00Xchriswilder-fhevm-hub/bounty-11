import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedHandleLifecycle = await deploy("HandleLifecycle", {
    from: deployer,
    log: true,
  });

  console.log(`HandleLifecycle contract: `, deployedHandleLifecycle.address);
};
export default func;
func.id = "deploy_handlelifecycle";
func.tags = ["HandleLifecycle"];
