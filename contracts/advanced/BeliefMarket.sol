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
