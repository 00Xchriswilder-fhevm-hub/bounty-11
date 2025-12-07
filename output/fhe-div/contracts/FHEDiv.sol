// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint32, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Division Operation Example
/// @notice Demonstrates FHE.div operation to divide an encrypted value by a plaintext value
/// @dev Note: FHE division requires the divisor to be a plaintext value, not encrypted
contract FHEDiv is ZamaEthereumConfig {
  euint32 private _a;
  uint32 private _divisor;
  euint32 private _div_result;

  constructor() {}

  function setA(externalEuint32 inputA, bytes calldata inputProof) external {
    _a = FHE.fromExternal(inputA, inputProof);
    FHE.allowThis(_a);
  }

  function setDivisor(uint32 divisor) external {
    require(divisor > 0, "Divisor must be greater than zero");
    _divisor = divisor;
  }

  function computeDiv() external {
    // Divide encrypted value by plaintext divisor (a / divisor)
    // The contract must have FHE permissions over `a`
    // Note: Division by zero is prevented by setDivisor check
    _div_result = FHE.div(_a, _divisor);

    // Grant permanent FHE permissions to contract and caller
    FHE.allowThis(_div_result);
    FHE.allow(_div_result, msg.sender);
  }

  function result() public view returns (euint32) {
    return _div_result;
  }
}

