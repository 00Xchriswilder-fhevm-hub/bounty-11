# Simple Voting

<!-- chapter: advanced -->

## Overview

This example demonstrates public decryption with multiple encrypted values, allowing anyone to decrypt results without requiring individual user permissions and shows how to manage FHE permissions for both contracts and users.

## What You'll Learn

- **FHE.add operation** - How to perform this specific homomorphic operation on encrypted values
- **Off-chain encryption** - Encrypting values locally before sending to contract
- **FHE permissions** - Granting permissions for operations and decryption

## Key Concepts

### 1. FHE.add Operation

The `FHE.add()` function performs addition on encrypted values, computing the sum without ever decrypting the operands.

### 2. Off-Chain Encryption

Values are encrypted locally (on the client side) before being sent to the contract: plaintext values never appear in transactions, encryption is cryptographically bound to [contract, user] pair, and input proofs verify the binding.

### 3. FHE Permissions

Permissions control who can perform operations (contracts need `FHE.allowThis()`) and decrypt values (users need `FHE.allow()`).

## Step-by-Step Walkthrough

### Step 1: Set Encrypted Values

Encrypt your values off-chain and send them to the contract using `createSession()`.

### Step 2: Perform FHE.add Operation

Call the function that performs `FHE.add` (e.g., `vote()`).

## Common Pitfalls

### ❌ Pitfall 1: should fail to create session with zero duration

**The Problem:** await expect(
        contract.connect(signers.creator).createSession(0)
      ).to.be.revertedWith("Duration must be positive");...

**Why it fails:** The operation fails due to incorrect usage, permissions, or signer mismatch.

**The Fix:** Ensure proper setup, matching signers, and correct permissions.

### ❌ Pitfall 2: should fail to create session with zero duration

**The Problem:** await expect(
        contract.connect(signers.creator).createSession(0)
      ).to.be.reverted;...

**Why it fails:** The operation fails due to incorrect usage, permissions, or signer mismatch.

**The Fix:** Ensure proper setup, matching signers, and correct permissions.

### ❌ Pitfall 3: should fail when voting on non-existent session

**The Problem:** const nonExistentSessionId = 999n;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.voter1.address)...

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

