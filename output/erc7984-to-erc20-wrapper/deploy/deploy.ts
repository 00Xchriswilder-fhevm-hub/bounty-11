import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedERC7984ToERC20Wrapper = await deploy("ERC7984ToERC20Wrapper", {
    from: deployer,
    log: true,
  });

  console.log(`ERC7984ToERC20Wrapper contract: `, deployedERC7984ToERC20Wrapper.address);
};
export default func;
func.id = "deploy_erc7984toerc20wrapper";
func.tags = ["ERC7984ToERC20Wrapper"];
