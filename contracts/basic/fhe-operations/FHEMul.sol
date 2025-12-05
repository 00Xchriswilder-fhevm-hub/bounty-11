// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint8, externalEuint8 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Multiplication Operation Example
/// @notice Demonstrates FHE.mul operation to multiply two encrypted values
contract FHEMul is ZamaEthereumConfig {
  euint8 private _a;
  euint8 private _b;
  euint8 private _mul_result;

  constructor() {}

  function setA(externalEuint8 inputA, bytes calldata inputProof) external {
    _a = FHE.fromExternal(inputA, inputProof);
    FHE.allowThis(_a);
  }

  function setB(externalEuint8 inputB, bytes calldata inputProof) external {
    _b = FHE.fromExternal(inputB, inputProof);
    FHE.allowThis(_b);
  }

  function computeMul() external {
    // Multiply two encrypted values
    // The contract must have FHE permissions over both `a` and `b`
    _mul_result = FHE.mul(_a, _b);

    // Grant permanent FHE permissions to contract and caller
    FHE.allowThis(_mul_result);
    FHE.allow(_mul_result, msg.sender);
  }

  function result() public view returns (euint8) {
    return _mul_result;
  }
}

