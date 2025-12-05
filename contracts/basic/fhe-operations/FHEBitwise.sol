// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint8, externalEuint8, ebool, externalEbool } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Bitwise Operations Example
/// @notice Demonstrates FHE.and, FHE.or, and FHE.not operations
contract FHEBitwise is ZamaEthereumConfig {
  euint8 private _a;
  euint8 private _b;
  euint8 private _and_result;
  euint8 private _or_result;
  ebool private _not_result;

  constructor() {}

  function setA(externalEuint8 inputA, bytes calldata inputProof) external {
    _a = FHE.fromExternal(inputA, inputProof);
    FHE.allowThis(_a);
  }

  function setB(externalEuint8 inputB, bytes calldata inputProof) external {
    _b = FHE.fromExternal(inputB, inputProof);
    FHE.allowThis(_b);
  }

  function computeAnd() external {
    // Compute bitwise AND of two encrypted values
    _and_result = FHE.and(_a, _b);
    FHE.allowThis(_and_result);
    FHE.allow(_and_result, msg.sender);
  }

  function computeOr() external {
    // Compute bitwise OR of two encrypted values
    _or_result = FHE.or(_a, _b);
    FHE.allowThis(_or_result);
    FHE.allow(_or_result, msg.sender);
  }

  function computeNot(externalEbool inputBool, bytes calldata inputProof) external {
    ebool temp = FHE.fromExternal(inputBool, inputProof);
    FHE.allowThis(temp);
    // Compute NOT operation
    _not_result = FHE.not(temp);
    // Grant permanent FHE permissions to contract and caller
    FHE.allowThis(_not_result);
    FHE.allow(_not_result, msg.sender);
  }

  function getAndResult() public view returns (euint8) {
    return _and_result;
  }

  function getOrResult() public view returns (euint8) {
    return _or_result;
  }

  function getNotResult() public view returns (ebool) {
    return _not_result;
  }
}

