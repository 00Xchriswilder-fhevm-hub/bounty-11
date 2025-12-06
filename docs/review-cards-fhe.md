# Review Cards FHE

## Overview

This example demonstrates public decryption, allowing anyone to decrypt encrypted values without requiring individual user permissions and shows how to manage FHE permissions for both contracts and users using external encrypted inputs with input proofs for verification.

## What You'll Learn

- **FHE.add operation** - How to perform this specific homomorphic operation on encrypted values
- **Off-chain encryption** - Encrypting values locally before sending to contract
- **FHE permissions** - Granting permissions for operations and decryption
- **Public decryption** - Making results publicly decryptable

## Key Concepts

### 1. FHE.add Operation

The `FHE.add()` function performs addition on encrypted values, computing the sum without ever decrypting the operands.

### 2. Off-Chain Encryption

Values are encrypted **locally** (on the client side) before being sent to the contract:
- Plaintext values never appear in transactions
- Encryption is cryptographically bound to [contract, user] pair
- Input proofs verify the binding

### 3. FHE Permissions

Permissions control who can:
- **Perform operations**: Contracts need `FHE.allowThis()`
- **Decrypt values**: Users need `FHE.allow()`

## Step-by-Step Walkthrough

### Step 1: Set Encrypted Values

Encrypt your values off-chain and send them to the contract using `setCreationFee()`.

### Step 2: Perform FHE.add Operation

Call the function that performs `FHE.add` (e.g., `withdrawFees()`).

## Common Pitfalls

### ❌ Pitfall 1: should fail with insufficient fee

