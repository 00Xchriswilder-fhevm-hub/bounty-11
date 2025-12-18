import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedBlindAuction = await deploy("BlindAuction", {
    from: deployer,
    log: true,
  });

  console.log(`BlindAuction contract: `, deployedBlindAuction.address);
};
export default func;
func.id = "deploy_blindauction";
func.tags = ["BlindAuction"];
