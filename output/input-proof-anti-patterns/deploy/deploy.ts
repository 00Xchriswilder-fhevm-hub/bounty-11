import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedInputProofAntiPatterns = await deploy("InputProofAntiPatterns", {
    from: deployer,
    log: true,
  });

  console.log(`InputProofAntiPatterns contract: `, deployedInputProofAntiPatterns.address);
};
export default func;
func.id = "deploy_inputproofantipatterns";
func.tags = ["InputProofAntiPatterns"];
