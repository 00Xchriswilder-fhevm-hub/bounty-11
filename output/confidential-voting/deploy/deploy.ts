import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedERC7984VotesMock = await deploy("ERC7984VotesMock", {
    from: deployer,
    log: true,
  });

  console.log(`ERC7984VotesMock contract: `, deployedERC7984VotesMock.address);
};
export default func;
func.id = "deploy_erc7984votesmock";
func.tags = ["ERC7984VotesMock"];
