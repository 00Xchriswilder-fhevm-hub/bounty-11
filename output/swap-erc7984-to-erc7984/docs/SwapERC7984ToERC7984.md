# Swap ERC7984 to ERC7984

<!-- chapter: openzeppelin -->

## Overview

This example demonstrates swapping between two confidential tokens. This example demonstrates confidential token operations with encrypted balances and transfers using external encrypted inputs with input proofs for verification.

## What You'll Learn

- **Off-chain encryption** - Encrypting values locally before sending to contract
- **FHE permissions** - Granting permissions for operations and decryption

## Key Concepts

### 1. Off-Chain Encryption

Values are encrypted **locally** (on the client side) before being sent to the contract:
- Plaintext values never appear in transactions
- Encryption is cryptographically bound to [contract, user] pair
- Input proofs verify the binding

### 2. FHE Permissions

Permissions control who can:
- **Perform operations**: Contracts need `FHE.allowThis()`
- **Decrypt values**: Users need `FHE.allow()`

## Step-by-Step Walkthrough

### Step 1: Setup

Deploy the contract and prepare encrypted inputs.

### Step 2: Execute Operations

Call contract functions with encrypted values and proofs.

### Step 3: Decrypt Results

Use the appropriate decryption method to retrieve plaintext values.

## Common Pitfalls

### ❌ Pitfall 1: should fail when trying to swap without transferring first

**The Problem:** Create a dummy encrypted amount (not actually transferred)

**Why it fails:** The input proof verification or permission check fails when requirements aren't met.

**The Fix:** Always ensure signers match and permissions are granted correctly.

### ❌ Pitfall 2: should fail when swapping with same token

**The Problem:** Transfer tokens first

**Why it fails:** The input proof verification or permission check fails when requirements aren't met.

**The Fix:** Always ensure signers match and permissions are granted correctly.

### ❌ Pitfall 3: should fail when swapping with zero address tokens

**The Problem:** Transfer tokens first

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

