import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Deploy FHELegacyVault
  const deployedFHELegacyVault = await deploy("FHELegacyVault", {
    from: deployer,
    log: true,
  });
  console.log(`FHELegacyVault contract: ${deployedFHELegacyVault.address}`);

  // Deploy SimpleVoting_uint32
  const deployedSimpleVoting_uint32 = await deploy("SimpleVoting_uint32", {
    from: deployer,
    log: true,
  });
  console.log(`SimpleVoting_uint32 contract: ${deployedSimpleVoting_uint32.address}`);

  // Deploy ReviewCardsFHE
  const deployedReviewCardsFHE = await deploy("ReviewCardsFHE", {
    from: deployer,
    log: true,
  });
  console.log(`ReviewCardsFHE contract: ${deployedReviewCardsFHE.address}`);

  // Deploy BlindAuction
  const deployedBlindAuction = await deploy("BlindAuction", {
    from: deployer,
    log: true,
  });
  console.log(`BlindAuction contract: ${deployedBlindAuction.address}`);

  // Deploy ConfidentialPortfolioRebalancer
  const deployedConfidentialPortfolioRebalancer = await deploy("ConfidentialPortfolioRebalancer", {
    from: deployer,
    log: true,
  });
  console.log(`ConfidentialPortfolioRebalancer contract: ${deployedConfidentialPortfolioRebalancer.address}`);

  // Deploy ConfidentialLendingPool
  const deployedConfidentialLendingPool = await deploy("ConfidentialLendingPool", {
    from: deployer,
    log: true,
  });
  console.log(`ConfidentialLendingPool contract: ${deployedConfidentialLendingPool.address}`);

  // Deploy ConfidentialYieldAggregator
  const deployedConfidentialYieldAggregator = await deploy("ConfidentialYieldAggregator", {
    from: deployer,
    log: true,
  });
  console.log(`ConfidentialYieldAggregator contract: ${deployedConfidentialYieldAggregator.address}`);

};

export default func;
func.id = "deploy_all";
func.tags = ["all", "FHELegacyVault", "SimpleVoting_uint32", "ReviewCardsFHE", "BlindAuction", "ConfidentialPortfolioRebalancer", "ConfidentialLendingPool", "ConfidentialYieldAggregator"];
