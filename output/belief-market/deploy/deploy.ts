import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedBeliefMarket = await deploy("BeliefMarket", {
    from: deployer,
    log: true,
  });

  console.log(`BeliefMarket contract: `, deployedBeliefMarket.address);
};
export default func;
func.id = "deploy_beliefmarket";
func.tags = ["BeliefMarket"];
