import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedERC7984Initialized = await deploy("ERC7984Initialized", {
    from: deployer,
    log: true,
  });

  console.log(`ERC7984Initialized contract: `, deployedERC7984Initialized.address);
};
export default func;
func.id = "deploy_erc7984initialized";
func.tags = ["ERC7984Initialized"];