**The Problem:** const fee = await contract.creationFee();
      const insufficientFee = fee / 2n;

      await expect(
        contract.connect(signers.creator...

**Why it fails:** The operation fails due to incorrect usage, permissions, or signer mismatch.

**The Fix:** Ensure proper setup, matching signers, and correct permissions.

### ❌ Pitfall 2: should fail with insufficient fee

**The Problem:** const fee = await contract.creationFee();
      const insufficientFee = fee / 2n;
      
      await expect(
        contract.connect(signers.c...

**Why it fails:** The operation fails due to incorrect usage, permissions, or signer mismatch.

**The Fix:** Ensure proper setup, matching signers, and correct permissions.

### ❌ Pitfall 3: should fail when rating non-existent card

**The Problem:** const nonExistentCardId = 999n;
      const rating = 5;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, sign...

**Why it fails:** The operation fails due to incorrect usage, permissions, or signer mismatch.

**The Fix:** Ensure proper setup, matching signers, and correct permissions.

## Best Practices

1. **Always match encryption signer with transaction signer**
2. **Grant permissions immediately after creating encrypted values**
3. **Use descriptive variable names** for clarity
4. **Validate inputs** before performing operations

## Real-World Use Cases

- **Confidential Accounting**: Sum or multiply encrypted balances
- **Privacy-Preserving Analytics**: Aggregate encrypted data points
- **Confidential Calculations**: Perform financial computations on encrypted values
{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

{% tabs %}

{% tab title="ReviewCardsFHE.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint32, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract ReviewCardsFHE is ZamaEthereumConfig {
    // Struct to store a single review card
    struct ReviewCard {
        uint256 id;                  // Unique card ID
        euint32 encryptedSum;         // Encrypted sum of all ratings (1-5 range)
        euint32 encryptedCount;       // Encrypted count of ratings submitted
        bool exists;                 // Check if card exists
        uint256 createdAt;           // Timestamp when card was created
        address creator;             // Address that created the card
    }

    // State variables
    mapping(uint256 => ReviewCard) public reviewCards;
    uint256 public nextCardId;  // Auto-incrementing ID for each new card
    
    // Track which addresses have voted on which cards to prevent double voting
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    // Fee and owner
    address public owner;
    uint256 public creationFee = 0.005 ether;

    // Events
    event CardCreated(uint256 indexed cardId, address indexed creator, uint256 timestamp);
    event RatingSubmitted(uint256 indexed cardId, address indexed rater, uint256 timestamp);
    event CreationFeeChanged(uint256 newFee);
    event FeesWithdrawn(address indexed to, uint256 amount);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // Set creation fee (only owner)
    function setCreationFee(uint256 newFee) external onlyOwner {
        creationFee = newFee;
        emit CreationFeeChanged(newFee);
    }

    // Withdraw collected fees (only owner)
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        payable(owner).transfer(balance);
        emit FeesWithdrawn(owner, balance);
    }

    // Create a new review card (requires fee)
    function createReviewCard() external payable {
        require(msg.value >= creationFee, "Insufficient creation fee");
        uint256 cardId = nextCardId++;
        ReviewCard storage card = reviewCards[cardId];
        
        card.id = cardId;
        card.encryptedSum = FHE.asEuint32(0);
        FHE.allowThis(card.encryptedSum);
        FHE.makePubliclyDecryptable(card.encryptedSum);
        card.encryptedCount = FHE.asEuint32(0);
        FHE.allowThis(card.encryptedCount);
        FHE.makePubliclyDecryptable(card.encryptedCount);
        card.exists = true;
        card.createdAt = block.timestamp;
        card.creator = msg.sender;

        emit CardCreated(cardId, msg.sender, block.timestamp);
    }

    // Submit encrypted rating (1-5 stars)
    function submitEncryptedRating(uint256 cardId, externalEuint32 encryptedRating, bytes calldata inputProof) external {
        require(reviewCards[cardId].exists, "Card does not exist");
        require(!hasVoted[cardId][msg.sender], "Already voted on this card");

        ReviewCard storage card = reviewCards[cardId];

        // Import the encrypted rating using the proof
        euint32 rating = FHE.fromExternal(encryptedRating, inputProof);

        // Homomorphic addition: add encrypted rating to sum
        card.encryptedSum = FHE.add(card.encryptedSum, rating);
        FHE.allowThis(card.encryptedSum);
        FHE.makePubliclyDecryptable(card.encryptedSum);

        // Increment encrypted count
        euint32 one = FHE.asEuint32(1);
        card.encryptedCount = FHE.add(card.encryptedCount, one);
        FHE.allowThis(card.encryptedCount);
        FHE.makePubliclyDecryptable(card.encryptedCount);

        // Mark this address as having voted
        hasVoted[cardId][msg.sender] = true;

        emit RatingSubmitted(cardId, msg.sender, block.timestamp);
    }

    // Get encrypted stats (sum and count) for frontend decryption/average
    function getEncryptedStats(uint256 cardId) external view returns (bytes32 sum, bytes32 count) {
        require(reviewCards[cardId].exists, "Card does not exist");
        ReviewCard storage card = reviewCards[cardId];
        sum = FHE.toBytes32(card.encryptedSum);
        count = FHE.toBytes32(card.encryptedCount);
    }

    // Get card information (non-encrypted data)
    function getCardInfo(uint256 cardId) external view returns (
        uint256 createdAt,
        address creator,
        bool exists
    ) {
        require(reviewCards[cardId].exists, "Card does not exist");
        
        ReviewCard storage card = reviewCards[cardId];
        return (
            card.createdAt,
            card.creator,
            card.exists
        );
    }

    // Check if an address has voted on a specific card
    function hasAddressVoted(uint256 cardId, address voter) external view returns (bool) {
        return hasVoted[cardId][voter];
    }

    // Get total number of cards created
    function getTotalCards() external view returns (uint256) {
        return nextCardId;
    }
}

```

{% endtab %}

{% tab title="ReviewCardsFHE.ts" %}

```typescript
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { ReviewCardsFHE, ReviewCardsFHE__factory } from "../../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

/**
 * @title Review Cards FHE Test Suite
 * @notice Tests for ReviewCardsFHE contract demonstrating encrypted ratings
 * @dev This test suite shows:
 *      - ✅ Card creation with fees
 *      - ✅ Encrypted rating submission
 *      - ✅ Encrypted sum and count tracking
 *      - ✅ Public decryption for averages
 */

type Signers = {
  deployer: HardhatEthersSigner;
  owner: HardhatEthersSigner;
  creator: HardhatEthersSigner;
  rater1: HardhatEthersSigner;
  rater2: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("ReviewCardsFHE")) as ReviewCardsFHE__factory;
  const contract = (await factory.deploy()) as ReviewCardsFHE;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("ReviewCardsFHE", function () {
  let signers: Signers;
  let contract: ReviewCardsFHE;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      owner: ethSigners[0], // Owner is deployer
      creator: ethSigners[1],
      rater1: ethSigners[2],
      rater2: ethSigners[3],
    };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());
  });

  describe("✅ Card Creation", function () {
    it("should create a review card with fee", async function () {
      const fee = await contract.creationFee();

      await expect(
        contract.connect(signers.creator).createReviewCard({ value: fee })
      ).to.emit(contract, "CardCreated");

      const totalCards = await contract.getTotalCards();
      expect(totalCards).to.eq(1);
    });

    it("should fail with insufficient fee", async function () {
      const fee = await contract.creationFee();
      const insufficientFee = fee / 2n;

      await expect(
        contract.connect(signers.creator).createReviewCard({ value: insufficientFee })
      ).to.be.revertedWith("Insufficient creation fee");
    });
  });

  describe("✅ Rating Submission", function () {
    let cardId: bigint;

    beforeEach(async function () {
      const fee = await contract.creationFee();
      await contract.connect(signers.creator).createReviewCard({ value: fee });
      cardId = 0n;
    });

    it("should submit encrypted rating (1-5 stars)", async function () {
      const rating = 5; // 5 stars
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.rater1.address)
        .add32(rating)
        .encrypt();

      await expect(
        contract
          .connect(signers.rater1)
          .submitEncryptedRating(cardId, encrypted.handles[0], encrypted.inputProof)
      ).to.emit(contract, "RatingSubmitted");

      expect(await contract.hasAddressVoted(cardId, signers.rater1.address)).to.be.true;
    });

    it("should prevent double voting", async function () {
      const rating = 4;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.rater1.address)
        .add32(rating)
        .encrypt();

      await contract
        .connect(signers.rater1)
        .submitEncryptedRating(cardId, encrypted.handles[0], encrypted.inputProof);

      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, signers.rater1.address)
        .add32(rating)
        .encrypt();

      await expect(
        contract
          .connect(signers.rater1)
          .submitEncryptedRating(cardId, encrypted2.handles[0], encrypted2.inputProof)
      ).to.be.revertedWith("Already voted on this card");
    });

    it("should allow multiple raters", async function () {
      // Rater 1 submits 5 stars
      const encrypted1 = await fhevm
        .createEncryptedInput(contractAddress, signers.rater1.address)
        .add32(5)
        .encrypt();
      await contract
        .connect(signers.rater1)
        .submitEncryptedRating(cardId, encrypted1.handles[0], encrypted1.inputProof);

      // Rater 2 submits 4 stars
      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, signers.rater2.address)
        .add32(4)
        .encrypt();
      await contract
        .connect(signers.rater2)
        .submitEncryptedRating(cardId, encrypted2.handles[0], encrypted2.inputProof);

      expect(await contract.hasAddressVoted(cardId, signers.rater1.address)).to.be.true;
      expect(await contract.hasAddressVoted(cardId, signers.rater2.address)).to.be.true;
    });
  });

  describe("✅ Encrypted Stats", function () {
    let cardId: bigint;

    beforeEach(async function () {
      const fee = await contract.creationFee();
      await contract.connect(signers.creator).createReviewCard({ value: fee });
      cardId = 0n;
    });

    it("should return encrypted stats (sum and count)", async function () {
      // Submit a rating
      const rating = 5;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.rater1.address)
        .add32(rating)
        .encrypt();
      await contract
        .connect(signers.rater1)
        .submitEncryptedRating(cardId, encrypted.handles[0], encrypted.inputProof);

      const stats = await contract.getEncryptedStats(cardId);
      expect(stats.sum).to.not.eq(ethers.ZeroHash);
      expect(stats.count).to.not.eq(ethers.ZeroHash);
    });

    it("should return card info", async function () {
      const cardInfo = await contract.getCardInfo(cardId);
      expect(cardInfo.exists).to.be.true;
      expect(cardInfo.creator).to.eq(signers.creator.address);
    });
  });

  describe("✅ Owner Functions", function () {
    it("should allow owner to change creation fee", async function () {
      const newFee = ethers.parseEther("0.01");
      await contract.connect(signers.owner).setCreationFee(newFee);

      expect(await contract.creationFee()).to.eq(newFee);
    });

    it("should prevent non-owner from changing fee", async function () {
      const newFee = ethers.parseEther("0.01");
      await expect(
        contract.connect(signers.creator).setCreationFee(newFee)
      ).to.be.revertedWith("Not owner");
    });
  });

  // ❌ Common Pitfalls
  describe("❌ Error Cases", function () {
    it("should fail with insufficient fee", async function () {
      const fee = await contract.creationFee();
      const insufficientFee = fee / 2n;
      
      await expect(
        contract.connect(signers.creator).createReviewCard({ value: insufficientFee })
      ).to.be.reverted;
    });

    it("should fail when rating non-existent card", async function () {
      const nonExistentCardId = 999n;
      const rating = 5;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.rater1.address)
        .add32(rating)
        .encrypt();
      
      await expect(
        contract
          .connect(signers.rater1)
          .submitEncryptedRating(nonExistentCardId, encrypted.handles[0], encrypted.inputProof)
      ).to.be.reverted;
    });

    it("should fail when using wrong signer for encrypted input", async function () {
      const fee = await contract.creationFee();
      await contract.connect(signers.creator).createReviewCard({ value: fee });
      const cardId = 0n;

      // Create encrypted input with wrong signer
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.creator.address) // Wrong signer!
        .add32(5)
        .encrypt();
      
      // Should fail because signer doesn't match
      await expect(
        contract
          .connect(signers.rater1)
          .submitEncryptedRating(cardId, encrypted.handles[0], encrypted.inputProof)
      ).to.be.reverted;
    });
  });
});


```

{% endtab %}

{% endtabs %}
