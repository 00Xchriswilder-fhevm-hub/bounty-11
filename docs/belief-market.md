# Belief Market

<!-- chapter: advanced -->

## Overview

Confidential prediction market where votes are encrypted until reveal. Demonstrates encrypted voting with weighted stakes, prize pool management with FHE, confidential tally reveal after expiry, winner determination, and prize distribution using FHE.select and FHE.add operations.

## What You'll Learn

- **Encrypted voting with** - weighted stakes
- **Prize pool management** - with FHE
- **Confidential tally reveal** - after expiry
- **Winner determination and** - prize distribution

## Key Concepts

### 1. euint64

Encrypted 64-bit unsigned integer for vote counts

### 2. FHE.select

Conditional addition based on vote type

### 3. FHE.makePubliclyDecryptable

Make encrypted values decryptable after voting ends

### 4. FHE.checkSignatures

Verify decryption proofs from relayer

## Step-by-Step Walkthrough

### Step 1: Set Encrypted Values

Encrypt your values off-chain and send them to the contract using `setTesting()`.

### Step 2: Perform FHE.add Operation

Call the function that performs `FHE.add` (e.g., `setPlatformStake()`).

## Common Pitfalls

### ❌ Pitfall 1: should fail with incorrect platform stake

**The Problem:** await expect(
        contract.connect(signers.creator).createBet("bet1", VOTE_STAKE, DURATION, { 
          value: ethers.parseEther("0.01"...

**Why it fails:** The operation fails due to incorrect usage, permissions, or signer mismatch.

**The Fix:** Ensure proper setup, matching signers, and correct permissions.

### ❌ Pitfall 2: should fail with vote stake too low

**The Problem:** await expect(
        contract.connect(signers.creator).createBet("bet1", ethers.parseEther("0.001"), DURATION, { 
          value: PLATFORM...

**Why it fails:** The operation fails due to incorrect usage, permissions, or signer mismatch.

**The Fix:** Ensure proper setup, matching signers, and correct permissions.

### ❌ Pitfall 3: should fail with invalid duration

**The Problem:** await expect(
        contract.connect(signers.creator).createBet("bet1", VOTE_STAKE, 60, { value: PLATFORM_STAKE }) // Too short
      ).to...

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

{% tab title="BeliefMarket.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, externalEuint64, euint64, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Belief Market - Confidential Prediction Market
/// @notice A prediction market where votes are encrypted until reveal
///
/// @dev This contract demonstrates:
///      - Encrypted voting with weighted stakes
///      - Prize pool management with FHE
///      - Confidential tally reveal after expiry
///      - Winner determination and prize distribution
///
/// @dev Key Concepts:
///      - euint64: Encrypted 64-bit unsigned integer for vote counts
///      - FHE.select: Conditional addition based on vote type
///      - FHE.makePubliclyDecryptable: Make encrypted values decryptable after voting ends
///      - FHE.checkSignatures: Verify decryption proofs from relayer
///
/// @dev Educational Notes:
///      ✅ DO: Use FHE.select for conditional logic on encrypted values
///      ✅ DO: Call FHE.allowThis() after every FHE operation that modifies state
///      ✅ DO: Grant permissions to users who need to decrypt (FHE.allow)
///      ✅ DO: Use FHE.makePubliclyDecryptable() for public reveals
///      ✅ DO: Verify decryption proofs with FHE.checkSignatures()
///      ❌ DON'T: Reveal vote tallies before betting ends
///      ❌ DON'T: Allow voting after expiry
///      ❌ DON'T: Skip proof verification in callbacks
///      ❌ DON'T: Forget to track user vote types for prize distribution
contract BeliefMarket is ZamaEthereumConfig {
    struct BetInfo {
        address creator;
        uint256 platformStake;
        uint256 voteStake;
        uint256 expiryTime;
        bool isResolved;
        bool revealRequested;
        euint64 yesVotes;      // ✅ Encrypted vote tally - hidden until reveal
        euint64 noVotes;       // ✅ Encrypted vote tally - hidden until reveal
        uint64 revealedYes;    // Plaintext result after reveal
        uint64 revealedNo;     // Plaintext result after reveal
        uint256 prizePool;
        bool yesWon;
    }

    uint256 public platformStake = 0.02 ether;
    uint256 public constant MIN_VOTE_STAKE = 0.005 ether;
    uint256 public constant MIN_DURATION = 5 minutes;
    uint256 public constant MAX_DURATION = 30 days;

    /// @dev Bet storage - uses string IDs for flexibility
    mapping(string => BetInfo) private bets;
    
    /// @dev Track who has voted - prevents double voting
    /// ✅ DO: Always track participation to prevent manipulation
    mapping(string => mapping(address => bool)) public hasVoted;
    
    /// @dev Store user vote types for prize distribution
    /// ✅ DO: Track vote choices (not amounts) for winner determination
    /// Note: This is public information (0=No, 1=Yes) but vote weights remain encrypted
    mapping(string => mapping(address => uint8)) internal userVoteType;
    
    /// @dev Store user vote weights for accurate prize distribution
    mapping(string => mapping(address => uint64)) internal userVoteWeight;
    
    /// @dev Prevent double claiming
    mapping(string => mapping(address => bool)) internal hasClaimed;

    uint256 public platformFees;
    address public owner;
    bool public isTesting;

    event BetCreated(string betId, address creator, uint256 stakeAmount, uint256 voteStake, uint256 expiryTime);
    event VoteCast(string betId, address voter);
    event TallyRevealRequested(string betId, bytes32 yesVotesHandle, bytes32 noVotesHandle);
    event BetResolved(string betId, bool yesWon, uint64 revealedYes, uint64 revealedNo, uint256 totalPrize);
    event PrizeDistributed(string betId, address winner, uint256 amount);
    event PlatformFeesWithdrawn(address indexed to, uint256 amount);
    event RefundClaimed(string betId, address user, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Admin Functions
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice Enable/disable testing mode
    function setTesting(bool enabled) external onlyOwner {
        isTesting = enabled;
    }

    /// @notice Update platform stake requirement
    function setPlatformStake(uint256 newStake) external onlyOwner {
        require(newStake > 0, "Platform stake must be positive");
        platformStake = newStake;
    }

    /// @notice Withdraw accumulated platform fees
    function withdrawPlatformFees(address to) external onlyOwner {
        require(platformFees > 0, "No fees to withdraw");
        uint256 amount = platformFees;
        platformFees = 0;
        (bool sent, ) = payable(to).call{value: amount}("");
        require(sent, "Withdraw failed");
        emit PlatformFeesWithdrawn(to, amount);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Bet Creation
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice Create a new prediction bet
    /// @param betId Unique identifier for the bet
    /// @param voteStake Amount each voter must stake
    /// @param duration Duration in seconds until bet expires
    ///
    /// @dev ✅ CORRECT: Initialize encrypted tallies to zero
    ///      FHE.asEuint64(0) creates an encrypted zero value
    function createBet(
        string memory betId,
        uint256 voteStake,
        uint256 duration
    ) external payable {
        require(msg.value == platformStake, "Must stake the current platform fee");
        require(voteStake >= MIN_VOTE_STAKE, "Vote stake too low");
        require(duration >= MIN_DURATION && duration <= MAX_DURATION, "Invalid duration");
        require(bets[betId].creator == address(0), "Bet already exists");

        platformFees += msg.value;

        // ✅ CORRECT: Initialize encrypted vote tallies
        // FHE.asEuint64(0) creates an encrypted representation of zero
        bets[betId] = BetInfo({
            creator: msg.sender,
            platformStake: msg.value,
            voteStake: voteStake,
            expiryTime: block.timestamp + duration,
            isResolved: false,
            revealRequested: false,
            yesVotes: FHE.asEuint64(0),  // ✅ Encrypted zero
            noVotes: FHE.asEuint64(0),   // ✅ Encrypted zero
            revealedYes: 0,
            revealedNo: 0,
            prizePool: 0,
            yesWon: false
        });

        emit BetCreated(betId, msg.sender, msg.value, voteStake, block.timestamp + duration);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Voting - Demonstrates FHE.select for Conditional Logic
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice Cast an encrypted vote
    /// @param betId The bet to vote on
    /// @param encryptedWeight Encrypted vote weight
    /// @param voteType 0 = No, 1 = Yes (public choice, encrypted weight)
    /// @param inputProof Proof for the encrypted input
    ///
    /// @dev Key Pattern: Using FHE.select for conditional encrypted addition
    ///
    /// ✅ CORRECT Pattern:
    ///    ebool condition = FHE.eq(value, target);
    ///    result = FHE.add(tally, FHE.select(condition, weight, zero));
    ///
    /// ❌ WRONG Pattern (would leak information):
    ///    if (voteType == 1) { // This reveals the vote!
    ///        yesVotes = FHE.add(yesVotes, weight);
    ///    }
    ///
    /// The FHE.select approach adds to BOTH tallies but with zero for the wrong one,
    /// ensuring no information leaks about vote weights per choice.
    function vote(
        string memory betId,
        externalEuint64 encryptedWeight,
        uint8 voteType,
        bytes calldata inputProof
    ) external payable {
        BetInfo storage bet = bets[betId];
        require(bet.creator != address(0), "Bet doesn't exist");
        require(!bet.isResolved, "Bet already resolved");
        require(block.timestamp < bet.expiryTime, "Bet expired");
        require(msg.value == bet.voteStake, "Incorrect vote stake");
        require(!hasVoted[betId][msg.sender], "Already voted");

        // ✅ CORRECT: Convert external encrypted input to internal
        euint64 weight = FHE.fromExternal(encryptedWeight, inputProof);
        
        // ✅ CORRECT: Create encrypted zero for conditional selection
        euint64 zero = FHE.asEuint64(0);
        
        // ✅ CORRECT: Create encrypted boolean conditions
        // Note: voteType is public (0 or 1), but weight is encrypted
        ebool isYes = FHE.eq(FHE.asEuint64(voteType), FHE.asEuint64(1));
        ebool isNo = FHE.eq(FHE.asEuint64(voteType), FHE.asEuint64(0));

        // ✅ CORRECT: Use FHE.select for conditional addition
        // If isYes is true, add weight to yesVotes; otherwise add zero
        // If isNo is true, add weight to noVotes; otherwise add zero
        bet.yesVotes = FHE.add(bet.yesVotes, FHE.select(isYes, weight, zero));
        bet.noVotes = FHE.add(bet.noVotes, FHE.select(isNo, weight, zero));

        // ✅ CORRECT: Grant permissions after FHE operations
        // allowThis: Contract can use these values in future operations
        FHE.allowThis(bet.yesVotes);
        FHE.allowThis(bet.noVotes);
        
        // ✅ CORRECT: Allow creator to decrypt (for user decryption if needed)
        FHE.allow(bet.yesVotes, bet.creator);
        FHE.allow(bet.noVotes, bet.creator);

        // Track participation
        hasVoted[betId][msg.sender] = true;
        userVoteType[betId][msg.sender] = voteType;
        // Note: We store 1 as weight since we can't access encrypted weight value
        // In production, you might use a fixed weight or track differently
        userVoteWeight[betId][msg.sender] = 1;
        bet.prizePool += msg.value;

        emit VoteCast(betId, msg.sender);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Tally Reveal (Two-step process)
    // ═══════════════════════════════════════════════════════════════════════
    //
    // Step 1: requestTallyReveal() - Makes handles publicly decryptable
    // Step 2: resolveTallyCallback() - Verifies proof and stores results
    //
    // ✅ DO: Use two-step reveal for security
    // ❌ DON'T: Try to decrypt directly in the contract (not supported)
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice Request tally reveal - makes handles publicly decryptable
    /// @param betId The bet to reveal
    ///
    /// @dev ✅ CORRECT: Only allow reveal after expiry
    ///      ✅ CORRECT: Use FHE.makePubliclyDecryptable for public reveals
    ///      ❌ WRONG: Revealing before expiry would allow vote manipulation
    function requestTallyReveal(string memory betId) external {
        BetInfo storage bet = bets[betId];
        require(bet.creator != address(0), "Bet doesn't exist");
        
        // ✅ CORRECT: Only reveal after betting period ends
        // ❌ WRONG: Allowing reveal before expiry leaks information
        require(block.timestamp >= bet.expiryTime, "Bet not expired");
        
        require(!bet.isResolved, "Already resolved");
        require(!bet.revealRequested, "Reveal already requested");
        
        // ✅ CORRECT: Only creator can request reveal
        require(msg.sender == bet.creator, "Only creator can request reveal");

        bet.revealRequested = true;

        // ✅ CORRECT: Make handles publicly decryptable
        // This allows anyone to decrypt using publicDecrypt
        // Safe because voting has ended
        bet.yesVotes = FHE.makePubliclyDecryptable(bet.yesVotes);
        bet.noVotes = FHE.makePubliclyDecryptable(bet.noVotes);

        // ✅ CORRECT: Emit handles for frontend/relayer
        // The relayer will decrypt and call resolveTallyCallback
        bytes32 yesHandle = FHE.toBytes32(bet.yesVotes);
        bytes32 noHandle = FHE.toBytes32(bet.noVotes);

        emit TallyRevealRequested(betId, yesHandle, noHandle);
    }

    /// @notice Callback to resolve bet with decrypted values
    /// @param betId The bet to resolve
    /// @param cleartexts ABI-encoded tuple of (uint64 yesVotes, uint64 noVotes)
    /// @param decryptionProof The decryption proof from the relayer
    ///
    /// @dev ✅ CORRECT: Always verify decryption proofs
    ///      ❌ WRONG: Trusting cleartexts without verification
    function resolveTallyCallback(
        string memory betId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external {
        BetInfo storage bet = bets[betId];
        require(bet.creator != address(0), "Bet doesn't exist");
        require(bet.revealRequested, "Reveal not requested");
        require(!bet.isResolved, "Already resolved");

        // ✅ CORRECT: Prepare handles list for verification
        bytes32[] memory handlesList = new bytes32[](2);
        handlesList[0] = FHE.toBytes32(bet.yesVotes);
        handlesList[1] = FHE.toBytes32(bet.noVotes);

        // ✅ CORRECT: Verify the decryption proof
        // This ensures cleartexts match the actual encrypted values
        // ❌ WRONG: Skipping this check would allow result manipulation
        FHE.checkSignatures(handlesList, cleartexts, decryptionProof);

        // Decode the verified results
        (uint64 revealedYes, uint64 revealedNo) = abi.decode(cleartexts, (uint64, uint64));

        bet.revealedYes = revealedYes;
        bet.revealedNo = revealedNo;
        bet.isResolved = true;
        bet.yesWon = revealedYes > revealedNo;

        emit BetResolved(betId, bet.yesWon, revealedYes, revealedNo, bet.prizePool);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Prize Distribution
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice Claim prize for winning voters
    /// @dev Prize = (prizePool * userStake) / totalWinningWeight
    ///
    /// ✅ CORRECT: Use revealed (decrypted) values for calculations
    /// ❌ WRONG: Trying to use encrypted values for plaintext math
    function claimPrize(string memory betId) external {
        BetInfo storage bet = bets[betId];
        require(bet.isResolved, "Bet not resolved");
        require(!hasClaimed[betId][msg.sender], "Already claimed");
        require(hasVoted[betId][msg.sender], "Did not vote");
        require(bet.revealedYes != bet.revealedNo, "Tie, use claimRefund");

        // Check if caller is on the winning side
        bool isWinner = (bet.yesWon && userVoteType[betId][msg.sender] == 1) ||
                        (!bet.yesWon && userVoteType[betId][msg.sender] == 0);
        require(isWinner, "Not a winner");

        hasClaimed[betId][msg.sender] = true;
        
        // ✅ CORRECT: Calculate prize using revealed (plaintext) values
        // User's weight is their individual contribution to the winning tally
        uint256 userWeight = userVoteWeight[betId][msg.sender];
        uint256 totalWinningWeight = bet.yesWon ? bet.revealedYes : bet.revealedNo;
        require(totalWinningWeight > 0, "No winners");

        // Prize = (prizePool * userWeight) / totalWinningWeight
        uint256 prize = (bet.prizePool * userWeight) / totalWinningWeight;
        (bool sent, ) = payable(msg.sender).call{value: prize}("");
        require(sent, "Failed to send Ether");

        emit PrizeDistributed(betId, msg.sender, prize);
    }

    /// @notice Claim refund in case of a tie
    function claimRefund(string memory betId) external {
        BetInfo storage bet = bets[betId];
        require(bet.isResolved, "Bet not resolved");
        require(bet.revealedYes == bet.revealedNo, "Not a tie");
        require(hasVoted[betId][msg.sender], "Did not vote");
        require(!hasClaimed[betId][msg.sender], "Already claimed");

        hasClaimed[betId][msg.sender] = true;
        uint256 refund = bet.voteStake;
        (bool sent, ) = payable(msg.sender).call{value: refund}("");
        require(sent, "Failed to send Ether");

        emit RefundClaimed(betId, msg.sender, refund);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Test Helpers (only work when testing mode is enabled)
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice Mark a user as having voted (testing only)
    /// @param betId The bet ID
    /// @param voter The voter address
    /// @param voteType 0 = No, 1 = Yes
    /// @param weight The vote weight (default 1 for equal weighting)
    function testingMarkVoted(string memory betId, address voter, uint8 voteType, uint64 weight) external onlyOwner {
        require(isTesting, "Testing disabled");
        BetInfo storage bet = bets[betId];
        require(bet.creator != address(0), "Bet doesn't exist");
        hasVoted[betId][voter] = true;
        userVoteType[betId][voter] = voteType;
        userVoteWeight[betId][voter] = weight;
    }

    /// @notice Fund the prize pool (testing only)
    function testingFundPrizePool(string memory betId) external payable onlyOwner {
        require(isTesting, "Testing disabled");
        BetInfo storage bet = bets[betId];
        require(bet.creator != address(0), "Bet doesn't exist");
        bet.prizePool += msg.value;
    }

    /// @notice Resolve bet directly without decryption (testing only)
    function testingResolve(
        string memory betId,
        uint64 revealedYes,
        uint64 revealedNo
    ) external onlyOwner {
        require(isTesting, "Testing disabled");
        BetInfo storage bet = bets[betId];
        require(bet.creator != address(0), "Bet doesn't exist");
        bet.revealedYes = revealedYes;
        bet.revealedNo = revealedNo;
        bet.isResolved = true;
        bet.yesWon = revealedYes > revealedNo;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // View Functions
    // ═══════════════════════════════════════════════════════════════════════
    //
    // ✅ CORRECT: View functions CAN return encrypted handles
    // ✅ CORRECT: Only expose revealed values after resolution
    // ❌ WRONG: Exposing encrypted vote counts before reveal
    // ═══════════════════════════════════════════════════════════════════════

    /// @notice Get bet information
    /// @dev Returns revealed vote counts only after resolution (0 before)
    function getBet(string memory betId) external view returns (
        address creator,
        uint256 platformStakeAmount,
        uint256 voteStake,
        uint256 expiryTime,
        bool isResolved,
        uint64 yesVotes,
        uint64 noVotes,
        uint256 prizePool,
        bool yesWon
    ) {
        BetInfo storage bet = bets[betId];
        return (
            bet.creator,
            bet.platformStake,
            bet.voteStake,
            bet.expiryTime,
            bet.isResolved,
            // ✅ CORRECT: Only expose vote counts after resolution
            bet.isResolved ? bet.revealedYes : 0,
            bet.isResolved ? bet.revealedNo : 0,
            bet.prizePool,
            bet.yesWon
        );
    }

    /// @notice Get reveal status for a bet
    function getRevealStatus(string memory betId) external view returns (
        bool isResolved,
        bool revealRequested,
        uint64 revealedYes,
        uint64 revealedNo
    ) {
        BetInfo storage bet = bets[betId];
        return (
            bet.isResolved,
            bet.revealRequested,
            bet.revealedYes,
            bet.revealedNo
        );
    }

    /// @notice Check if user has claimed their prize/refund
    function hasUserClaimed(string memory betId, address user) external view returns (bool) {
        return hasClaimed[betId][user];
    }

    /// @notice Check if a reveal has been requested
    function isRevealRequested(string memory betId) external view returns (bool) {
        return bets[betId].revealRequested;
    }

    receive() external payable {}
}

```

{% endtab %}

{% tab title="BeliefMarket.ts" %}

```typescript
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { BeliefMarket, BeliefMarket__factory } from "../../types";
import { expect } from "chai";

/**
 * @chapter advanced
 * @title Belief Market Test Suite
 * @notice Tests for BeliefMarket contract demonstrating confidential prediction markets
 * @dev This test suite shows:
 *      - ✅ Bet creation with platform stake
 *      - ✅ Encrypted voting with weighted stakes
 *      - ✅ Tally reveal after expiry
 *      - ✅ Prize distribution to winners
 *      - ✅ Refunds on tie outcomes
 */

type Signers = {
  deployer: HardhatEthersSigner;
  creator: HardhatEthersSigner;
  voter1: HardhatEthersSigner;
  voter2: HardhatEthersSigner;
  voter3: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("BeliefMarket")) as BeliefMarket__factory;
  const contract = (await factory.deploy()) as BeliefMarket;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("BeliefMarket", function () {
  let signers: Signers;
  let contract: BeliefMarket;
  let contractAddress: string;

  const PLATFORM_STAKE = ethers.parseEther("0.02");
  const VOTE_STAKE = ethers.parseEther("0.005");
  const DURATION = 3600; // 1 hour

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      creator: ethSigners[1],
      voter1: ethSigners[2],
      voter2: ethSigners[3],
      voter3: ethSigners[4],
    };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());
  });

  describe("✅ Bet Creation", function () {
    it("should create a bet with correct parameters", async function () {
      await expect(
        contract.connect(signers.creator).createBet("bet1", VOTE_STAKE, DURATION, { value: PLATFORM_STAKE })
      ).to.emit(contract, "BetCreated");

      const bet = await contract.getBet("bet1");
      expect(bet.creator).to.eq(signers.creator.address);
      expect(bet.voteStake).to.eq(VOTE_STAKE);
      expect(bet.isResolved).to.be.false;
    });

    it("should fail with incorrect platform stake", async function () {
      await expect(
        contract.connect(signers.creator).createBet("bet1", VOTE_STAKE, DURATION, { 
          value: ethers.parseEther("0.01") // Wrong amount
        })
      ).to.be.revertedWith("Must stake the current platform fee");
    });

    it("should fail with vote stake too low", async function () {
      await expect(
        contract.connect(signers.creator).createBet("bet1", ethers.parseEther("0.001"), DURATION, { 
          value: PLATFORM_STAKE 
        })
      ).to.be.revertedWith("Vote stake too low");
    });

    it("should fail with invalid duration", async function () {
      await expect(
        contract.connect(signers.creator).createBet("bet1", VOTE_STAKE, 60, { value: PLATFORM_STAKE }) // Too short
      ).to.be.revertedWith("Invalid duration");
    });

    it("should fail if bet already exists", async function () {
      await contract.connect(signers.creator).createBet("bet1", VOTE_STAKE, DURATION, { value: PLATFORM_STAKE });
      
      await expect(
        contract.connect(signers.creator).createBet("bet1", VOTE_STAKE, DURATION, { value: PLATFORM_STAKE })
      ).to.be.revertedWith("Bet already exists");
    });
  });

  describe("✅ Voting", function () {
    const betId = "vote-test";

    beforeEach(async function () {
      await contract.connect(signers.creator).createBet(betId, VOTE_STAKE, DURATION, { value: PLATFORM_STAKE });
    });

    it("should allow voting YES", async function () {
      const weight = 1;
      const voteType = 1; // YES
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.voter1.address)
        .add64(weight)
        .encrypt();

      await expect(
        contract
          .connect(signers.voter1)
          .vote(betId, encrypted.handles[0], voteType, encrypted.inputProof, { value: VOTE_STAKE })
      ).to.emit(contract, "VoteCast");

      expect(await contract.hasVoted(betId, signers.voter1.address)).to.be.true;
    });

    it("should allow voting NO", async function () {
      const weight = 1;
      const voteType = 0; // NO
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.voter1.address)
        .add64(weight)
        .encrypt();

      await contract
        .connect(signers.voter1)
        .vote(betId, encrypted.handles[0], voteType, encrypted.inputProof, { value: VOTE_STAKE });

      expect(await contract.hasVoted(betId, signers.voter1.address)).to.be.true;
    });

    it("should prevent double voting", async function () {
      const weight = 1;
      const voteType = 1;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.voter1.address)
        .add64(weight)
        .encrypt();

      await contract
        .connect(signers.voter1)
        .vote(betId, encrypted.handles[0], voteType, encrypted.inputProof, { value: VOTE_STAKE });

      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, signers.voter1.address)
        .add64(weight)
        .encrypt();

      await expect(
        contract
          .connect(signers.voter1)
          .vote(betId, encrypted2.handles[0], voteType, encrypted2.inputProof, { value: VOTE_STAKE })
      ).to.be.revertedWith("Already voted");
    });

    it("should fail with incorrect vote stake", async function () {
      const weight = 1;
      const voteType = 1;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.voter1.address)
        .add64(weight)
        .encrypt();

      await expect(
        contract
          .connect(signers.voter1)
          .vote(betId, encrypted.handles[0], voteType, encrypted.inputProof, { value: ethers.parseEther("0.001") })
      ).to.be.revertedWith("Incorrect vote stake");
    });

    it("should allow multiple voters", async function () {
      // Voter 1 votes YES
      const encrypted1 = await fhevm
        .createEncryptedInput(contractAddress, signers.voter1.address)
        .add64(1)
        .encrypt();
      await contract
        .connect(signers.voter1)
        .vote(betId, encrypted1.handles[0], 1, encrypted1.inputProof, { value: VOTE_STAKE });

      // Voter 2 votes NO
      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, signers.voter2.address)
        .add64(1)
        .encrypt();
      await contract
        .connect(signers.voter2)
        .vote(betId, encrypted2.handles[0], 0, encrypted2.inputProof, { value: VOTE_STAKE });

      // Voter 3 votes YES
      const encrypted3 = await fhevm
        .createEncryptedInput(contractAddress, signers.voter3.address)
        .add64(1)
        .encrypt();
      await contract
        .connect(signers.voter3)
        .vote(betId, encrypted3.handles[0], 1, encrypted3.inputProof, { value: VOTE_STAKE });

      expect(await contract.hasVoted(betId, signers.voter1.address)).to.be.true;
      expect(await contract.hasVoted(betId, signers.voter2.address)).to.be.true;
      expect(await contract.hasVoted(betId, signers.voter3.address)).to.be.true;
    });
  });

  describe("✅ Reveal Status", function () {
    const betId = "reveal-test";

    beforeEach(async function () {
      await contract.connect(signers.creator).createBet(betId, VOTE_STAKE, DURATION, { value: PLATFORM_STAKE });
    });

    it("should return correct reveal status before reveal", async function () {
      const status = await contract.getRevealStatus(betId);
      expect(status.isResolved).to.be.false;
      expect(status.revealRequested).to.be.false;
    });
  });

  describe("✅ Testing Mode Resolution", function () {
    const betId = "test-resolve";

    beforeEach(async function () {
      // Enable testing mode
      await contract.connect(signers.deployer).setTesting(true);
      
      // Create bet
      await contract.connect(signers.creator).createBet(betId, VOTE_STAKE, DURATION, { value: PLATFORM_STAKE });
      
      // Mark voters with weight=1 each
      await contract.connect(signers.deployer).testingMarkVoted(betId, signers.voter1.address, 1, 1); // YES, weight=1
      await contract.connect(signers.deployer).testingMarkVoted(betId, signers.voter2.address, 0, 1); // NO, weight=1
      await contract.connect(signers.deployer).testingMarkVoted(betId, signers.voter3.address, 1, 1); // YES, weight=1
      
      // Fund prize pool
      await contract.connect(signers.deployer).testingFundPrizePool(betId, { value: VOTE_STAKE * 3n });
    });

    it("should resolve bet with YES winning", async function () {
      await contract.connect(signers.deployer).testingResolve(betId, 2, 1); // YES wins

      const bet = await contract.getBet(betId);
      expect(bet.isResolved).to.be.true;
      expect(bet.yesWon).to.be.true;
      expect(bet.yesVotes).to.eq(2);
      expect(bet.noVotes).to.eq(1);
    });

    it("should resolve bet with NO winning", async function () {
      await contract.connect(signers.deployer).testingResolve(betId, 1, 3); // NO wins

      const bet = await contract.getBet(betId);
      expect(bet.isResolved).to.be.true;
      expect(bet.yesWon).to.be.false;
    });

    it("should allow winners to claim prize", async function () {
      await contract.connect(signers.deployer).testingResolve(betId, 2, 1); // YES wins

      const balanceBefore = await ethers.provider.getBalance(signers.voter1.address);
      
      await expect(
        contract.connect(signers.voter1).claimPrize(betId)
      ).to.emit(contract, "PrizeDistributed");

      const balanceAfter = await ethers.provider.getBalance(signers.voter1.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("should prevent losers from claiming prize", async function () {
      await contract.connect(signers.deployer).testingResolve(betId, 2, 1); // YES wins

      await expect(
        contract.connect(signers.voter2).claimPrize(betId) // Voter2 voted NO
      ).to.be.revertedWith("Not a winner");
    });

    it("should prevent double claiming", async function () {
      await contract.connect(signers.deployer).testingResolve(betId, 2, 1); // YES wins

      await contract.connect(signers.voter1).claimPrize(betId);

      await expect(
        contract.connect(signers.voter1).claimPrize(betId)
      ).to.be.revertedWith("Already claimed");
    });
  });

  describe("✅ Tie Refunds", function () {
    const betId = "tie-test";

    beforeEach(async function () {
      await contract.connect(signers.deployer).setTesting(true);
      await contract.connect(signers.creator).createBet(betId, VOTE_STAKE, DURATION, { value: PLATFORM_STAKE });
      await contract.connect(signers.deployer).testingMarkVoted(betId, signers.voter1.address, 1, 1); // YES, weight=1
      await contract.connect(signers.deployer).testingMarkVoted(betId, signers.voter2.address, 0, 1); // NO, weight=1
      await contract.connect(signers.deployer).testingFundPrizePool(betId, { value: VOTE_STAKE * 2n });
    });

    it("should allow refund on tie", async function () {
      await contract.connect(signers.deployer).testingResolve(betId, 1, 1); // Tie

      await expect(
        contract.connect(signers.voter1).claimRefund(betId)
      ).to.emit(contract, "RefundClaimed");
    });

    it("should prevent prize claim on tie", async function () {
      await contract.connect(signers.deployer).testingResolve(betId, 1, 1); // Tie

      await expect(
        contract.connect(signers.voter1).claimPrize(betId)
      ).to.be.revertedWith("Tie, use claimRefund");
    });
  });

  describe("✅ Admin Functions", function () {
    it("should allow owner to withdraw platform fees", async function () {
      await contract.connect(signers.creator).createBet("admin-test", VOTE_STAKE, DURATION, { value: PLATFORM_STAKE });

      const balanceBefore = await ethers.provider.getBalance(signers.deployer.address);
      
      await expect(
        contract.connect(signers.deployer).withdrawPlatformFees(signers.deployer.address)
      ).to.emit(contract, "PlatformFeesWithdrawn");

      const balanceAfter = await ethers.provider.getBalance(signers.deployer.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("should allow owner to update platform stake", async function () {
      const newStake = ethers.parseEther("0.05");
      await contract.connect(signers.deployer).setPlatformStake(newStake);
      expect(await contract.platformStake()).to.eq(newStake);
    });

    it("should prevent non-owner from admin functions", async function () {
      await expect(
        contract.connect(signers.voter1).setPlatformStake(ethers.parseEther("0.1"))
      ).to.be.revertedWith("Not owner");
    });
  });

  // ❌ Common Pitfalls
  describe("❌ Error Cases", function () {
    it("should fail when voting on non-existent bet", async function () {
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.voter1.address)
        .add64(1)
        .encrypt();

      await expect(
        contract
          .connect(signers.voter1)
          .vote("non-existent", encrypted.handles[0], 1, encrypted.inputProof, { value: VOTE_STAKE })
      ).to.be.revertedWith("Bet doesn't exist");
    });

    it("should fail when claiming before resolution", async function () {
      await contract.connect(signers.creator).createBet("unresolved", VOTE_STAKE, DURATION, { value: PLATFORM_STAKE });

      await expect(
        contract.connect(signers.voter1).claimPrize("unresolved")
      ).to.be.revertedWith("Bet not resolved");
    });

    it("should fail when non-voter tries to claim", async function () {
      await contract.connect(signers.deployer).setTesting(true);
      await contract.connect(signers.creator).createBet("no-vote", VOTE_STAKE, DURATION, { value: PLATFORM_STAKE });
      await contract.connect(signers.deployer).testingResolve("no-vote", 1, 0);

      await expect(
        contract.connect(signers.voter1).claimPrize("no-vote")
      ).to.be.revertedWith("Did not vote");
    });
  });
});


```

{% endtab %}

{% endtabs %}
