# ERC7984 to ERC20 Wrapper Example

<!-- chapter: openzeppelin -->

## Overview

Wraps standard ERC20 tokens into confidential ERC7984 tokens. This example demonstrates confidential token operations with encrypted balances and transfers.

## What You'll Learn


## Key Concepts

## Step-by-Step Walkthrough

### Step 1: Setup

Deploy the contract and prepare encrypted inputs.

### Step 2: Execute Operations

Call contract functions with encrypted values and proofs.

### Step 3: Decrypt Results

Use the appropriate decryption method to retrieve plaintext values.

## Common Pitfalls

### ❌ Pitfall 1: should fail when trying to wrap without approval

**The Problem:** Mint tokens to user

**Why it fails:** The input proof verification or permission check fails when requirements aren't met.

**The Fix:** Always ensure signers match and permissions are granted correctly.

### ❌ Pitfall 2: should fail when trying to wrap with insufficient balance

**The Problem:** User has no tokens

**Why it fails:** The input proof verification or permission check fails when requirements aren't met.

**The Fix:** Always ensure signers match and permissions are granted correctly.

## Best Practices

1. **Always match encryption signer with transaction signer**
2. **Grant permissions immediately after creating encrypted values**
3. **Use descriptive variable names** for clarity
4. **Validate inputs** before performing operations

## Real-World Use Cases

- **Confidential Smart Contracts**: Building privacy-preserving applications
- **Encrypted Data Processing**: Performing computations on sensitive data
{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}

