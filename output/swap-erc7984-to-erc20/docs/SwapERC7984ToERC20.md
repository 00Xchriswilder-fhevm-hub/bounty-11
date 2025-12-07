# Swap ERC7984 to ERC20

<!-- chapter: openzeppelin -->

## Overview

This example demonstrates public decryption with multiple encrypted values, allowing anyone to decrypt results without requiring individual user permissions.

## What You'll Learn

- **Off-chain encryption** - Encrypting values locally before sending to contract
- **FHE permissions** - Granting permissions for operations and decryption
- **Public decryption** - Making results publicly decryptable

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

### ❌ Pitfall 1: should fail when trying to initiate swap without transferring first

**The Problem:** Create a dummy encrypted amount (not actually transferred)

**Why it fails:** The input proof verification or permission check fails when requirements aren't met.

**The Fix:** Always ensure signers match and permissions are granted correctly.

### ❌ Pitfall 2: should fail when finalizing swap with wrong decryption proof

**The Problem:** Transfer and initiate swap

**Why it fails:** The input proof verification or permission check fails when requirements aren't met.

**The Fix:** Always ensure signers match and permissions are granted correctly.

### ❌ Pitfall 3: should fail when finalizing swap with invalid handle

**The Problem:** Step 1: Complete a swap to get a finalized handle (not in _pendingSwaps anymore)

**Why it fails:** The input proof verification or permission check fails when requirements aren't met.

**The Fix:** Always ensure signers match and permissions are granted correctly.

## Best Practices

1. **Always match encryption signer with transaction signer**
2. **Grant permissions immediately after creating encrypted values**
3. **Use descriptive variable names** for clarity
4. **Validate inputs** before performing operations

## Real-World Use Cases

- **Public Results**: Reveal encrypted game results or tallies
- **Transparent Outcomes**: Make encrypted computations publicly verifiable
{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}

