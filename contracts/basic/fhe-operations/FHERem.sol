// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint32, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Remainder Operation Example
/// @notice Demonstrates FHE.rem operation to compute remainder of encrypted value divided by plaintext
/// @dev Note: FHE remainder requires the modulus to be a plaintext value, not encrypted.
///      The operation computes: result = a % modulus
contract FHERem is ZamaEthereumConfig {
  euint32 private _a;
  uint32 private _modulus;
  euint32 private _rem_result;

  constructor() {}

  function setA(externalEuint32 inputA, bytes calldata inputProof) external {
    _a = FHE.fromExternal(inputA, inputProof);
    FHE.allowThis(_a);
  }

  function setModulus(uint32 modulus) external {
    require(modulus > 0, "Modulus must be greater than zero");
    _modulus = modulus;
  }

  function computeRem() external {
    // Compute remainder: a % modulus
    // The contract must have FHE permissions over `a`
    // Note: Modulus must be a plaintext value
    _rem_result = FHE.rem(_a, _modulus);

    // Grant permanent FHE permissions to contract and caller
    FHE.allowThis(_rem_result);
    FHE.allow(_rem_result, msg.sender);
  }

  function result() public view returns (euint32) {
    return _rem_result;
  }
}
