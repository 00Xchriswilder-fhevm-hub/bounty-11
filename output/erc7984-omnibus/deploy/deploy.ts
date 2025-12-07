import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedERC7984OmnibusMock = await deploy("ERC7984OmnibusMock", {
    from: deployer,
    log: true,
  });

  console.log(`ERC7984OmnibusMock contract: `, deployedERC7984OmnibusMock.address);
};
export default func;
func.id = "deploy_erc7984omnibusmock";
func.tags = ["ERC7984OmnibusMock"];
