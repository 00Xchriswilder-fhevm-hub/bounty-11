// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint8, externalEuint8 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Maximum Operation Example
/// @notice Demonstrates FHE.max operation to find the maximum of two encrypted values
/// @dev The operation compares two encrypted values and returns the larger one,
///      all without decrypting either value.
contract FHEMax is ZamaEthereumConfig {
  euint8 private _a;
  euint8 private _b;
  euint8 private _max_result;

  constructor() {}

  function setA(externalEuint8 inputA, bytes calldata inputProof) external {
    _a = FHE.fromExternal(inputA, inputProof);
    FHE.allowThis(_a);
  }

  function setB(externalEuint8 inputB, bytes calldata inputProof) external {
    _b = FHE.fromExternal(inputB, inputProof);
    FHE.allowThis(_b);
  }

  function computeMax() external {
    // Compute the maximum of two encrypted values
    // The contract must have FHE permissions over both `a` and `b`
    _max_result = FHE.max(_a, _b);

    // Grant permanent FHE permissions to contract and caller
    FHE.allowThis(_max_result);
    FHE.allow(_max_result, msg.sender);
  }

  function result() public view returns (euint8) {
    return _max_result;
  }
}