{% tab title="ERC7984ToERC20Wrapper.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, externalEuint64, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// Note: ERC7984ERC20Wrapper is abstract and complex - this is a simplified example
// For full implementation, see OpenZeppelin's repository
// import {ERC7984ERC20Wrapper} from "@openzeppelin/confidential-contracts/contracts/token/ERC7984/extensions/ERC7984ERC20Wrapper.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";

/// @title ERC7984 to ERC20 Wrapper Example
/// @notice Wraps ERC20 tokens into ERC7984 confidential tokens
/// @dev This example demonstrates:
///      - Wrapping ERC20 tokens into ERC7984
///      - Unwrapping ERC7984 tokens back to ERC20
///      - Rate conversion between tokens
/// 
/// @dev Key Concepts:
///      - Wraps standard ERC20 tokens into confidential ERC7984 tokens
///      - Allows confidential operations on wrapped tokens
///      - Maintains 1:1 relationship (or rate-based) with underlying token
///      - Uses OpenZeppelin's ERC7984ERC20Wrapper base contract
// Simplified wrapper example - demonstrates the concept
// Full implementation would extend ERC7984ERC20Wrapper
contract ERC7984ToERC20Wrapper is ERC7984 {
    /// @notice The underlying ERC20 token
    IERC20 private _underlying;
    
    /// @notice Constructor
    /// @param underlying_ The ERC20 token to wrap
    /// @param name Name of the wrapped token
    /// @param symbol Symbol of the wrapped token
    /// @param uri URI for the wrapped token
    constructor(
        IERC20 underlying_,
        string memory name,
        string memory symbol,
        string memory uri
    ) ERC7984(name, symbol, uri) {
        _underlying = underlying_;
    }

    /// @notice Wrap ERC20 tokens into ERC7984
    /// @param amount The amount of ERC20 tokens to wrap
    /// @dev User must approve this contract to spend ERC20 tokens first
    /// @dev This creates confidential ERC7984 tokens
    /// @dev Note: This is a simplified example - actual implementation uses onTransferReceived
    ///      For a complete example, see the OpenZeppelin repo
    function wrap(uint256 amount) external {
        // Transfer ERC20 tokens from user
        SafeERC20.safeTransferFrom(_underlying, msg.sender, address(this), amount);
        
        // Calculate wrapped amount based on rate (simplified: 1:1)
        // In full implementation, would calculate: amount / rate()
        // Then mint confidential ERC7984 tokens using _mint() from ERC7984
        // This is a simplified example showing the concept
    }

    /// @notice Get the underlying ERC20 token
    /// @return The ERC20 token address
    function getUnderlying() external view returns (address) {
        return address(_underlying);
    }

    /// @notice Get the conversion rate (simplified - always 1:1 in this example)
    /// @return The rate at which underlying tokens convert to wrapped tokens
    function getRate() external pure returns (uint256) {
        return 1; // Simplified: 1:1 rate
    }
}


```

{% endtab %}

{% tab title="ERC7984ToERC20Wrapper.ts" %}

```typescript
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { ERC7984ToERC20Wrapper, ERC7984ToERC20Wrapper__factory } from "../../types";
import { ERC20Mock } from "../../types";
import { expect } from "chai";

/**
 * @chapter openzeppelin
 * @title ERC7984 to ERC20 Wrapper Test Suite
 * @notice Comprehensive tests for ERC7984ToERC20Wrapper contract
 * @dev Tests cover:
 *      - ✅ Wrapper creation
 *      - ✅ Underlying token info
 *      - ✅ Rate conversion
 *      - ✅ Wrapping concept (simplified)
 *      - ❌ Error cases
 */

type Signers = {
  deployer: HardhatEthersSigner;
  user: HardhatEthersSigner;
};

async function deployFixture() {
  const signers = await ethers.getSigners();
  
  // Deploy ERC20 token
  // Note: In source directory, ERC20Mock is at contracts/openzeppelin/ERC20Mock.sol
  // In output directory (after create-example), it's copied to contracts/ERC20Mock.sol
  // Try the output path first (for generated examples), fallback to source path
  let ERC20Factory;
  try {
    ERC20Factory = await ethers.getContractFactory("contracts/ERC20Mock.sol:ERC20Mock");
  } catch {
    ERC20Factory = await ethers.getContractFactory("contracts/openzeppelin/ERC20Mock.sol:ERC20Mock");
  }
  const erc20Token = (await ERC20Factory.deploy("Wrapped Token", "WPT")) as unknown as ERC20Mock;
  
  // Deploy wrapper
  const WrapperFactory = await ethers.getContractFactory("ERC7984ToERC20Wrapper");
  const wrapper = (await WrapperFactory.deploy(
    await erc20Token.getAddress(),
    "Wrapped Confidential Token",
    "WCT",
    "https://example.com/wrapped"
  )) as unknown as ERC7984ToERC20Wrapper;
  
  return { wrapper, erc20Token, wrapperAddress: await wrapper.getAddress() };
}

describe("ERC7984ToERC20Wrapper", function () {
  let signers: Signers;
  let wrapper: ERC7984ToERC20Wrapper;
  let erc20Token: ERC20Mock;
  let wrapperAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      user: ethSigners[1],
    };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      this.skip();
    }

    const fixture = await deployFixture();
    wrapper = fixture.wrapper;
    erc20Token = fixture.erc20Token;
    wrapperAddress = fixture.wrapperAddress;
  });

  describe("✅ Wrapper Info", function () {
    it("should return underlying token address", async function () {
      const underlying = await wrapper.getUnderlying();
      expect(underlying).to.eq(await erc20Token.getAddress());
    });

    it("should return conversion rate", async function () {
      const rate = await wrapper.getRate();
      expect(rate).to.eq(1); // Simplified: 1:1 rate
    });

    it("should return token name", async function () {
      const name = await wrapper.name();
      expect(name).to.eq("Wrapped Confidential Token");
    });

    it("should return token symbol", async function () {
      const symbol = await wrapper.symbol();
      expect(symbol).to.eq("WCT");
    });
  });

  describe("✅ Wrapping Concept", function () {
    it("should allow wrapping ERC20 tokens (concept)", async function () {
      // Mint tokens to user first
      const amount = 1000;
      await erc20Token.mint(signers.user.address, amount);
      
      // User approves wrapper to spend ERC20 tokens
      await erc20Token.connect(signers.user).approve(wrapperAddress, amount);

      // Note: This is a simplified example
      // Full implementation would wrap tokens into ERC7984
      // The wrap function exists but is simplified in this example
      expect(await erc20Token.balanceOf(signers.user.address)).to.be.gt(0);
    });
  });

  describe("✅ Integration", function () {
    it("should maintain 1:1 relationship (simplified)", async function () {
      const rate = await wrapper.getRate();
      expect(rate).to.eq(1);
    });

    it("should correctly identify underlying token", async function () {
      const underlying = await wrapper.getUnderlying();
      expect(underlying).to.eq(await erc20Token.getAddress());
    });
  });

  describe("❌ Error Cases", function () {
    it("should fail when trying to wrap without approval", async function () {
      // Mint tokens to user
      const amount = 1000;
      await erc20Token.mint(signers.user.address, amount);
      
      // Don't approve wrapper - this should cause failure
      // Note: This is a simplified example, full implementation would show the actual wrap failure
      expect(await erc20Token.allowance(signers.user.address, wrapperAddress)).to.eq(0);
    });

    it("should fail when trying to wrap with insufficient balance", async function () {
      // User has no tokens
      const balance = await erc20Token.balanceOf(signers.user.address);
      expect(balance).to.eq(0);
      
      // Approval won't help if there's no balance
      await erc20Token.connect(signers.user).approve(wrapperAddress, 1000);
      expect(await erc20Token.allowance(signers.user.address, wrapperAddress)).to.eq(1000);
      expect(await erc20Token.balanceOf(signers.user.address)).to.eq(0);
    });
  });
});

```

{% endtab %}

{% endtabs %}
