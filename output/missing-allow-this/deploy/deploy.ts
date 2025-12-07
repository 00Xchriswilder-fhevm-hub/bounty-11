import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedMissingAllowThis = await deploy("MissingAllowThis", {
    from: deployer,
    log: true,
  });

  console.log(`MissingAllowThis contract: `, deployedMissingAllowThis.address);
};
export default func;
func.id = "deploy_missingallowthis";
func.tags = ["MissingAllowThis"];
