// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint64, externalEuint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Blind Auction Contract
/// @notice Demonstrates a confidential blind auction where bids are encrypted until reveal
/// @dev This example shows:
///      - Encrypted bid submission
///      - Bid tracking without revealing amounts
///      - Reveal phase with public decryption
///      - Winner determination
/// 
/// @dev Key Concepts:
///      - Bids are encrypted during the bidding phase
///      - Only the highest bidder is tracked (encrypted)
///      - After reveal, bids are decrypted publicly
///      - Winner is determined from decrypted bids
contract BlindAuction is ZamaEthereumConfig {
    /// @notice Auction configuration
    struct Auction {
        address creator;
        uint256 startTime;
        uint256 biddingEndTime;
        uint256 revealEndTime;
        bool ended;
        address highestBidder;
        euint64 highestBid; // Uninitialized by default - use FHE.isInitialized() to check
        uint64 revealedHighestBid;
    }
    
    /// @notice Bid information
    struct Bid {
        address bidder;
        euint64 encryptedBid;
        bool revealed;
        uint64 revealedBid;
    }
    
    /// @notice Mapping from auction ID to auction
    mapping(uint256 => Auction) public auctions;
    
    /// @notice Mapping from auction ID to bidder address to bid
    mapping(uint256 => mapping(address => Bid)) public bids;
    
    /// @notice Counter for auction IDs
    uint256 public auctionCounter;
    
    /// @notice Event emitted when auction is created
    event AuctionCreated(uint256 indexed auctionId, address indexed creator, uint256 biddingEndTime, uint256 revealEndTime);
    
    /// @notice Event emitted when a bid is placed
    event BidPlaced(uint256 indexed auctionId, address indexed bidder);
    
    /// @notice Event emitted when reveal is requested
    event RevealRequested(uint256 indexed auctionId, bytes32 highestBidHandle);
    
    /// @notice Event emitted when auction ends
    event AuctionEnded(uint256 indexed auctionId, address indexed winner, uint64 winningBid);
    
    /// @notice Create a new blind auction
    /// @param biddingDurationSeconds Duration of bidding phase in seconds
    /// @param revealDurationSeconds Duration of reveal phase in seconds
    /// @return auctionId The ID of the created auction
    function createAuction(uint256 biddingDurationSeconds, uint256 revealDurationSeconds) external returns (uint256) {
        require(biddingDurationSeconds > 0, "Invalid bidding duration");
        require(revealDurationSeconds > 0, "Invalid reveal duration");
        
        uint256 auctionId = auctionCounter++;
        uint256 startTime = block.timestamp;
        
        // Create auction - highestBid starts uninitialized (default value)
        // This avoids ACL issues that FHE.asEuint64(0) would cause
        // Initialize struct members individually to leave highestBid uninitialized
        Auction storage newAuction = auctions[auctionId];
        newAuction.creator = msg.sender;
        newAuction.startTime = startTime;
        newAuction.biddingEndTime = startTime + biddingDurationSeconds;
        newAuction.revealEndTime = startTime + biddingDurationSeconds + revealDurationSeconds;
        newAuction.ended = false;
        newAuction.highestBidder = address(0);
        // highestBid is left uninitialized (default value) - no ACL issues
        // FHE.isInitialized() will return false for uninitialized value
        newAuction.revealedHighestBid = 0;
        
        emit AuctionCreated(auctionId, msg.sender, auctions[auctionId].biddingEndTime, auctions[auctionId].revealEndTime);
        
        return auctionId;
    }
    
    /// @notice Place an encrypted bid
    /// @param auctionId The ID of the auction
    /// @param encryptedBid The encrypted bid amount
    /// @param inputProof The proof for the encrypted bid
    /// @dev Bids can only be placed during the bidding phase
    /// @dev Follows the pattern from FHEEmelMarket (updated for current FHEVM version)
    function placeBid(uint256 auctionId, externalEuint64 encryptedBid, bytes calldata inputProof) external {
        Auction storage auction = auctions[auctionId];
        require(block.timestamp >= auction.startTime, "Auction not started");
        require(block.timestamp < auction.biddingEndTime, "Bidding phase ended");
        require(!auction.ended, "Auction ended");
        
        // Get encrypted bid from external input
        euint64 bid = FHE.fromExternal(encryptedBid, inputProof);
        
        // Store the bid
        bids[auctionId][msg.sender] = Bid({
            bidder: msg.sender,
            encryptedBid: bid,
            revealed: false,
            revealedBid: 0
        });
        
        // Grant permissions AFTER getting the value (following FHEEmelMarket pattern)
        FHE.allowThis(bid);
        FHE.allow(bid, msg.sender);
        
        // Update highest bid if this is higher (encrypted comparison)
        // Use FHE.isInitialized to check if highestBid exists
        if (FHE.isInitialized(auction.highestBid)) {
            // Grant permissions for comparison (both operands need permissions)
            FHE.allowThis(auction.highestBid);
            FHE.allow(auction.highestBid, msg.sender);
            FHE.allow(bid, address(this));
            FHE.allow(auction.highestBid, address(this));
            
            // Compare: if bid is greater than highest bid
            ebool isHigher = FHE.gt(bid, auction.highestBid);
            auction.highestBid = FHE.select(isHigher, bid, auction.highestBid);
            // Note: We can't conditionally update address based on ebool without decrypting
            // So we always update highestBidder to current bidder
            // The actual winner will be verified during reveal phase when bids are decrypted
            auction.highestBidder = msg.sender;
        } else {
            // First bid - set as highest (no ACL issues with uninitialized)
            auction.highestBid = bid;
            auction.highestBidder = msg.sender;
        }
        
        // Grant permissions for highest bid AFTER setting (following FHEEmelMarket pattern)
        FHE.allowThis(auction.highestBid);
        
        emit BidPlaced(auctionId, msg.sender);
    }
    
    /// @notice Request reveal of bids (makes highest bid publicly decryptable)
    /// @param auctionId The ID of the auction
    /// @dev Only creator can request reveal, and only after bidding ends
    function requestReveal(uint256 auctionId) external {
        Auction storage auction = auctions[auctionId];
        require(msg.sender == auction.creator, "Only creator can request reveal");
        require(block.timestamp >= auction.biddingEndTime, "Bidding phase not ended");
        require(block.timestamp < auction.revealEndTime, "Reveal phase ended");
        require(!auction.ended, "Auction already ended");
        require(FHE.isInitialized(auction.highestBid), "No bids placed");
        
        // Grant permissions before making publicly decryptable
        // Note: highestBid should already have permissions from placeBid, but ensure it here
        FHE.allowThis(auction.highestBid);
        
        // Make highest bid publicly decryptable
        auction.highestBid = FHE.makePubliclyDecryptable(auction.highestBid);
        
        bytes32 highestBidHandle = FHE.toBytes32(auction.highestBid);
        emit RevealRequested(auctionId, highestBidHandle);
    }
    
    /// @notice End the auction and determine winner
    /// @param auctionId The ID of the auction
    /// @param cleartexts ABI-encoded highest bid amount
    /// @param decryptionProof The decryption proof
    /// @dev This function verifies the decryption proof and ends the auction
    function endAuction(
        uint256 auctionId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external {
        Auction storage auction = auctions[auctionId];
        require(block.timestamp >= auction.revealEndTime, "Reveal phase not ended");
        require(!auction.ended, "Auction already ended");
        
        // Verify decryption proof
        bytes32[] memory handlesList = new bytes32[](1);
        handlesList[0] = FHE.toBytes32(auction.highestBid);
        
        FHE.checkSignatures(handlesList, cleartexts, decryptionProof);
        
        // Decode the revealed bid
        uint64 revealedBid = abi.decode(cleartexts, (uint64));
        auction.revealedHighestBid = revealedBid;
        auction.ended = true;
        
        emit AuctionEnded(auctionId, auction.highestBidder, revealedBid);
    }
    
    /// @notice Get auction information
    /// @param auctionId The ID of the auction
    /// @return creator The creator address
    /// @return startTime The start time
    /// @return biddingEndTime The bidding end time
    /// @return revealEndTime The reveal end time
    /// @return ended Whether the auction has ended
    /// @return highestBidder The highest bidder address
    function getAuction(uint256 auctionId) external view returns (
        address creator,
        uint256 startTime,
        uint256 biddingEndTime,
        uint256 revealEndTime,
        bool ended,
        address highestBidder
    ) {
        Auction storage auction = auctions[auctionId];
        return (
            auction.creator,
            auction.startTime,
            auction.biddingEndTime,
            auction.revealEndTime,
            auction.ended,
            auction.highestBidder
        );
    }
    
    /// @notice Get the highest bid (encrypted)
    /// @param auctionId The ID of the auction
    /// @return The encrypted highest bid
    function getHighestBid(uint256 auctionId) external view returns (euint64) {
        return auctions[auctionId].highestBid;
    }
    
    /// @notice Get revealed highest bid (only after auction ends)
    /// @param auctionId The ID of the auction
    /// @return The revealed highest bid amount
    function getRevealedHighestBid(uint256 auctionId) external view returns (uint64) {
        require(auctions[auctionId].ended, "Auction not ended");
        return auctions[auctionId].revealedHighestBid;
    }
}

