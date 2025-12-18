import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedInputProofUsage = await deploy("InputProofUsage", {
    from: deployer,
    log: true,
  });

  console.log(`InputProofUsage contract: `, deployedInputProofUsage.address);
};
export default func;
func.id = "deploy_inputproofusage";
func.tags = ["InputProofUsage"];