{% tab title="SimpleVoting_uint32.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, externalEuint32, euint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract SimpleVoting_uint32 is ZamaEthereumConfig {
    struct Session {
        address creator;
        uint256 endTime;
        euint32 yesVotes;
        euint32 noVotes;
        bool resolved;
        uint32 revealedYes;
        uint32 revealedNo;
        bool revealRequested;
    }

    Session[] public sessions;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event SessionCreated(uint256 indexed sessionId, address indexed creator, uint256 endTime);
    event VoteCast(uint256 indexed sessionId, address indexed voter);
    event TallyRevealRequested(uint256 indexed sessionId, bytes32 yesVotesHandle, bytes32 noVotesHandle);
    event SessionResolved(uint256 indexed sessionId, uint32 yesVotes, uint32 noVotes);

    function createSession(uint256 durationSeconds) external {
        require(durationSeconds > 0, "Duration must be positive");
        Session memory s = Session({
            creator: msg.sender,
            endTime: block.timestamp + durationSeconds,
            yesVotes: FHE.asEuint32(0),
            noVotes: FHE.asEuint32(0),
            resolved: false,
            revealedYes: 0,
            revealedNo: 0,
            revealRequested: false
        });
        sessions.push(s);
        emit SessionCreated(sessions.length - 1, msg.sender, s.endTime);
    }

    // Pure YES/NO voting - encrypt the choice (0 or 1) directly
    function vote(
        uint256 sessionId,
        externalEuint32 encryptedVote,
        bytes calldata proof
    ) external {
        require(sessionId < sessions.length, "Invalid session");
        Session storage s = sessions[sessionId];
        require(block.timestamp < s.endTime, "Voting ended");
        require(!hasVoted[sessionId][msg.sender], "Already voted");

        euint32 v = FHE.fromExternal(encryptedVote, proof);
        euint32 yes = FHE.asEuint32(1);  // Yes = 1
        euint32 no = FHE.asEuint32(0);   // No = 0
        euint32 one = FHE.asEuint32(1);

        s.yesVotes = FHE.add(s.yesVotes, FHE.select(FHE.eq(v, yes), one, FHE.asEuint32(0)));
        s.noVotes = FHE.add(s.noVotes, FHE.select(FHE.eq(v, no), one, FHE.asEuint32(0)));

        FHE.allowThis(s.yesVotes);
        FHE.allowThis(s.noVotes);
        // Allow creator to decrypt ( with user decryption if he wishes)
        FHE.allow(s.yesVotes, s.creator);
        FHE.allow(s.noVotes, s.creator);

        hasVoted[sessionId][msg.sender] = true;
        emit VoteCast(sessionId, msg.sender);
    }

    /// @notice Request tally reveal - makes handles publicly decryptable and emits event
    /// @param sessionId The ID of the session to reveal
    function requestTallyReveal(uint256 sessionId) external {
        require(sessionId < sessions.length, "Invalid session");
        Session storage s = sessions[sessionId];
        require(block.timestamp >= s.endTime, "Voting not ended");
        require(!s.resolved, "Already resolved");
        require(!s.revealRequested, "Reveal already requested");
        require(msg.sender == s.creator, "Only creator can request reveal");

        // Mark as requested
        s.revealRequested = true;

        // Make handles publicly decryptable so we can use publicDecrypt to get proof
        // This is safe because voting has ended and only creator can request reveal
        s.yesVotes = FHE.makePubliclyDecryptable(s.yesVotes);
        s.noVotes = FHE.makePubliclyDecryptable(s.noVotes);

        // Emit event with handles - frontend will pick this up and decrypt
        bytes32 yesHandle = FHE.toBytes32(s.yesVotes);
        bytes32 noHandle = FHE.toBytes32(s.noVotes);
        
        emit TallyRevealRequested(sessionId, yesHandle, noHandle);
    }

    /// @notice Callback function for oracle/frontend to provide decrypted values
    /// @param sessionId The ID of the session to resolve
    /// @param cleartexts ABI-encoded tuple of (uint32 yesVotes, uint32 noVotes)
    /// @param decryptionProof The decryption proof from the relayer/oracle
    function resolveTallyCallback(
        uint256 sessionId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external {
        require(sessionId < sessions.length, "Invalid session");
        Session storage s = sessions[sessionId];
        require(s.revealRequested, "Reveal not requested");
        require(!s.resolved, "Already resolved");

        // Prepare handles list for verification
        bytes32[] memory handlesList = new bytes32[](2);
        handlesList[0] = FHE.toBytes32(s.yesVotes);
        handlesList[1] = FHE.toBytes32(s.noVotes);

        // Verify the decryption proof (reverts on failure)
        FHE.checkSignatures(handlesList, cleartexts, decryptionProof);

        // Decode the results
        (uint32 revealedYes, uint32 revealedNo) = abi.decode(cleartexts, (uint32, uint32));

        // Store the results
        s.revealedYes = revealedYes;
        s.revealedNo = revealedNo;
        s.resolved = true;
        emit SessionResolved(sessionId, revealedYes, revealedNo);
    }

    function getSessionCount() external view returns (uint256) {
        return sessions.length;
    }

    function getSession(uint256 sessionId) external view returns (
        address creator,
        uint256 endTime,
        bool resolved,
        uint32 yesVotes,
        uint32 noVotes
    ) {
        require(sessionId < sessions.length, "Invalid session");
        Session storage s = sessions[sessionId];
        return (
            s.creator,
            s.endTime,
            s.resolved,
            s.resolved ? s.revealedYes : 0,
            s.resolved ? s.revealedNo : 0
        );
    }
}

// Alias for easier usage in tests
contract SimpleVoting is SimpleVoting_uint32 {}
```

{% endtab %}

{% tab title="SimpleVoting.ts" %}

```typescript
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { SimpleVoting, SimpleVoting__factory } from "../../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

/**
 * @chapter advanced
 * @title Simple Voting Test Suite
 * @notice Tests for SimpleVoting contract demonstrating confidential voting
 * @dev This test suite shows:
 *      - ✅ Session creation
 *      - ✅ Encrypted voting
 *      - ✅ Tally reveal with public decryption
 *      - ✅ Vote counting
 */

type Signers = {
  deployer: HardhatEthersSigner;
  creator: HardhatEthersSigner;
  voter1: HardhatEthersSigner;
  voter2: HardhatEthersSigner;
  voter3: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("SimpleVoting")) as SimpleVoting__factory;
  const contract = (await factory.deploy()) as SimpleVoting;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("SimpleVoting", function () {
  let signers: Signers;
  let contract: SimpleVoting;
  let contractAddress: string;

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

  describe("✅ Session Creation", function () {
    it("should create a voting session", async function () {
      const duration = 3600; // 1 hour

      await expect(
        contract.connect(signers.creator).createSession(duration)
      ).to.emit(contract, "SessionCreated");

      const sessionCount = await contract.getSessionCount();
      expect(sessionCount).to.eq(1);
    });

    it("should fail to create session with zero duration", async function () {
      await expect(
        contract.connect(signers.creator).createSession(0)
      ).to.be.revertedWith("Duration must be positive");
    });
  });

  describe("✅ Voting", function () {
    let sessionId: bigint;

    beforeEach(async function () {
      await contract.connect(signers.creator).createSession(3600);
      sessionId = 0n;
    });

    it("should allow voting YES (1)", async function () {
      const vote = 1; // YES
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.voter1.address)
        .add32(vote)
        .encrypt();

      await expect(
        contract
          .connect(signers.voter1)
          .vote(sessionId, encrypted.handles[0], encrypted.inputProof)
      ).to.emit(contract, "VoteCast");

      expect(await contract.hasVoted(sessionId, signers.voter1.address)).to.be.true;
    });

    it("should allow voting NO (0)", async function () {
      const vote = 0; // NO
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.voter1.address)
        .add32(vote)
        .encrypt();

      await contract
        .connect(signers.voter1)
        .vote(sessionId, encrypted.handles[0], encrypted.inputProof);

      expect(await contract.hasVoted(sessionId, signers.voter1.address)).to.be.true;
    });

    it("should prevent double voting", async function () {
      const vote = 1;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.voter1.address)
        .add32(vote)
        .encrypt();

      await contract
        .connect(signers.voter1)
        .vote(sessionId, encrypted.handles[0], encrypted.inputProof);

      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, signers.voter1.address)
        .add32(vote)
        .encrypt();

      await expect(
        contract
          .connect(signers.voter1)
          .vote(sessionId, encrypted2.handles[0], encrypted2.inputProof)
      ).to.be.revertedWith("Already voted");
    });

    it("should allow multiple voters", async function () {
      // Voter 1 votes YES
      const encrypted1 = await fhevm
        .createEncryptedInput(contractAddress, signers.voter1.address)
        .add32(1)
        .encrypt();
      await contract
        .connect(signers.voter1)
        .vote(sessionId, encrypted1.handles[0], encrypted1.inputProof);

      // Voter 2 votes NO
      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, signers.voter2.address)
        .add32(0)
        .encrypt();
      await contract
        .connect(signers.voter2)
        .vote(sessionId, encrypted2.handles[0], encrypted2.inputProof);

      expect(await contract.hasVoted(sessionId, signers.voter1.address)).to.be.true;
      expect(await contract.hasVoted(sessionId, signers.voter2.address)).to.be.true;
    });
  });

  describe("✅ Session Info", function () {
    it("should return session information", async function () {
      await contract.connect(signers.creator).createSession(3600);
      const sessionId = 0n;

      const session = await contract.getSession(sessionId);
      expect(session.creator).to.eq(signers.creator.address);
      expect(session.resolved).to.be.false;
    });
  });

  // ❌ Common Pitfalls
  describe("❌ Error Cases", function () {
    it("should fail to create session with zero duration", async function () {
      await expect(
        contract.connect(signers.creator).createSession(0)
      ).to.be.reverted;
    });

    it("should fail when voting on non-existent session", async function () {
      const nonExistentSessionId = 999n;
      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.voter1.address)
        .add32(1)
        .encrypt();
      
      await expect(
        contract
          .connect(signers.voter1)
          .vote(nonExistentSessionId, encrypted.handles[0], encrypted.inputProof)
      ).to.be.reverted;
    });

    it("should fail when voting twice on same session", async function () {
      await contract.connect(signers.creator).createSession(3600);
      const sessionId = 0n;

      const encrypted = await fhevm
        .createEncryptedInput(contractAddress, signers.voter1.address)
        .add32(1)
        .encrypt();
      
      // First vote should succeed
      await contract
        .connect(signers.voter1)
        .vote(sessionId, encrypted.handles[0], encrypted.inputProof);

      // Second vote should fail
      await expect(
        contract
          .connect(signers.voter1)
          .vote(sessionId, encrypted.handles[0], encrypted.inputProof)
      ).to.be.reverted;
    });
  });
});


```

{% endtab %}

{% endtabs %}
