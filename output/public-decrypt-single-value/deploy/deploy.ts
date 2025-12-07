import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedHeadsOrTails = await deploy("HeadsOrTails", {
    from: deployer,
    log: true,
  });

  console.log(`HeadsOrTails contract: `, deployedHeadsOrTails.address);
};
export default func;
func.id = "deploy_headsortails";
func.tags = ["HeadsOrTails"];
