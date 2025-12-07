import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Deploy FHECounter
  const deployedFHECounter = await deploy("FHECounter", {
    from: deployer,
    log: true,
  });
  console.log(`FHECounter contract: ${deployedFHECounter.address}`);

  // Deploy EncryptSingleValue
  const deployedEncryptSingleValue = await deploy("EncryptSingleValue", {
    from: deployer,
    log: true,
  });
  console.log(`EncryptSingleValue contract: ${deployedEncryptSingleValue.address}`);

  // Deploy EncryptMultipleValues
  const deployedEncryptMultipleValues = await deploy("EncryptMultipleValues", {
    from: deployer,
    log: true,
  });
  console.log(`EncryptMultipleValues contract: ${deployedEncryptMultipleValues.address}`);

  // Deploy UserDecryptSingleValue
  const deployedUserDecryptSingleValue = await deploy("UserDecryptSingleValue", {
    from: deployer,
    log: true,
  });
  console.log(`UserDecryptSingleValue contract: ${deployedUserDecryptSingleValue.address}`);

  // Deploy UserDecryptMultipleValues
  const deployedUserDecryptMultipleValues = await deploy("UserDecryptMultipleValues", {
    from: deployer,
    log: true,
  });
  console.log(`UserDecryptMultipleValues contract: ${deployedUserDecryptMultipleValues.address}`);

  // Deploy HeadsOrTails
  const deployedHeadsOrTails = await deploy("HeadsOrTails", {
    from: deployer,
    log: true,
  });
  console.log(`HeadsOrTails contract: ${deployedHeadsOrTails.address}`);

  // Deploy HighestDieRoll
  const deployedHighestDieRoll = await deploy("HighestDieRoll", {
    from: deployer,
    log: true,
  });
  console.log(`HighestDieRoll contract: ${deployedHighestDieRoll.address}`);

  // Deploy FHEAdd
  const deployedFHEAdd = await deploy("FHEAdd", {
    from: deployer,
    log: true,
  });
  console.log(`FHEAdd contract: ${deployedFHEAdd.address}`);

  // Deploy FHEIfThenElse
  const deployedFHEIfThenElse = await deploy("FHEIfThenElse", {
    from: deployer,
    log: true,
  });
  console.log(`FHEIfThenElse contract: ${deployedFHEIfThenElse.address}`);

  // Deploy FHEMin
  const deployedFHEMin = await deploy("FHEMin", {
    from: deployer,
    log: true,
  });
  console.log(`FHEMin contract: ${deployedFHEMin.address}`);

  // Deploy FHEMul
  const deployedFHEMul = await deploy("FHEMul", {
    from: deployer,
    log: true,
  });
  console.log(`FHEMul contract: ${deployedFHEMul.address}`);

  // Deploy FHEXor
  const deployedFHEXor = await deploy("FHEXor", {
    from: deployer,
    log: true,
  });
  console.log(`FHEXor contract: ${deployedFHEXor.address}`);

  // Deploy FHEDiv
  const deployedFHEDiv = await deploy("FHEDiv", {
    from: deployer,
    log: true,
  });
  console.log(`FHEDiv contract: ${deployedFHEDiv.address}`);

  // Deploy FHEBitwise
  const deployedFHEBitwise = await deploy("FHEBitwise", {
    from: deployer,
    log: true,
  });
  console.log(`FHEBitwise contract: ${deployedFHEBitwise.address}`);

};

export default func;
func.id = "deploy_all";
func.tags = ["all", "FHECounter", "EncryptSingleValue", "EncryptMultipleValues", "UserDecryptSingleValue", "UserDecryptMultipleValues", "HeadsOrTails", "HighestDieRoll", "FHEAdd", "FHEIfThenElse", "FHEMin", "FHEMul", "FHEXor", "FHEDiv", "FHEBitwise"];
