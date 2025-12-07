import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedConfidentialPortfolioRebalancer = await deploy("ConfidentialPortfolioRebalancer", {
    from: deployer,
    log: true,
  });

  console.log(`ConfidentialPortfolioRebalancer contract: `, deployedConfidentialPortfolioRebalancer.address);
};
export default func;
func.id = "deploy_confidentialportfoliorebalancer";
func.tags = ["ConfidentialPortfolioRebalancer"];
