import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Deploy InputProofBasics
  const deployedInputProofBasics = await deploy("InputProofBasics", {
    from: deployer,
    log: true,
  });
  console.log(`InputProofBasics contract: ${deployedInputProofBasics.address}`);

  // Deploy InputProofUsage
  const deployedInputProofUsage = await deploy("InputProofUsage", {
    from: deployer,
    log: true,
  });
  console.log(`InputProofUsage contract: ${deployedInputProofUsage.address}`);

  // Deploy InputProofAntiPatterns
  const deployedInputProofAntiPatterns = await deploy("InputProofAntiPatterns", {
    from: deployer,
    log: true,
  });
  console.log(`InputProofAntiPatterns contract: ${deployedInputProofAntiPatterns.address}`);

  // Deploy HandleLifecycle
  const deployedHandleLifecycle = await deploy("HandleLifecycle", {
    from: deployer,
    log: true,
  });
  console.log(`HandleLifecycle contract: ${deployedHandleLifecycle.address}`);

};

export default func;
func.id = "deploy_all";
func.tags = ["all", "InputProofBasics", "InputProofUsage", "InputProofAntiPatterns", "HandleLifecycle"];
