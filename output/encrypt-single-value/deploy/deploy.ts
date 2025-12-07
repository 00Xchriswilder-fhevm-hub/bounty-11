import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedEncryptSingleValue = await deploy("EncryptSingleValue", {
    from: deployer,
    log: true,
  });

  console.log(`EncryptSingleValue contract: `, deployedEncryptSingleValue.address);
};
export default func;
func.id = "deploy_encryptsinglevalue";
func.tags = ["EncryptSingleValue"];
