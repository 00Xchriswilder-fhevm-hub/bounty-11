import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedUserDecryptMultipleValues = await deploy("UserDecryptMultipleValues", {
    from: deployer,
    log: true,
  });

  console.log(`UserDecryptMultipleValues contract: `, deployedUserDecryptMultipleValues.address);
};
export default func;
func.id = "deploy_userdecryptmultiplevalues";
func.tags = ["UserDecryptMultipleValues"];
