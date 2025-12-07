import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedFHELegacyVault = await deploy("FHELegacyVault", {
    from: deployer,
    log: true,
  });

  console.log(`FHELegacyVault contract: `, deployedFHELegacyVault.address);
};
export default func;
func.id = "deploy_fhelegacyvault";
func.tags = ["FHELegacyVault"];
