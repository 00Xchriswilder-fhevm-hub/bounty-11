// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ZamaEthereumConfig, ZamaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {FHE} from "@fhevm/solidity/lib/FHE.sol";
import {VestingWalletCliffConfidential} from "./VestingWalletCliffConfidential.sol";
import {VestingWalletConfidentialFactory} from "@openzeppelin/confidential-contracts/finance/VestingWalletConfidentialFactory.sol";

/**
 * @title VestingWalletCliffConfidentialFactoryMock
 * @notice Concrete factory implementation for creating VestingWalletCliffConfidential clones
 * @dev Uses the proper upgradeable pattern with clones (recommended for production)
 * @dev This follows OpenZeppelin's recommended pattern:
 *      1. Deploy implementation contract once
 *      2. Create clones using deterministic addresses
 *      3. Initialize each clone with proper upgradeable initialization
 */
contract VestingWalletCliffConfidentialFactoryMock is VestingWalletConfidentialFactory, ZamaEthereumConfig {
    function _deployVestingWalletImplementation() internal virtual override returns (address) {
        return address(new VestingWalletCliffConfidentialImplementation());
    }

    function _validateVestingWalletInitArgs(bytes memory initArgs) internal virtual override {
        (address beneficiary, , uint48 durationSeconds, uint48 cliffSeconds) = abi.decode(
            initArgs,
            (address, uint48, uint48, uint48)
        );

        require(beneficiary != address(0), "Invalid beneficiary");
        require(durationSeconds > 0, "Invalid duration");
        require(cliffSeconds <= durationSeconds, "Cliff exceeds duration");
    }

    function _initializeVestingWallet(address vestingWalletAddress, bytes calldata initArgs) internal virtual override {
        (address beneficiary, uint48 startTimestamp, uint48 durationSeconds, uint48 cliffSeconds) = abi.decode(
            initArgs,
            (address, uint48, uint48, uint48)
        );

        VestingWalletCliffConfidentialImplementation(vestingWalletAddress).initialize(
            beneficiary,
            startTimestamp,
            durationSeconds,
            cliffSeconds
        );
    }
}

/**
 * @title VestingWalletCliffConfidentialImplementation
 * @notice Implementation contract for VestingWalletCliffConfidential clones
 * @dev This is the implementation that gets cloned by the factory
 */
contract VestingWalletCliffConfidentialImplementation is VestingWalletCliffConfidential, ZamaEthereumConfig {
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address beneficiary,
        uint48 startTimestamp,
        uint48 durationSeconds,
        uint48 cliffSeconds
    ) public initializer {
        __VestingWalletCliffConfidential_init(beneficiary, startTimestamp, durationSeconds, cliffSeconds);
        FHE.setCoprocessor(ZamaConfig.getEthereumCoprocessorConfig());
    }
}

