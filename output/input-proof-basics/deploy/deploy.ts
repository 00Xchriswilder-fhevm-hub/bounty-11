import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedInputProofBasics = await deploy("InputProofBasics", {
    from: deployer,
    log: true,
  });

  console.log(`InputProofBasics contract: `, deployedInputProofBasics.address);
};
export default func;
func.id = "deploy_inputproofbasics";
func.tags = ["InputProofBasics"];
