import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedSimpleVoting_uint32 = await deploy("SimpleVoting_uint32", {
    from: deployer,
    log: true,
  });

  console.log(`SimpleVoting_uint32 contract: `, deployedSimpleVoting_uint32.address);
};
export default func;
func.id = "deploy_simplevoting_uint32";
func.tags = ["SimpleVoting_uint32"];
