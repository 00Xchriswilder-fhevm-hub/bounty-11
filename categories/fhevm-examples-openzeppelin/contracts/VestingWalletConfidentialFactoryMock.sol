// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ZamaEthereumConfig, ZamaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {FHE} from "@fhevm/solidity/lib/FHE.sol";
import {VestingWalletConfidential} from "./VestingWalletConfidential.sol";
import {VestingWalletConfidentialFactory} from "@openzeppelin/confidential-contracts/finance/VestingWalletConfidentialFactory.sol";

/**
 * @title VestingWalletConfidentialFactoryMock
 * @notice Concrete factory implementation for creating VestingWalletConfidential clones
 * @dev Uses the proper upgradeable pattern with clones (recommended for production)
 * @dev This follows OpenZeppelin's recommended pattern:
 *      1. Deploy implementation contract once
 *      2. Create clones using deterministic addresses
 *      3. Initialize each clone with proper upgradeable initialization
 */
contract VestingWalletConfidentialFactoryMock is VestingWalletConfidentialFactory, ZamaEthereumConfig {
    function _deployVestingWalletImplementation() internal virtual override returns (address) {
        return address(new VestingWalletConfidentialImplementation());
    }

    function _validateVestingWalletInitArgs(bytes memory initArgs) internal virtual override {
        (address beneficiary, , uint48 durationSeconds) = abi.decode(
            initArgs,
            (address, uint48, uint48)
        );

        require(beneficiary != address(0), "Invalid beneficiary");
        require(durationSeconds > 0, "Invalid duration");
    }

    function _initializeVestingWallet(address vestingWalletAddress, bytes calldata initArgs) internal virtual override {
        (address beneficiary, uint48 startTimestamp, uint48 durationSeconds) = abi.decode(
            initArgs,
            (address, uint48, uint48)
        );

        VestingWalletConfidentialImplementation(vestingWalletAddress).initialize(
            beneficiary,
            startTimestamp,
            durationSeconds
        );
    }
}

/**
 * @title VestingWalletConfidentialImplementation
 * @notice Implementation contract for VestingWalletConfidential clones
 * @dev This is the implementation that gets cloned by the factory
 */
contract VestingWalletConfidentialImplementation is VestingWalletConfidential, ZamaEthereumConfig {
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address beneficiary,
        uint48 startTimestamp,
        uint48 durationSeconds
    ) public initializer {
        __VestingWalletConfidential_init(beneficiary, startTimestamp, durationSeconds);
        FHE.setCoprocessor(ZamaConfig.getEthereumCoprocessorConfig());
    }
}

