import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedAllowTransient = await deploy("AllowTransient", {
    from: deployer,
    log: true,
  });

  console.log(`AllowTransient contract: `, deployedAllowTransient.address);
};
export default func;
func.id = "deploy_allowtransient";
func.tags = ["AllowTransient"];