{% tab title="SwapERC7984ToERC20.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC7984Mock} from "./ERC7984Mock.sol";

/**
 * @title Swap ERC7984 to ERC20
 * @notice This example demonstrates swapping confidential tokens for public tokens
 * @dev Shows how to perform a swap while maintaining privacy until finalization
 *
 * Key Features:
 * - Swap confidential ERC7984 tokens for public ERC20 tokens
 * - Two-phase swap: initiate (encrypted) → finalize (decrypted)
 * - Uses public decryption for finalization
 * - Demonstrates swap pattern with FHE
 *
 * Use Cases:
 * - Privacy-preserving token swaps
 * - Confidential DEX operations
 * - Converting confidential tokens to public tokens
 */
contract SwapERC7984ToERC20 is ZamaEthereumConfig {
    // The confidential token being swapped
    ERC7984Mock private immutable _fromToken;
    
    // The public token being received
    IERC20 private immutable _toToken;
    
    // Swap rate (how many public tokens per confidential token)
    uint256 private immutable _rate;
    
    // Track pending swaps: encrypted amount => recipient address
    mapping(euint64 => address) private _pendingSwaps;
    
    // Events
    event SwapInitiated(address indexed user, euint64 indexed encryptedAmount);
    event SwapFinalized(address indexed user, euint64 indexed encryptedAmount, uint256 publicAmount);

    error InvalidSwapRequest(euint64 amount);
    error InsufficientLiquidity();

    /**
     * @dev Constructor sets the tokens and swap rate
     * @param fromToken_ Address of the confidential ERC7984 token
     * @param toToken_ Address of the public ERC20 token
     * @param rate_ Swap rate (e.g., 1000 means 1 confidential token = 1000 public tokens)
     */
    constructor(
        ERC7984Mock fromToken_,
        IERC20 toToken_,
        uint256 rate_
    ) {
        _fromToken = fromToken_;
        _toToken = toToken_;
        _rate = rate_ == 0 ? 1 : rate_; // Default to 1:1 if rate is 0
    }

    /**
     * @notice Returns the confidential token address
     * @return Address of the confidential token
     */
    function fromToken() public view returns (ERC7984Mock) {
        return _fromToken;
    }

    /**
     * @notice Returns the public token address
     * @return Address of the public token
     */
    function toToken() public view returns (IERC20) {
        return _toToken;
    }

    /**
     * @notice Returns the swap rate
     * @return Rate at which confidential tokens are swapped for public tokens
     */
    function rate() public view returns (uint256) {
        return _rate;
    }

    /**
     * @notice Initiates a swap from confidential to public tokens
     * @param transferredAmount The encrypted amount that was already transferred to this contract
     * @dev Phase 1: User must first call confidentialTransfer on the token contract
     *      to transfer tokens to this swap contract, then call this function with the swap contract's balance.
     *      The balance is automatically allowed for the swap contract after the transfer.
     */
    function initiateSwap(euint64 transferredAmount) external {
        // Verify that the transferred amount is allowed for this contract
        require(FHE.isAllowed(transferredAmount, address(this)), "Swap: amount not allowed for swap contract");
        
        // Verify that the swap contract has the tokens (check balance increased)
        // Note: We can't easily verify this without tracking, so we rely on the user
        // having transferred the tokens first via confidentialTransferWithAllowedAmount
        
        // Grant transient permission for the swap contract to use this amount
        FHE.allowTransient(transferredAmount, address(this));
        
        // Make the amount publicly decryptable for finalization
        FHE.makePubliclyDecryptable(transferredAmount);
        
        // Store the pending swap
        _pendingSwaps[transferredAmount] = msg.sender;
        
        emit SwapInitiated(msg.sender, transferredAmount);
    }

    /**
     * @notice Finalizes a swap by converting decrypted amount to public tokens
     * @param encryptedAmount The encrypted amount that was swapped
     * @param cleartextAmount The decrypted amount (must match encrypted amount)
     * @param decryptionProof Proof that the decryption is correct
     * @dev Phase 2: After decryption, transfer public tokens to user
     */
    function finalizeSwap(
        euint64 encryptedAmount,
        uint64 cleartextAmount,
        bytes calldata decryptionProof
    ) external {
        // Verify the decryption proof
        bytes32[] memory handles = new bytes32[](1);
        handles[0] = euint64.unwrap(encryptedAmount);
        
        FHE.checkSignatures(handles, abi.encode(cleartextAmount), decryptionProof);
        
        // Get the recipient
        address recipient = _pendingSwaps[encryptedAmount];
        if (recipient == address(0)) {
            revert InvalidSwapRequest(encryptedAmount);
        }
        
        // Clear the pending swap
        delete _pendingSwaps[encryptedAmount];
        
        // Calculate public token amount based on rate
        uint256 publicAmount = (uint256(cleartextAmount) * _rate);
        
        // Check contract has sufficient public tokens
        uint256 contractBalance = _toToken.balanceOf(address(this));
        if (contractBalance < publicAmount) {
            revert InsufficientLiquidity();
        }
        
        // Transfer public tokens to the recipient
        SafeERC20.safeTransfer(_toToken, recipient, publicAmount);
        
        emit SwapFinalized(recipient, encryptedAmount, publicAmount);
    }

    /**
     * @notice Allows the contract owner to add liquidity (public tokens)
     * @param amount Amount of public tokens to add
     * @dev In production, this would be handled by liquidity providers
     */
    function addLiquidity(uint256 amount) external {
        SafeERC20.safeTransferFrom(_toToken, msg.sender, address(this), amount);
    }

    /// @notice Get the from token address (for backward compatibility with tests)
    /// @return The ERC7984 token address
    function getFromToken() external view returns (address) {
        return address(_fromToken);
    }

    /// @notice Get the to token address (for backward compatibility with tests)
    /// @return The ERC20 token address
    function getToToken() external view returns (address) {
        return address(_toToken);
    }
}

```

{% endtab %}

{% tab title="SwapERC7984ToERC20.ts" %}

```typescript
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { SwapERC7984ToERC20, SwapERC7984ToERC20__factory } from "../../types";
// ERC7984Mock types will be available in generated examples after compilation
import type { Contract } from "ethers";
type ERC7984Mock = Contract;
type ERC7984Mock__factory = any;
import { ERC20Mock } from "../../types";
import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-network-helpers";

/**
 * @chapter openzeppelin
 * @title Swap ERC7984 to ERC20 Test Suite
 * @notice Comprehensive tests for SwapERC7984ToERC20 contract
 * @dev Tests cover:
 *      - ✅ Swap initiation
 *      - ✅ Swap finalization
 *      - ✅ Two-phase swap pattern
 *      - ✅ Decryption proof verification
 *      - ❌ Error cases
 */

type Signers = {
  deployer: HardhatEthersSigner;
  user: HardhatEthersSigner;
  recipient: HardhatEthersSigner;
};

async function deployFixture() {
  const signers = await ethers.getSigners();
  
  // Deploy ERC20 token
  // Note: ERC20Mock from test/helpers is copied to contracts/ by the script
  // Use fully qualified name to avoid conflict with OpenZeppelin's ERC20Mock
  // In source directory: contracts/openzeppelin/ERC20Mock.sol
  // In output directory: contracts/ERC20Mock.sol
  let ERC20Factory;
  try {
    ERC20Factory = await ethers.getContractFactory("contracts/ERC20Mock.sol:ERC20Mock");
  } catch {
    ERC20Factory = await ethers.getContractFactory("contracts/openzeppelin/ERC20Mock.sol:ERC20Mock");
  }
  const erc20Token = (await ERC20Factory.deploy("Test ERC20", "T20")) as unknown as ERC20Mock;
  
  // Deploy ERC7984 token (using ERC7984Mock with access control)
  // Note: In source directory, ERC7984Mock is at contracts/openzeppelin/ERC7984Mock.sol
  // In output directory (after create-example), it's copied to contracts/ERC7984Mock.sol
  let ERC7984Factory;
  try {
    ERC7984Factory = await ethers.getContractFactory("contracts/ERC7984Mock.sol:ERC7984Mock");
  } catch {
    ERC7984Factory = await ethers.getContractFactory("contracts/openzeppelin/ERC7984Mock.sol:ERC7984Mock");
  }
  const erc7984Token = (await ERC7984Factory.deploy(
    signers[0].address, // owner
    "Test ERC7984",
    "T7984",
    "https://example.com"
  )) as unknown as ERC7984Mock;
  
  // Deploy swap contract - constructor takes (ERC7984Mock fromToken, IERC20 toToken, uint256 rate)
  // Note: In source directory, SwapERC7984ToERC20 is at contracts/openzeppelin/SwapERC7984ToERC20.sol
  // In output directory (after create-example), it's copied to contracts/SwapERC7984ToERC20.sol
  let SwapFactory;
  try {
    SwapFactory = await ethers.getContractFactory("contracts/SwapERC7984ToERC20.sol:SwapERC7984ToERC20");
  } catch {
    SwapFactory = await ethers.getContractFactory("contracts/openzeppelin/SwapERC7984ToERC20.sol:SwapERC7984ToERC20");
  }
  const swapContract = (await SwapFactory.deploy(
    await erc7984Token.getAddress(), 
    await erc20Token.getAddress(),
    1 // 1:1 swap rate
  )) as unknown as SwapERC7984ToERC20;
  
  return { swapContract, erc7984Token, erc20Token, swapAddress: await swapContract.getAddress() };
}

describe("SwapERC7984ToERC20", function () {
  let signers: Signers;
  let swapContract: SwapERC7984ToERC20;
  let erc7984Token: ERC7984Mock;
  let erc20Token: ERC20Mock;
  let swapAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      user: ethSigners[1],
      recipient: ethSigners[2],
    };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      this.skip();
    }

    const fixture = await deployFixture();
    swapContract = fixture.swapContract;
    erc7984Token = fixture.erc7984Token;
    erc20Token = fixture.erc20Token;
    swapAddress = fixture.swapAddress;

    // Mint ERC7984 tokens to user
    // IMPORTANT: createEncryptedInput(contractAddress, senderAddress) - matches VestingWallet pattern
    // contractAddress: token contract address (where fromExternal is called inside $_mint)
    // senderAddress: deployer (who calls $_mint)
    const amount = 1000;
    const tokenAddress = await erc7984Token.getAddress();
    const encrypted = await fhevm
      .createEncryptedInput(tokenAddress, signers.deployer.address)
      .add64(amount)
      .encrypt();
    await (erc7984Token.connect(signers.deployer) as any)
      .getFunction("$_mint(address,bytes32,bytes)")
      .send(signers.user.address, encrypted.handles[0], encrypted.inputProof);
    
    // Add liquidity to swap contract (ERC20 tokens)
    await erc20Token.mint(swapAddress, 10000);

    // Mint ERC20 tokens to swap contract
    await erc20Token.mint(swapAddress, 10000);
  });

  describe("✅ Swap Initiation", function () {
    it("should initiate swap from ERC7984 to ERC20", async function () {
      // ✅ NEW PATTERN: User transfers first, then calls initiateSwap
      // Step 1: User transfers tokens to swap contract using confidentialTransfer
      const swapAmount = 500;
      const tokenAddress = await erc7984Token.getAddress();
      const swapAddress = await swapContract.getAddress();
      
      // Create encrypted input for the token contract (where confidentialTransfer is called)
      const encrypted = await fhevm
        .createEncryptedInput(tokenAddress, signers.user.address)
        .add64(swapAmount)
        .encrypt();

      // User transfers tokens to swap contract using getFunction to disambiguate
      await (erc7984Token.connect(signers.user) as any)
        .getFunction("confidentialTransfer(address,bytes32,bytes)")
        .send(swapAddress, encrypted.handles[0], encrypted.inputProof);

      // Step 2: Get the swap contract's balance (which is now the transferred amount)
      const swapBalance = await erc7984Token.confidentialBalanceOf(swapAddress);
      
      // Step 3: Call initiateSwap with the balance
      await expect(
        (swapContract.connect(signers.user) as any).initiateSwap(swapBalance)
      ).to.not.be.reverted;
    });

    it("should transfer ERC7984 tokens to swap contract", async function () {
      const swapAmount = 300;
      const tokenAddress = await erc7984Token.getAddress();
      const swapAddress = await swapContract.getAddress();
      
      // Create encrypted input for the token contract
      const encrypted = await fhevm
        .createEncryptedInput(tokenAddress, signers.user.address)
        .add64(swapAmount)
        .encrypt();

      // User transfers tokens to swap contract using getFunction to disambiguate
      await (erc7984Token.connect(signers.user) as any)
        .getFunction("confidentialTransfer(address,bytes32,bytes)")
        .send(swapAddress, encrypted.handles[0], encrypted.inputProof);

      // Check that swap contract has encrypted balance
      const swapBalance = await erc7984Token.confidentialBalanceOf(swapAddress);
      expect(swapBalance).to.not.eq(ethers.ZeroHash);
      
      // Initiate swap
      await (swapContract.connect(signers.user) as any).initiateSwap(swapBalance);
    });
  });

  describe("✅ Swap Finalization", function () {
    it("should finalize swap with correct decryption proof", async function () {
      const swapAmount = 200;
      const tokenAddress = await erc7984Token.getAddress();
      const swapAddress = await swapContract.getAddress();
      
      // Step 1: User transfers tokens to swap contract
      const encrypted = await fhevm
        .createEncryptedInput(tokenAddress, signers.user.address)
        .add64(swapAmount)
        .encrypt();

      await (erc7984Token.connect(signers.user) as any)
        .getFunction("confidentialTransfer(address,bytes32,bytes)")
        .send(swapAddress, encrypted.handles[0], encrypted.inputProof);

      // Step 2: Get swap contract's balance
      const swapBalance = await erc7984Token.confidentialBalanceOf(swapAddress);
      expect(swapBalance).to.not.eq(ethers.ZeroHash);

      // Step 3: Initiate swap - this makes the amount publicly decryptable
      const tx = await (swapContract.connect(signers.user) as any).initiateSwap(swapBalance);
      
      // Get the encrypted amount from the SwapInitiated event
      const receipt = await tx.wait();
      const swapInitiatedEvent = receipt?.logs.find(
        (log: any) => {
          try {
            const parsed = swapContract.interface.parseLog(log);
            return parsed?.name === "SwapInitiated";
          } catch {
            return false;
          }
        }
      );
      
      expect(swapInitiatedEvent).to.not.be.undefined;
      const parsedEvent = swapContract.interface.parseLog(swapInitiatedEvent!);
      const encryptedAmount = parsedEvent?.args[1]; // Second arg is encryptedAmount (euint64)
      
      // Decrypt the publicly decryptable amount
      const encryptedAmountHandle = ethers.hexlify(encryptedAmount);
      const decryptionResults = await fhevm.publicDecrypt([encryptedAmountHandle]);
      
      // Extract cleartext amount and decryption proof
      const cleartextAmount = Number((decryptionResults.clearValues as any)[encryptedAmountHandle]);
      const decryptionProof = decryptionResults.decryptionProof;
      
      // Verify the amount matches
      expect(cleartextAmount).to.eq(swapAmount);
      
      // Finalize the swap - now takes euint64 instead of bytes32
      await (swapContract as any).finalizeSwap(encryptedAmount, cleartextAmount, decryptionProof);
      
      // Verify ERC20 tokens were transferred to user (rate is 1:1, so amount should match)
      const userBalance = await erc20Token.balanceOf(signers.user.address);
      expect(userBalance).to.eq(swapAmount);
    });
  });

  describe("❌ Error Cases", function () {
    it("should fail when trying to initiate swap without transferring first", async function () {
      const swapAmount = 100;
      const tokenAddress = await erc7984Token.getAddress();
      
      // Create a dummy encrypted amount (not actually transferred)
      const encrypted = await fhevm
        .createEncryptedInput(tokenAddress, signers.user.address)
        .add64(swapAmount)
        .encrypt();

      // Try to initiate swap with an amount that wasn't transferred to the contract
      // This should fail because the amount is not allowed for the swap contract
      const dummyBalance = encrypted.handles[0];
      
      await expect(
        (swapContract.connect(signers.user) as any).initiateSwap(dummyBalance)
      ).to.be.revertedWith("Swap: amount not allowed for swap contract");
    });

    it("should fail when finalizing swap with wrong decryption proof", async function () {
      const swapAmount = 200;
      const tokenAddress = await erc7984Token.getAddress();
      const swapAddress = await swapContract.getAddress();
      
      // Transfer and initiate swap
      const encrypted = await fhevm
        .createEncryptedInput(tokenAddress, signers.user.address)
        .add64(swapAmount)
        .encrypt();

      await (erc7984Token.connect(signers.user) as any)
        .getFunction("confidentialTransfer(address,bytes32,bytes)")
        .send(swapAddress, encrypted.handles[0], encrypted.inputProof);

      const swapBalance = await erc7984Token.confidentialBalanceOf(swapAddress);
      const tx = await (swapContract.connect(signers.user) as any).initiateSwap(swapBalance);
      const receipt = await tx.wait();
      
      const swapInitiatedEvent = receipt?.logs.find(
        (log: any) => {
          try {
            const parsed = swapContract.interface.parseLog(log);
            return parsed?.name === "SwapInitiated";
          } catch {
            return false;
          }
        }
      );
      
      const parsedEvent = swapContract.interface.parseLog(swapInitiatedEvent!);
      const encryptedAmount = parsedEvent?.args[1];
      
      // Try to finalize with wrong amount
      const wrongAmount = swapAmount + 100;
      const encryptedAmountHandle = ethers.hexlify(encryptedAmount);
      const decryptionResults = await fhevm.publicDecrypt([encryptedAmountHandle]);
      const decryptionProof = decryptionResults.decryptionProof;
      
      await expect(
        (swapContract as any).finalizeSwap(encryptedAmount, wrongAmount, decryptionProof)
      ).to.be.reverted;
    });

    it("should fail when finalizing swap with invalid handle", async function () {
      const swapAmount = 200;
      const tokenAddress = await erc7984Token.getAddress();
      const swapAddress = await swapContract.getAddress();
      
      // Step 1: Complete a swap to get a finalized handle (not in _pendingSwaps anymore)
      const encrypted1 = await fhevm
        .createEncryptedInput(tokenAddress, signers.user.address)
        .add64(swapAmount)
        .encrypt();

      await (erc7984Token.connect(signers.user) as any)
        .getFunction("confidentialTransfer(address,bytes32,bytes)")
        .send(swapAddress, encrypted1.handles[0], encrypted1.inputProof);

      const swapBalance1 = await erc7984Token.confidentialBalanceOf(swapAddress);
      const tx1 = await (swapContract.connect(signers.user) as any).initiateSwap(swapBalance1);
      const receipt1 = await tx1.wait();
      
      const swapInitiatedEvent1 = receipt1?.logs.find(
        (log: any) => {
          try {
            const parsed = swapContract.interface.parseLog(log);
            return parsed?.name === "SwapInitiated";
          } catch {
            return false;
          }
        }
      );
      const parsedEvent1 = swapContract.interface.parseLog(swapInitiatedEvent1!);
      const finalizedEncryptedAmount = parsedEvent1?.args[1];
      
      // Decrypt and finalize the first swap
      const finalizedHandle = ethers.hexlify(finalizedEncryptedAmount);
      const finalizedDecryption = await fhevm.publicDecrypt([finalizedHandle]);
      const finalizedCleartext = Number((finalizedDecryption.clearValues as any)[finalizedHandle]);
      const finalizedProof = finalizedDecryption.decryptionProof;
      
      // Finalize the swap (removes it from _pendingSwaps)
      await (swapContract as any).finalizeSwap(finalizedEncryptedAmount, finalizedCleartext, finalizedProof);
      
      // Step 2: Try to finalize again with the same handle (now invalid - not in _pendingSwaps)
      // This should fail with InvalidSwapRequest
      await expect(
        (swapContract as any).finalizeSwap(
          finalizedEncryptedAmount,
          finalizedCleartext,
          finalizedProof
        )
      ).to.be.revertedWithCustomError(swapContract, "InvalidSwapRequest");
    });
  });
});

```

{% endtab %}

{% endtabs %}
