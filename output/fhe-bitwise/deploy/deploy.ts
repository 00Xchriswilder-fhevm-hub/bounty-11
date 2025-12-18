import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedFHEBitwise = await deploy("FHEBitwise", {
    from: deployer,
    log: true,
  });

  console.log(`FHEBitwise contract: `, deployedFHEBitwise.address);
};
export default func;
func.id = "deploy_fhebitwise";
func.tags = ["FHEBitwise"];