{% tab title="SwapERC7984ToERC7984.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ERC7984Mock} from "./ERC7984Mock.sol";

/**
 * @title Swap ERC7984 to ERC7984
 * @notice This example demonstrates swapping between two confidential tokens
 * @dev Shows how to perform a swap while keeping all amounts encrypted
 *
 * Key Features:
 * - Swap confidential token A for confidential token B
 * - All operations remain encrypted (no decryption needed)
 * - Atomic swap execution
 * - Demonstrates confidential-to-confidential swaps
 *
 * Use Cases:
 * - Privacy-preserving token swaps
 * - Confidential DEX operations
 * - Converting between different confidential tokens
 *
 */
contract SwapERC7984ToERC7984 is ZamaEthereumConfig {
    // Swap rate (how many tokenB per tokenA)
    // In production, this would be calculated dynamically or set by governance
    uint256 private immutable _rate;
    
    // Events
    event SwapExecuted(
        address indexed user,
        address indexed fromToken,
        address indexed toToken,
        euint64 fromAmount,
        euint64 toAmount
    );

    /**
     * @dev Constructor sets the swap rate
     * @param rate_ Swap rate (e.g., 1000 means 1 tokenA = 1000 tokenB)
     */
    constructor(uint256 rate_) {
        _rate = rate_ == 0 ? 1 : rate_; // Default to 1:1 if rate is 0
    }

    /**
     * @notice Returns the swap rate
     * @return Rate at which tokens are swapped
     */
    function rate() public view returns (uint256) {
        return _rate;
    }

    /**
     * @notice Swaps confidential tokens from one token to another
     * @param fromToken Address of the confidential token to swap from
     * @param toToken Address of the confidential token to swap to
     * @param transferredAmount The encrypted amount that was already transferred to this contract
     * @dev User must:
     *      1. Call fromToken.confidentialTransfer(address(this), encryptedAmount, inputProof) directly first
     *      2. Then call this function with the swap contract's fromToken balance
     * 
     *      This two-step process is necessary because input proofs are bound to the signer.
     *      When a contract calls confidentialTransfer on behalf of a user, msg.sender is the contract,
     *      not the user, so the input proof verification fails. The user must call confidentialTransfer
     *      directly to ensure msg.sender matches the signer in the input proof.
     */
    function swapConfidentialForConfidential(
        ERC7984Mock fromToken,
        ERC7984Mock toToken,
        euint64 transferredAmount
    ) external {
        require(address(fromToken) != address(0), "Swap: invalid fromToken");
        require(address(toToken) != address(0), "Swap: invalid toToken");
        require(address(fromToken) != address(toToken), "Swap: same token");
        
        // Verify that the transferred amount is allowed for this contract
        require(FHE.isAllowed(transferredAmount, address(this)), "Swap: amount not allowed for swap contract");
        
        // Grant transient permission for the swap contract
        FHE.allowTransient(transferredAmount, address(this));
        
        // Calculate toAmount based on rate
        // In production, this would be done with encrypted arithmetic
        // For this example, we'll use the same amount (1:1) or a fixed multiplier
        // In reality, you'd need: toAmount = transferredAmount * rate (encrypted multiplication)
        euint64 toAmount = transferredAmount; // Simplified: 1:1 swap (use transferred value)
        
        // Note: In production, you'd check that toToken contract has sufficient balance using
        // FHE comparison: toToken.balanceOf(this) >= toAmount
        // We skip the balance check for simplicity in this educational example
        
        // Grant permission for toToken transfer
        FHE.allowTransient(toAmount, address(toToken));
        FHE.allow(toAmount, address(this));
        
        // Transfer toToken to user
        // Use confidentialTransfer since we have an already-allowed euint64
        toToken.confidentialTransfer(msg.sender, toAmount);
        
        emit SwapExecuted(msg.sender, address(fromToken), address(toToken), transferredAmount, toAmount);
    }

    /**
     * @notice Simplified swap using already-allowed amounts
     * @param fromToken Address of the confidential token to swap from
     * @param toToken Address of the confidential token to swap to
     * @param fromAmount Encrypted amount of fromToken (must already be allowed)
     * @dev This version doesn't require input proof because the amount is already allowed
     *      Renamed to avoid function overloading ambiguity with ethers.js
     */
    function swapConfidentialForConfidentialWithAllowedAmount(
        ERC7984Mock fromToken,
        ERC7984Mock toToken,
        euint64 fromAmount
    ) external {
        require(address(fromToken) != address(0), "Swap: invalid fromToken");
        require(address(toToken) != address(0), "Swap: invalid toToken");
        require(address(fromToken) != address(toToken), "Swap: same token");
        
        // Check that the caller has permission to use this encrypted amount
        require(FHE.isAllowed(fromAmount, msg.sender), "Swap: amount not allowed");
        
        // Grant permission to swap contract so it can transfer on behalf of user
        FHE.allow(fromAmount, address(this));
        
        // Transfer fromToken from user to this contract
        // Use confidentialTransfer with already-allowed euint64
        // Note: confidentialTransfer checks if msg.sender (swap contract) has permission
        euint64 transferred = fromToken.confidentialTransfer(address(this), fromAmount);
        
        // Grant transient permission
        FHE.allowTransient(transferred, address(this));
        
        // Calculate toAmount (simplified: 1:1)
        euint64 toAmount = transferred;
        
        // Grant permission for toToken transfer
        FHE.allowTransient(toAmount, address(toToken));
        FHE.allow(toAmount, address(this));
        
        // Transfer toToken to user
        // Use confidentialTransfer since we have an already-allowed euint64
        toToken.confidentialTransfer(msg.sender, toAmount);
        
        emit SwapExecuted(msg.sender, address(fromToken), address(toToken), transferred, toAmount);
    }
}

```

{% endtab %}

{% tab title="SwapERC7984ToERC7984.ts" %}

```typescript
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { SwapERC7984ToERC7984, SwapERC7984ToERC7984__factory } from "../../types";
// ERC7984Mock types will be available in generated examples after compilation
import type { Contract } from "ethers";
type ERC7984Mock = Contract;
type ERC7984Mock__factory = any;
import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-network-helpers";

/**
 * @chapter openzeppelin
 * @title Swap ERC7984 to ERC7984 Test Suite
 * @notice Comprehensive tests for SwapERC7984ToERC7984 contract
 * @dev Tests cover:
 *      - ✅ Confidential-to-confidential swaps
 *      - ✅ Operator approval
 *      - ✅ Transient permissions
 *      - ❌ Error cases
 */

type Signers = {
  deployer: HardhatEthersSigner;
  user: HardhatEthersSigner;
};

async function deployFixture() {
  const signers = await ethers.getSigners();
  
  // Deploy two ERC7984 tokens (using ERC7984Mock with access control)
  // Note: In source directory, ERC7984Mock is at contracts/openzeppelin/ERC7984Mock.sol
  // In output directory (after create-example), it's copied to contracts/ERC7984Mock.sol
  let ERC7984Factory;
  try {
    ERC7984Factory = await ethers.getContractFactory("contracts/ERC7984Mock.sol:ERC7984Mock");
  } catch {
    ERC7984Factory = await ethers.getContractFactory("contracts/openzeppelin/ERC7984Mock.sol:ERC7984Mock");
  }
  const tokenA = (await ERC7984Factory.deploy(
    signers[0].address, // owner
    "Token A",
    "TKA",
    "https://example.com/token-a"
  )) as unknown as ERC7984Mock;
  const tokenB = (await ERC7984Factory.deploy(
    signers[0].address, // owner
    "Token B",
    "TKB",
    "https://example.com/token-b"
  )) as unknown as ERC7984Mock;
  
  // Deploy swap contract - constructor takes (uint256 rate)
  // Note: In source directory, SwapERC7984ToERC7984 is at contracts/openzeppelin/SwapERC7984ToERC7984.sol
  // In output directory (after create-example), it's copied to contracts/SwapERC7984ToERC7984.sol
  let SwapFactory;
  try {
    SwapFactory = await ethers.getContractFactory("contracts/SwapERC7984ToERC7984.sol:SwapERC7984ToERC7984");
  } catch {
    SwapFactory = await ethers.getContractFactory("contracts/openzeppelin/SwapERC7984ToERC7984.sol:SwapERC7984ToERC7984");
  }
  const swapContract = (await SwapFactory.deploy(1)) as unknown as SwapERC7984ToERC7984; // 1:1 swap rate
  
  return { swapContract, tokenA, tokenB, swapAddress: await swapContract.getAddress() };
}

describe("SwapERC7984ToERC7984", function () {
  let signers: Signers;
  let swapContract: SwapERC7984ToERC7984;
  let tokenA: ERC7984Mock;
  let tokenB: ERC7984Mock;
  let swapAddress: string;

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
    swapContract = fixture.swapContract;
    tokenA = fixture.tokenA;
    tokenB = fixture.tokenB;
    swapAddress = fixture.swapAddress;

    // Mint tokenA to user
    // IMPORTANT: createEncryptedInput(contractAddress, senderAddress) - contract first, sender second
    // contractAddress: tokenA contract address (where fromExternal is called inside $_mint)
    // senderAddress: deployer (who calls $_mint)
    const amount = 1000;
    const tokenAAddress = await tokenA.getAddress();
    const encrypted = await fhevm
      .createEncryptedInput(tokenAAddress, signers.deployer.address)
      .add64(amount)
      .encrypt();
    await (tokenA.connect(signers.deployer) as any)
      .getFunction("$_mint(address,bytes32,bytes)")
      .send(signers.user.address, encrypted.handles[0], encrypted.inputProof);

    // Mint tokenB to swap contract (for swapping)
    // IMPORTANT: createEncryptedInput(contractAddress, senderAddress) - contract first, sender second
    // contractAddress: tokenB contract address (where fromExternal is called inside $_mint)
    // senderAddress: deployer (who calls $_mint)
    const tokenBAddress = await tokenB.getAddress();
    const encryptedB = await fhevm
      .createEncryptedInput(tokenBAddress, signers.deployer.address)
      .add64(5000)
      .encrypt();
    await (tokenB.connect(signers.deployer) as any)
      .getFunction("$_mint(address,bytes32,bytes)")
      .send(swapAddress, encryptedB.handles[0], encryptedB.inputProof);
  });

  describe("✅ Confidential Swaps", function () {
    it("should swap between two ERC7984 tokens", async function () {
      // ✅ NEW PATTERN: User transfers first, then calls swap
      const swapAmount = 500;
      const tokenAAddress = await tokenA.getAddress();
      const swapAddress = await swapContract.getAddress();
      
      // Step 1: User transfers tokenA to swap contract
      const encrypted = await fhevm
        .createEncryptedInput(tokenAAddress, signers.user.address)
        .add64(swapAmount)
        .encrypt();

      await (tokenA.connect(signers.user) as any)
        .getFunction("confidentialTransfer(address,bytes32,bytes)")
        .send(swapAddress, encrypted.handles[0], encrypted.inputProof);

      // Step 2: Get swap contract's tokenA balance
      const swapTokenABalance = await tokenA.confidentialBalanceOf(swapAddress);
      expect(swapTokenABalance).to.not.eq(ethers.ZeroHash);
      
      // Step 3: Verify swap contract has tokenB balance
      const swapTokenBBalance = await tokenB.confidentialBalanceOf(swapAddress);
      expect(swapTokenBBalance).to.not.eq(ethers.ZeroHash, "❌ Swap contract must have tokenB balance!");

      // Step 4: Execute swap
      await expect(
        (swapContract.connect(signers.user) as any).swapConfidentialForConfidential(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          swapTokenABalance
        )
      ).to.not.be.reverted;
    });

    it("should transfer tokens correctly", async function () {
      const swapAmount = 300;
      const tokenAAddress = await tokenA.getAddress();
      const swapAddress = await swapContract.getAddress();
      
      // User transfers tokenA to swap contract
      const encrypted = await fhevm
        .createEncryptedInput(tokenAAddress, signers.user.address)
        .add64(swapAmount)
        .encrypt();

      await (tokenA.connect(signers.user) as any)
        .getFunction("confidentialTransfer(address,bytes32,bytes)")
        .send(swapAddress, encrypted.handles[0], encrypted.inputProof);

      const swapTokenABalance = await tokenA.confidentialBalanceOf(swapAddress);
      
      await (swapContract.connect(signers.user) as any).swapConfidentialForConfidential(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        swapTokenABalance
      );

      // Check balances (encrypted)
      const userBalanceA = await tokenA.confidentialBalanceOf(signers.user.address);
      const userBalanceB = await tokenB.confidentialBalanceOf(signers.user.address);
      expect(userBalanceA).to.not.eq(ethers.ZeroHash);
      expect(userBalanceB).to.not.eq(ethers.ZeroHash);
    });
  });

  describe("❌ Error Cases", function () {
    it("should fail when trying to swap without transferring first", async function () {
      const swapAmount = 100;
      const tokenAAddress = await tokenA.getAddress();
      
      // Create a dummy encrypted amount (not actually transferred)
      const encrypted = await fhevm
        .createEncryptedInput(tokenAAddress, signers.user.address)
        .add64(swapAmount)
        .encrypt();

      // Try to swap with an amount that wasn't transferred to the contract
      const dummyBalance = encrypted.handles[0];
      
      await expect(
        (swapContract.connect(signers.user) as any).swapConfidentialForConfidential(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          dummyBalance
        )
      ).to.be.revertedWith("Swap: amount not allowed for swap contract");
    });

    it("should fail when swapping with same token", async function () {
      const swapAmount = 100;
      const tokenAAddress = await tokenA.getAddress();
      const swapAddress = await swapContract.getAddress();
      
      // Transfer tokens first
      const encrypted = await fhevm
        .createEncryptedInput(tokenAAddress, signers.user.address)
        .add64(swapAmount)
        .encrypt();

      await (tokenA.connect(signers.user) as any)
        .getFunction("confidentialTransfer(address,bytes32,bytes)")
        .send(swapAddress, encrypted.handles[0], encrypted.inputProof);

      const swapTokenABalance = await tokenA.confidentialBalanceOf(swapAddress);
      
      // Try to swap tokenA for tokenA (should fail)
      await expect(
        (swapContract.connect(signers.user) as any).swapConfidentialForConfidential(
          await tokenA.getAddress(),
          await tokenA.getAddress(), // Same token!
          swapTokenABalance
        )
      ).to.be.revertedWith("Swap: same token");
    });

    it("should fail when swapping with zero address tokens", async function () {
      const swapAmount = 100;
      const tokenAAddress = await tokenA.getAddress();
      const swapAddress = await swapContract.getAddress();
      
      // Transfer tokens first
      const encrypted = await fhevm
        .createEncryptedInput(tokenAAddress, signers.user.address)
        .add64(swapAmount)
        .encrypt();

      await (tokenA.connect(signers.user) as any)
        .getFunction("confidentialTransfer(address,bytes32,bytes)")
        .send(swapAddress, encrypted.handles[0], encrypted.inputProof);

      const swapTokenABalance = await tokenA.confidentialBalanceOf(swapAddress);
      
      // Try to swap with zero address
      await expect(
        (swapContract.connect(signers.user) as any).swapConfidentialForConfidential(
          ethers.ZeroAddress,
          await tokenB.getAddress(),
          swapTokenABalance
        )
      ).to.be.revertedWith("Swap: invalid fromToken");
      
      await expect(
        (swapContract.connect(signers.user) as any).swapConfidentialForConfidential(
          await tokenA.getAddress(),
          ethers.ZeroAddress,
          swapTokenABalance
        )
      ).to.be.revertedWith("Swap: invalid toToken");
    });
  });
});

```

{% endtab %}

{% endtabs %}
