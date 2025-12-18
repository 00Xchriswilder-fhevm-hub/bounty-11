import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedHandleMisuse = await deploy("HandleMisuse", {
    from: deployer,
    log: true,
  });

  console.log(`HandleMisuse contract: `, deployedHandleMisuse.address);
};
export default func;
func.id = "deploy_handlemisuse";
func.tags = ["HandleMisuse"];
