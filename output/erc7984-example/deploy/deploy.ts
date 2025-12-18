import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedERC7984Mock = await deploy("ERC7984Mock", {
    from: deployer,
    log: true,
  });

  console.log(`ERC7984Mock contract: `, deployedERC7984Mock.address);
};
export default func;
func.id = "deploy_erc7984mock";
func.tags = ["ERC7984Mock"];
