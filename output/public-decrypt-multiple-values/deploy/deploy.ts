import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedHighestDieRoll = await deploy("HighestDieRoll", {
    from: deployer,
    log: true,
  });

  console.log(`HighestDieRoll contract: `, deployedHighestDieRoll.address);
};
export default func;
func.id = "deploy_highestdieroll";
func.tags = ["HighestDieRoll"];
