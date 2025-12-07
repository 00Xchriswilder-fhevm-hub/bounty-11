import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedFHEIfThenElse = await deploy("FHEIfThenElse", {
    from: deployer,
    log: true,
  });

  console.log(`FHEIfThenElse contract: `, deployedFHEIfThenElse.address);
};
export default func;
func.id = "deploy_fheifthenelse";
func.tags = ["FHEIfThenElse"];
