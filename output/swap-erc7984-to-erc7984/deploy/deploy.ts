import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedSwapERC7984ToERC7984 = await deploy("SwapERC7984ToERC7984", {
    from: deployer,
    log: true,
  });

  console.log(`SwapERC7984ToERC7984 contract: `, deployedSwapERC7984ToERC7984.address);
};
export default func;
func.id = "deploy_swaperc7984toerc7984";
func.tags = ["SwapERC7984ToERC7984"];
