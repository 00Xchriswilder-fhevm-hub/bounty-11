import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedViewWithEncrypted = await deploy("ViewWithEncrypted", {
    from: deployer,
    log: true,
  });

  console.log(`ViewWithEncrypted contract: `, deployedViewWithEncrypted.address);
};
export default func;
func.id = "deploy_viewwithencrypted";
func.tags = ["ViewWithEncrypted"];
