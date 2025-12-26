// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint8, externalEuint8 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Subtraction Operation Example
/// @notice Demonstrates FHE.sub operation to subtract two encrypted values
/// @dev No underflow protection - in production, add range checks.
///      The subtraction is performed as: result = a - b
contract FHESub is ZamaEthereumConfig {
  euint8 private _a;
  euint8 private _b;
  euint8 private _sub_result;

  constructor() {}

  function setA(externalEuint8 inputA, bytes calldata inputProof) external {
    _a = FHE.fromExternal(inputA, inputProof);
    FHE.allowThis(_a);
  }

  function setB(externalEuint8 inputB, bytes calldata inputProof) external {
    _b = FHE.fromExternal(inputB, inputProof);
    FHE.allowThis(_b);
  }

  function computeSub() external {
    // Compute subtraction of two encrypted values: a - b
    // The contract must have FHE permissions over both `a` and `b`
    // Note: No underflow protection in FHE - ensure a >= b in production
    _sub_result = FHE.sub(_a, _b);

    // Grant permanent FHE permissions to contract and caller
    FHE.allowThis(_sub_result);
    FHE.allow(_sub_result, msg.sender);
  }

  function result() public view returns (euint8) {
    return _sub_result;
  }
}
