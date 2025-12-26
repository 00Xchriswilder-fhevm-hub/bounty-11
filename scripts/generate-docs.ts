#!/usr/bin/env ts-node

/**
 * generate-docs - Generates GitBook-formatted documentation from contracts and tests
 *
 * Usage: ts-node scripts/generate-docs.ts <example-name> [options]
 *
 * Example: ts-node scripts/generate-docs.ts fhe-counter --output examples/
 */

import * as fs from 'fs';
import * as path from 'path';

// Color codes for terminal output
enum Color {
  Reset = '\x1b[0m',
  Green = '\x1b[32m',
  Blue = '\x1b[34m',
  Yellow = '\x1b[33m',
  Red = '\x1b[31m',
  Cyan = '\x1b[36m',
}

function log(message: string, color: Color = Color.Reset): void {
  console.log(`${color}${message}${Color.Reset}`);
}

function success(message: string): void {
  log(`✅ ${message}`, Color.Green);
}

function info(message: string): void {
  log(`ℹ️  ${message}`, Color.Blue);
}

function error(message: string): never {
  log(`❌ Error: ${message}`, Color.Red);
  process.exit(1);
}

// Documentation configuration interface
interface DocsConfig {
  title: string;
  description: string;
  contract: string;
  test: string;
  output: string;
  category: string;
  chapter?: string; // Chapter tag for GitBook organization (e.g., "access-control", "relayer")
}

// Generate documentation options
interface GenerateDocsOptions {
  noSummary?: boolean;
}

// Example configurations
const EXAMPLES_CONFIG: Record<string, DocsConfig> = {
  // Basic Examples
  'fhe-counter': {
    title: 'FHE Counter',
    description: 'This example demonstrates how to build a confidential counter using FHEVM.',
    contract: 'contracts/basic/FHECounter.sol',
    test: 'test/basic/FHECounter.ts',
    output: 'docs/fhe-counter.md',
    category: 'Basic',
  },
  'encrypt-single-value': {
    title: 'Encrypt Single Value',
    description: 'This example demonstrates the FHE encryption mechanism and highlights a common pitfall developers may encounter.',
    contract: 'contracts/basic/encrypt/EncryptSingleValue.sol',
    test: 'test/basic/encrypt/EncryptSingleValue.ts',
    output: 'docs/fhe-encrypt-single-value.md',
    category: 'Basic - Encryption',
  },
  'encrypt-multiple-values': {
    title: 'Encrypt Multiple Values',
    description: 'This example shows how to encrypt and handle multiple values in a single transaction.',
    contract: 'contracts/basic/encrypt/EncryptMultipleValues.sol',
    test: 'test/basic/encrypt/EncryptMultipleValues.ts',
    output: 'docs/fhe-encrypt-multiple-values.md',
    category: 'Basic - Encryption',
  },
  'user-decrypt-single-value': {
    title: 'User Decrypt Single Value',
    description: 'This example demonstrates the FHE user decryption mechanism and highlights common pitfalls developers may encounter.',
    contract: 'contracts/basic/decrypt/UserDecryptSingleValue.sol',
    test: 'test/basic/decrypt/UserDecryptSingleValue.ts',
    output: 'docs/fhe-user-decrypt-single-value.md',
    category: 'Basic - Decryption',
  },
  'user-decrypt-multiple-values': {
    title: 'User Decrypt Multiple Values',
    description: 'This example shows how to decrypt multiple encrypted values for a user.',
    contract: 'contracts/basic/decrypt/UserDecryptMultipleValues.sol',
    test: 'test/basic/decrypt/UserDecryptMultipleValues.ts',
    output: 'docs/fhe-user-decrypt-multiple-values.md',
    category: 'Basic - Decryption',
  },
  'public-decrypt-single-value': {
    title: 'Public Decrypt Single Value',
    description: 'This example demonstrates public decryption mechanism.',
    contract: 'contracts/basic/decrypt/PublicDecryptSingleValue.sol',
    test: 'test/basic/decrypt/PublicDecryptSingleValue.ts',
    output: 'docs/fhe-public-decrypt-single-value.md',
    category: 'Basic - Decryption',
  },
  'public-decrypt-multiple-values': {
    title: 'Public Decrypt Multiple Values',
    description: 'This example shows public decryption with multiple values.',
    contract: 'contracts/basic/decrypt/PublicDecryptMultipleValues.sol',
    test: 'test/basic/decrypt/PublicDecryptMultipleValues.ts',
    output: 'docs/fhe-public-decrypt-multiple-values.md',
    category: 'Basic - Decryption',
  },
  'fhe-add': {
    title: 'FHE Add Operation',
    description: 'This example demonstrates how to perform addition operations on encrypted values.',
    contract: 'contracts/basic/fhe-operations/FHEAdd.sol',
    test: 'test/basic/fhe-operations/FHEAdd.ts',
    output: 'docs/fheadd.md',
    category: 'Basic - FHE Operations',
  },
  'fhe-if-then-else': {
    title: 'FHE If-Then-Else',
    description: 'This example shows conditional operations on encrypted values using FHE.',
    contract: 'contracts/basic/fhe-operations/FHEIfThenElse.sol',
    test: 'test/basic/fhe-operations/FHEIfThenElse.ts',
    output: 'docs/fheifthenelse.md',
    category: 'Basic - FHE Operations',
  },
  'fhe-min': {
    title: 'FHE Min Operation',
    description: 'This example demonstrates FHE.min operation to find minimum of two encrypted values.',
    contract: 'contracts/basic/fhe-operations/FHEMin.sol',
    test: 'test/basic/fhe-operations/FHEMin.ts',
    output: 'docs/fhe-min.md',
    category: 'Basic - FHE Operations',
  },
  'fhe-mul': {
    title: 'FHE Mul Operation',
    description: 'This example demonstrates FHE.mul operation to multiply two encrypted values.',
    contract: 'contracts/basic/fhe-operations/FHEMul.sol',
    test: 'test/basic/fhe-operations/FHEMul.ts',
    output: 'docs/fhe-mul.md',
    category: 'Basic - FHE Operations',
  },
  'fhe-xor': {
    title: 'FHE Xor Operation',
    description: 'This example demonstrates FHE.xor operation for bitwise XOR on encrypted values.',
    contract: 'contracts/basic/fhe-operations/FHEXor.sol',
    test: 'test/basic/fhe-operations/FHEXor.ts',
    output: 'docs/fhe-xor.md',
    category: 'Basic - FHE Operations',
  },
  'fhe-div': {
    title: 'FHE Div Operation',
    description: 'This example demonstrates FHE.div operation to divide two encrypted values.',
    contract: 'contracts/basic/fhe-operations/FHEDiv.sol',
    test: 'test/basic/fhe-operations/FHEDiv.ts',
    output: 'docs/fhe-div.md',
    category: 'Basic - FHE Operations',
  },
  'fhe-bitwise': {
    title: 'FHE Bitwise Operations',
    description: 'This example demonstrates FHE.and, FHE.or, and FHE.not operations.',
    contract: 'contracts/basic/fhe-operations/FHEBitwise.sol',
    test: 'test/basic/fhe-operations/FHEBitwise.ts',
    output: 'docs/fhe-bitwise.md',
    category: 'Basic - FHE Operations',
  },
  'fhe-sub': {
    title: 'FHE Sub Operation',
    description: 'This example demonstrates the FHE.sub operation to subtract two encrypted values. The subtraction is performed homomorphically without decrypting either operand. Note: No underflow protection in FHE - ensure the first operand is greater than or equal to the second in production.',
    contract: 'contracts/basic/fhe-operations/FHESub.sol',
    test: 'test/basic/fhe-operations/FHESub.ts',
    output: 'docs/fhe-sub.md',
    category: 'Basic - FHE Operations',
  },
  'fhe-rem': {
    title: 'FHE Rem Operation',
    description: 'This example demonstrates the FHE.rem operation to compute the remainder (modulo) of an encrypted value divided by a plaintext modulus. Note: The modulus must be a plaintext value, not encrypted.',
    contract: 'contracts/basic/fhe-operations/FHERem.sol',
    test: 'test/basic/fhe-operations/FHERem.ts',
    output: 'docs/fhe-rem.md',
    category: 'Basic - FHE Operations',
  },
  'fhe-max': {
    title: 'FHE Max Operation',
    description: 'This example demonstrates the FHE.max operation to find the maximum of two encrypted values. The comparison is performed homomorphically and returns the larger value without revealing either input.',
    contract: 'contracts/basic/fhe-operations/FHEMax.sol',
    test: 'test/basic/fhe-operations/FHEMax.ts',
    output: 'docs/fhe-max.md',
    category: 'Basic - FHE Operations',
  },
  'fhe-comparison': {
    title: 'FHE Comparison Operations',
    description: 'This example demonstrates all FHE comparison operations on encrypted integers. Compare encrypted values without decrypting them using FHE.eq (equal), FHE.ne (not equal), FHE.gt (greater than), FHE.lt (less than), FHE.ge (greater or equal), FHE.le (less or equal), and FHE.select for conditional branching. Comparison results are returned as encrypted booleans (ebool).',
    contract: 'contracts/basic/fhe-operations/FHEComparison.sol',
    test: 'test/basic/fhe-operations/FHEComparison.ts',
    output: 'docs/fhe-comparison.md',
    category: 'Basic - FHE Operations',
  },
  // Access Control Examples
  'access-control': {
    title: 'Access Control',
    description: 'Demonstrates FHE access control using FHE.allow() and FHE.allowThis(). Shows how to grant permissions to contracts and users.',
    contract: 'contracts/access-control/AccessControl.sol',
    test: 'test/access-control/AccessControl.ts',
    output: 'docs/access-control.md',
    category: 'Access Control',
  },
  'allow-transient': {
    title: 'Allow Transient',
    description: 'Demonstrates FHE.allowTransient() for temporary permissions. Shows when to use transient vs permanent permissions.',
    contract: 'contracts/access-control/AllowTransient.sol',
    test: 'test/access-control/AllowTransient.ts',
    output: 'docs/allow-transient.md',
    category: 'Access Control',
  },
  'permission-examples': {
    title: 'Permission Examples',
    description: 'Various FHE permission scenarios and patterns. Demonstrates permission inheritance and common patterns.',
    contract: 'contracts/access-control/PermissionExamples.sol',
    test: 'test/access-control/PermissionExamples.ts',
    output: 'docs/permission-examples.md',
    category: 'Access Control',
  },
  // Input Proof Examples
  'input-proof-basics': {
    title: 'Input Proof Basics',
    description: 'Explains what input proofs are and why they are needed. Demonstrates the relationship between encryption and proofs.',
    contract: 'contracts/input-proofs/InputProofBasics.sol',
    test: 'test/input-proofs/InputProofBasics.ts',
    output: 'docs/input-proof-basics.md',
    category: 'Input Proofs',
  },
  'input-proof-usage': {
    title: 'Input Proof Usage',
    description: 'Demonstrates correct usage of input proofs. Shows matching encryption signer with transaction signer.',
    contract: 'contracts/input-proofs/InputProofUsage.sol',
    test: 'test/input-proofs/InputProofUsage.ts',
    output: 'docs/input-proof-usage.md',
    category: 'Input Proofs',
  },
  'input-proof-anti-patterns': {
    title: 'Input Proof Anti-Patterns',
    description: 'Common mistakes with input proofs and how to avoid them. Shows what happens with invalid proofs.',
    contract: 'contracts/input-proofs/InputProofAntiPatterns.sol',
    test: 'test/input-proofs/InputProofAntiPatterns.ts',
    output: 'docs/input-proof-anti-patterns.md',
    category: 'Input Proofs',
  },
  'handle-lifecycle': {
    title: 'Handle Lifecycle',
    description: 'Understanding how handles are generated and their lifecycle. Demonstrates symbolic execution.',
    contract: 'contracts/input-proofs/HandleLifecycle.sol',
    test: 'test/input-proofs/HandleLifecycle.ts',
    output: 'docs/handle-lifecycle.md',
    category: 'Input Proofs',
  },
  // Anti-Pattern Examples
  'fhe-permissions-anti-patterns': {
    title: 'FHE Permissions Anti-Patterns',
    description: 'This example demonstrates common FHE permission anti-patterns that developers encounter. Learn what happens when you forget FHE.allowThis() after computation, when you miss FHE.allow(user) preventing decryption, when view functions return handles without proper permissions, and when transfers fail to propagate permissions to recipients. Each anti-pattern shows the WRONG way and the CORRECT fix.',
    contract: 'contracts/anti-patterns/FHEPermissionsAntiPatterns.sol',
    test: 'test/anti-patterns/FHEPermissionsAntiPatterns.ts',
    output: 'docs/fhe-permissions-anti-patterns.md',
    category: 'Anti-Patterns',
  },
  'missing-allow-this': {
    title: 'Missing AllowThis',
    description: 'What happens when FHE.allowThis() permission is missing. Demonstrates why both permissions are needed.',
    contract: 'contracts/anti-patterns/MissingAllowThis.sol',
    test: 'test/anti-patterns/MissingAllowThis.ts',
    output: 'docs/missing-allow-this.md',
    category: 'Anti-Patterns',
  },
  'handle-misuse': {
    title: 'Handle Misuse',
    description: 'Incorrect handle usage patterns and correct alternatives. Shows why handles are contract-specific.',
    contract: 'contracts/anti-patterns/HandleMisuse.sol',
    test: 'test/anti-patterns/HandleMisuse.ts',
    output: 'docs/handle-misuse.md',
    category: 'Anti-Patterns',
  },
  // OpenZeppelin Examples
  'erc7984-example': {
    title: 'ERC7984 Example',
    description: 'Basic ERC7984 confidential token implementation. Demonstrates minting, burning, and confidential transfers.',
    contract: 'contracts/openzeppelin/ERC7984Mock.sol',
    test: 'test/openzeppelin/ERC7984Example.ts',
    output: 'docs/erc7984-example.md',
    category: 'OpenZeppelin',
  },
  'erc7984-to-erc20-wrapper': {
    title: 'ERC7984 to ERC20 Wrapper',
    description: 'Wraps ERC20 tokens into ERC7984 confidential tokens. Allows confidential operations on standard tokens.',
    contract: 'contracts/openzeppelin/ERC7984ToERC20Wrapper.sol',
    test: 'test/openzeppelin/ERC7984ToERC20Wrapper.ts',
    output: 'docs/erc7984-to-erc20-wrapper.md',
    category: 'OpenZeppelin',
  },
  'swap-erc7984-to-erc20': {
    title: 'Swap ERC7984 to ERC20',
    description: 'Swaps ERC7984 confidential tokens to ERC20 tokens. Demonstrates two-phase swap pattern with public decryption.',
    contract: 'contracts/openzeppelin/SwapERC7984ToERC20.sol',
    test: 'test/openzeppelin/SwapERC7984ToERC20.ts',
    output: 'docs/swap-erc7984-to-erc20.md',
    category: 'OpenZeppelin',
  },
  'swap-erc7984-to-erc7984': {
    title: 'Swap ERC7984 to ERC7984',
    description: 'Swaps between two ERC7984 confidential tokens. Demonstrates confidential-to-confidential transfers.',
    contract: 'contracts/openzeppelin/SwapERC7984ToERC7984.sol',
    test: 'test/openzeppelin/SwapERC7984ToERC7984.ts',
    output: 'docs/swap-erc7984-to-erc7984.md',
    category: 'OpenZeppelin',
  },
  'vesting-wallet': {
    title: 'Vesting Wallet',
    description: 'Confidential vesting wallet for ERC7984 tokens. Demonstrates time-based vesting with encrypted amounts.',
    contract: 'contracts/openzeppelin/VestingWallet.sol',
    test: 'test/openzeppelin/VestingWallet.ts',
    output: 'docs/vesting-wallet.md',
    category: 'OpenZeppelin',
  },
  'vesting-wallet-confidential': {
    title: 'Vesting Wallet Confidential',
    description: 'OpenZeppelin VestingWalletConfidential factory for creating confidential token vesting wallets.',
    contract: 'contracts/openzeppelin/VestingWalletConfidentialFactoryMock.sol',
    test: 'test/openzeppelin/VestingWalletConfidential.ts',
    output: 'docs/vesting-wallet-confidential.md',
    category: 'OpenZeppelin',
  },
  'vesting-wallet-cliff-confidential': {
    title: 'Vesting Wallet Cliff Confidential',
    description: 'OpenZeppelin VestingWalletCliffConfidential factory with cliff period for confidential tokens.',
    contract: 'contracts/openzeppelin/VestingWalletCliffConfidentialFactoryMock.sol',
    test: 'test/openzeppelin/VestingWalletCliffConfidential.ts',
    output: 'docs/vesting-wallet-cliff-confidential.md',
    category: 'OpenZeppelin',
  },
  'erc7984-rwa': {
    title: 'ERC7984 RWA',
    description: 'Demonstrates ERC7984 RWA (Real World Assets) with compliance features: pause, freeze, block users, and force transfers',
    contract: 'contracts/openzeppelin/ERC7984RwaMock.sol',
    test: 'test/openzeppelin/ERC7984RwaExample.ts',
    output: 'docs/erc7984-rwa.md',
    category: 'OpenZeppelin',
  },
  'erc7984-omnibus': {
    title: 'ERC7984 Omnibus',
    description: 'Demonstrates ERC7984Omnibus for omnibus transfers with encrypted sub-account addresses. This example shows how to implement the omnibus pattern where multiple sub-accounts are tracked off-chain, while onchain settlement occurs between omnibus accounts. Sub-account sender and recipient addresses are encrypted in events for privacy, and ACL permissions are automatically granted to omnibus accounts.',
    contract: 'contracts/openzeppelin/ERC7984OmnibusMock.sol',
    test: 'test/openzeppelin/ERC7984OmnibusExample.ts',
    output: 'docs/erc7984-omnibus.md',
    category: 'OpenZeppelin',
  },
  'confidential-voting': {
    title: 'Confidential Voting',
    description: 'OpenZeppelin ERC7984Votes for confidential governance. Demonstrates voting power tracking, delegation, and historical vote queries.',
    contract: 'contracts/openzeppelin/ERC7984VotesMock.sol',
    test: 'test/openzeppelin/ERC7984VotesExample.ts',
    output: 'docs/confidential-voting.md',
    category: 'OpenZeppelin',
  },
  // Advanced Examples
  'fhe-legacy-vault': {
    title: 'FHE Legacy Vault',
    description: 'Secure vault system with time-locked access using FHEVM and IPFS. Demonstrates access control patterns.',
    contract: 'contracts/advanced/FHELegacyVault.sol',
    test: 'test/advanced/FHELegacyVault.ts',
    output: 'docs/fhe-legacy-vault.md',
    category: 'Advanced',
  },
  'simple-voting': {
    title: 'Simple Voting',
    description: 'Confidential voting system with encrypted votes and public decryption for tallies.',
    contract: 'contracts/advanced/SimpleVoting.sol',
    test: 'test/advanced/SimpleVoting.ts',
    output: 'docs/simple-voting.md',
    category: 'Advanced',
  },
  'review-cards-fhe': {
    title: 'Review Cards FHE',
    description: 'Review and rating system with encrypted ratings and public decryption for averages.',
    contract: 'contracts/advanced/ReviewCardsFHE.sol',
    test: 'test/advanced/ReviewCardsFHE.ts',
    output: 'docs/review-cards-fhe.md',
    category: 'Advanced',
  },
  'blind-auction': {
    title: 'Blind Auction',
    description: 'Confidential blind auction where bids are encrypted until reveal phase, demonstrating encrypted bid submission and public decryption.',
    contract: 'contracts/advanced/BlindAuction.sol',
    test: 'test/advanced/BlindAuction.ts',
    output: 'docs/blind-auction.md',
    category: 'Advanced',
    chapter: 'advanced',
  },
  'confidential-portfolio-rebalancer': {
    title: 'Confidential Portfolio Rebalancer',
    description: 'Advanced portfolio management system with automatic rebalancing using multiple ERC7984 tokens, encrypted calculations, and complex FHE operations including add, mul, div, and comparisons.',
    contract: 'contracts/advanced/ConfidentialPortfolioRebalancer.sol',
    test: 'test/advanced/ConfidentialPortfolioRebalancer.ts',
    output: 'docs/confidential-portfolio-rebalancer.md',
    category: 'Advanced',
    chapter: 'advanced',
  },
  'confidential-lending-pool': {
    title: 'Confidential Lending Pool',
    description: 'Confidential lending system with encrypted collateral, debt tracking, interest calculations, and liquidation logic using complex FHE operations including add, mul, div, and comparisons.',
    contract: 'contracts/advanced/ConfidentialLendingPool.sol',
    test: 'test/advanced/ConfidentialLendingPool.ts',
    output: 'docs/confidential-lending-pool.md',
    category: 'Advanced',
    chapter: 'advanced',
  },
  'confidential-yield-aggregator': {
    title: 'Confidential Yield Aggregator',
    description: 'Confidential yield aggregation system with multiple strategies, encrypted yield calculations, allocation management, rebalancing based on encrypted yields, and compounding with encrypted values using complex FHE operations.',
    contract: 'contracts/advanced/ConfidentialYieldAggregator.sol',
    test: 'test/advanced/ConfidentialYieldAggregator.ts',
    output: 'docs/confidential-yield-aggregator.md',
    category: 'Advanced',
    chapter: 'advanced',
  },
};

function readFile(filePath: string): string {
  const rootDir = path.resolve(__dirname, '..');
  const fullPath = path.join(rootDir, filePath);
  if (!fs.existsSync(fullPath)) {
    error(`File not found: ${filePath}`);
  }
  return fs.readFileSync(fullPath, 'utf-8');
}

function getContractName(content: string): string {
  const match = content.match(/^\s*contract\s+(\w+)(?:\s+is\s+|\s*\{)/m);
  return match ? match[1] : 'Contract';
}

function extractDescription(content: string): string {
  // Build comprehensive description from multiple sources in contract comments
  const parts: string[] = [];
  
  // Helper to clean comment lines
  const cleanLine = (line: string): string => {
    return line
      .replace(/^\s*\*\s*/, '')           // Remove leading * and spaces
      .replace(/^\/\/\/\s*/, '')          // Remove leading ///
      .replace(/^-\s*/, '')                // Remove leading -
      .replace(/^\s*[-•]\s*/, '')          // Remove leading bullet points
      .trim();
  };
  
  // 1. Extract @notice (main description) - but only if it's substantial
  const noticeMatch = content.match(/@notice\s+(.+?)(?:\n|$)/);
  if (noticeMatch) {
    const notice = noticeMatch[1].trim();
    // Only add if it's substantial (not just a short tagline)
    if (notice && notice.length > 30) {
      parts.push(notice);
    }
  }
  
  // 2. Extract "This contract demonstrates" or "This example shows" section from @dev
  const demonstratesMatch = content.match(/@dev\s+This\s+(?:contract\s+)?(?:demonstrates|shows):[\s\S]*?(?=@dev|@notice|@param|@return|Key Concepts|Educational Notes|$)/i);
  if (demonstratesMatch) {
    const demoLines = demonstratesMatch[0]
      .replace(/@dev\s+This\s+(?:contract\s+)?(?:demonstrates|shows):\s*/i, '')
      .split('\n')
      .map(cleanLine)
      .filter(line => {
        // Filter out empty lines, tags, and comment markers
        return line && 
               line.length > 5 && 
               !line.match(/^(@dev|@notice|@param|@return)/) && 
               !line.startsWith('///') &&
               !line.startsWith('*') &&
               !line.match(/^[{}();]/);
      })
      .slice(0, 5) // Take first 5 bullet points
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(line => line.length > 10);
    
    if (demoLines.length > 0) {
      // Format as a natural sentence - capitalize first letter, lowercase rest
      const demoText = demoLines
        .map((line, idx) => {
          const cleaned = line.charAt(0).toLowerCase() + line.slice(1);
          return idx === 0 ? cleaned : cleaned;
        })
        .join(', ');
      
      if (demoText && demoText.length > 20) {
        parts.push(`This example shows how to ${demoText}.`);
      }
    }
  }
  
  // 3. Extract key pattern/concept from @dev "Key Concepts" (first meaningful concept)
  const keyConceptsMatch = content.match(/@dev\s+Key\s+Concepts:[\s\S]*?(?=@dev|@notice|Educational Notes|$)/i);
  if (keyConceptsMatch) {
    const conceptLines = keyConceptsMatch[0]
      .replace(/@dev\s+Key\s+Concepts:\s*/i, '')
      .split('\n')
      .map(cleanLine)
      .filter(line => {
        return line && 
               line.length > 20 && 
               !line.match(/^(@dev|@notice)/) && 
               !line.startsWith('///') &&
               !line.match(/^[{}();]/);
      });
    
    if (conceptLines.length > 0) {
      // Find first meaningful concept (not just a name, but a description)
      const firstConcept = conceptLines.find(line => 
        line.length > 30 && 
        line.match(/[a-z]/) && 
        (line.includes(':') || line.match(/[a-z]{3,}/))
      ) || conceptLines[0];
      
      if (firstConcept && firstConcept.length > 30) {
        parts.push(firstConcept);
      }
    }
  }
  
  // 4. Extract pattern description from Educational Notes
  const educationalMatch = content.match(/@dev\s+Educational\s+Notes:[\s\S]*?(?=@dev|@notice|Key Concepts|$)/i);
  if (educationalMatch) {
    const eduLines = educationalMatch[0]
      .replace(/@dev\s+Educational\s+Notes:\s*/i, '')
      .split('\n')
      .map(cleanLine)
      .filter(line => {
        return line && 
               line.length > 30 && 
               !line.match(/^(@dev|@notice)/) && 
               !line.startsWith('///') &&
               !line.match(/^[{}();]/);
      });
    
    if (eduLines.length > 0) {
      parts.push(eduLines[0]);
    }
  }
  
  // 5. If we don't have enough parts, analyze the contract code to generate description
  // Always try to enhance with code analysis for more comprehensive descriptions
  const codeAnalysis = analyzeContractCode(content);
  if (codeAnalysis.length > 0) {
    // If we have parts from comments, add code analysis to enhance
    if (parts.length > 0) {
      // Only add if it provides additional information
      const partsText = parts.join(' ').toLowerCase();
      const analysisLower = codeAnalysis.toLowerCase();
      // Check if code analysis adds new information
      const hasNewInfo = !partsText.includes(analysisLower.substring(0, 30)) && 
                         !analysisLower.includes(partsText.substring(0, 30));
      if (hasNewInfo) {
        parts.push(codeAnalysis);
      }
    } else {
      // Use code analysis as the base if no comments found
      parts.push(codeAnalysis);
    }
  }
  
  // Combine parts into comprehensive description
  if (parts.length > 0) {
    // Join with proper punctuation, avoiding duplicates and fixing grammar
    let description = parts[0];
    
    // Fix common issues in first part
    description = description.replace(/\s+/g, ' ').trim();
    
    for (let i = 1; i < parts.length; i++) {
      // Skip if this part is too similar to what we already have
      const currentPart = parts[i].trim();
      
      // Check for significant overlap (avoid duplicates)
      const descLower = description.toLowerCase();
      const partLower = currentPart.toLowerCase();
      if (descLower.includes(partLower.substring(0, Math.min(40, partLower.length))) ||
          partLower.includes(descLower.substring(0, Math.min(40, descLower.length)))) {
        continue;
      }
      
      // Fix duplicate "how to" or "to to"
      let cleanedPart = currentPart;
      if (description.toLowerCase().includes('how to') && cleanedPart.toLowerCase().startsWith('how to')) {
        cleanedPart = cleanedPart.replace(/^how to\s+/i, '');
      }
      if (description.toLowerCase().includes(' to ') && cleanedPart.toLowerCase().startsWith('to ')) {
        cleanedPart = cleanedPart.replace(/^to\s+/i, '');
      }
      
      // Add period if not present, then add next part
      if (!description.endsWith('.') && !description.endsWith('!') && !description.endsWith('?')) {
        description += '.';
      }
      description += ' ' + cleanedPart;
    }
    
    // Clean up any remaining issues
    description = description
      .replace(/\s+/g, ' ')           // Multiple spaces to single
      .replace(/\s*\.\s*\./g, '.')    // Multiple periods
      .replace(/\s*,\s*,/g, ',')      // Multiple commas
      .replace(/\s+how to how to/gi, ' how to')  // Fix duplicate "how to"
      .replace(/\s+to to\s+/gi, ' to ')          // Fix duplicate "to to"
      .trim();
    
    // Ensure ends with period
    if (!description.endsWith('.') && !description.endsWith('!') && !description.endsWith('?')) {
      description += '.';
    }
    
    return description;
  }
  
  // Fallback to simple extraction
  const commentMatch = content.match(/\/\*\*\s*\n\s*\*\s*(.+?)\s*\n/);
  return commentMatch ? commentMatch[1].trim() : '';
}

// Analyze contract code to generate description when comments are minimal
function analyzeContractCode(content: string): string {
  const analysis: string[] = [];
  
  // Extract contract name
  const contractMatch = content.match(/contract\s+(\w+)/);
  const contractName = contractMatch ? contractMatch[1] : 'contract';
  
  // Detect FHE operations used
  const fheOps: string[] = [];
  const fheOpPatterns = [
    { pattern: /FHE\.min\(/g, name: 'FHE.min', desc: 'finding the minimum of two encrypted values' },
    { pattern: /FHE\.max\(/g, name: 'FHE.max', desc: 'finding the maximum of two encrypted values' },
    { pattern: /FHE\.add\(/g, name: 'FHE.add', desc: 'adding encrypted values' },
    { pattern: /FHE\.sub\(/g, name: 'FHE.sub', desc: 'subtracting encrypted values' },
    { pattern: /FHE\.mul\(/g, name: 'FHE.mul', desc: 'multiplying encrypted values' },
    { pattern: /FHE\.div\(/g, name: 'FHE.div', desc: 'dividing encrypted values' },
    { pattern: /FHE\.rem\(/g, name: 'FHE.rem', desc: 'remainder/modulo operations' },
    { pattern: /FHE\.xor\(/g, name: 'FHE.xor', desc: 'bitwise XOR operations' },
    { pattern: /FHE\.and\(/g, name: 'FHE.and', desc: 'bitwise AND operations' },
    { pattern: /FHE\.or\(/g, name: 'FHE.or', desc: 'bitwise OR operations' },
    { pattern: /FHE\.select\(/g, name: 'FHE.select', desc: 'conditional selection' },
    { pattern: /FHE\.fromExternal\(/g, name: 'FHE.fromExternal', desc: 'converting external encrypted inputs' },
    { pattern: /FHE\.decrypt\(/g, name: 'FHE.decrypt', desc: 'decrypting values' },
    { pattern: /FHE\.publicDecrypt\(/g, name: 'FHE.publicDecrypt', desc: 'public decryption' },
  ];
  
  for (const op of fheOpPatterns) {
    if (content.match(op.pattern)) {
      fheOps.push(op.desc);
    }
  }
  
  // Detect specific patterns and use cases
  if (content.includes('makePubliclyDecryptable') || content.includes('publicDecrypt')) {
    if (content.includes('multiple') || content.includes('array') || content.includes('[]')) {
      analysis.push('This example demonstrates public decryption with multiple encrypted values, allowing anyone to decrypt results without requiring individual user permissions');
    } else {
      analysis.push('This example demonstrates public decryption, allowing anyone to decrypt encrypted values without requiring individual user permissions');
    }
  } else if (content.includes('mapping') && content.includes('auction')) {
    analysis.push('This example implements a confidential auction mechanism where bids are encrypted during the bidding phase');
  } else if (content.includes('ERC7984')) {
    if (content.includes('Omnibus')) {
      analysis.push('This example demonstrates the omnibus pattern for confidential token transfers with encrypted sub-account addresses');
    } else if (content.includes('Votes') || content.includes('Voting')) {
      analysis.push('This example implements confidential voting with encrypted vote tracking and delegation');
    } else {
      analysis.push('This example demonstrates confidential token operations with encrypted balances and transfers');
    }
  } else if (content.includes('VestingWallet') || content.includes('vesting')) {
    analysis.push('This example implements confidential token vesting with encrypted amounts and time-based release');
  } else if (content.includes('encrypt') && !content.includes('decrypt') && content.includes('externalEuint')) {
    if (content.includes('multiple') || content.includes('array')) {
      analysis.push('This example demonstrates encrypting and handling multiple values in a single transaction using external encrypted inputs with input proofs for verification');
    } else {
      analysis.push('This example demonstrates the FHE encryption mechanism, showing how to convert external encrypted inputs to internal encrypted values using input proofs');
    }
  } else if (fheOps.length > 0) {
    const opsDesc = fheOps.slice(0, 3).join(', ');
    analysis.push(`This example demonstrates ${opsDesc} using Fully Homomorphic Encryption`);
  } else if (content.includes('increment') || content.includes('decrement') || content.includes('counter')) {
    analysis.push('This example demonstrates building a confidential counter that stores and manipulates encrypted values');
  } else if (content.includes('encrypt') && content.includes('decrypt')) {
    analysis.push('This example demonstrates the complete encryption and decryption workflow for confidential data');
  }
  
  // Detect additional features
  if (content.includes('FHE.allowThis') && content.includes('FHE.allow')) {
    analysis.push('and shows how to manage FHE permissions for both contracts and users');
  }
  
  if (content.includes('externalEuint') && content.includes('inputProof')) {
    analysis.push('using external encrypted inputs with input proofs for verification');
  }
  
  return analysis.join(' ');
}

function extractChapterTag(content: string): string | undefined {
  // Look for chapter tag in comments: @chapter access-control, chapter: relayer, etc.
  // Supports hyphenated tags like "access-control"
  const patterns = [
    /@chapter\s+([\w-]+)/i,
    /chapter:\s*([\w-]+)/i,
    /chapter\s*=\s*["']?([\w-]+)["']?/i,
  ];
  
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1].toLowerCase();
    }
  }
  
  return undefined;
}

// Helper function to extract example-specific operation
function extractMainOperation(contractContent: string): string | null {
  const operations = [
    { pattern: /FHE\.min\(/g, name: 'FHE.min', description: 'finding the minimum of two encrypted values' },
    { pattern: /FHE\.max\(/g, name: 'FHE.max', description: 'finding the maximum of two encrypted values' },
    { pattern: /FHE\.add\(/g, name: 'FHE.add', description: 'adding encrypted values' },
    { pattern: /FHE\.sub\(/g, name: 'FHE.sub', description: 'subtracting encrypted values' },
    { pattern: /FHE\.mul\(/g, name: 'FHE.mul', description: 'multiplying encrypted values' },
    { pattern: /FHE\.div\(/g, name: 'FHE.div', description: 'dividing encrypted values' },
    { pattern: /FHE\.xor\(/g, name: 'FHE.xor', description: 'bitwise XOR on encrypted values' },
    { pattern: /FHE\.and\(/g, name: 'FHE.and', description: 'bitwise AND on encrypted values' },
    { pattern: /FHE\.or\(/g, name: 'FHE.or', description: 'bitwise OR on encrypted values' },
    { pattern: /FHE\.not\(/g, name: 'FHE.not', description: 'bitwise NOT on encrypted values' },
    { pattern: /FHE\.select\(/g, name: 'FHE.select', description: 'conditional selection (if-then-else) on encrypted values' },
    { pattern: /FHE\.rem\(/g, name: 'FHE.rem', description: 'remainder/modulo operation on encrypted values' },
    { pattern: /FHE\.ge\(/g, name: 'FHE.ge', description: 'greater-than-or-equal comparison' },
    { pattern: /FHE\.gt\(/g, name: 'FHE.gt', description: 'greater-than comparison' },
    { pattern: /FHE\.le\(/g, name: 'FHE.le', description: 'less-than-or-equal comparison' },
    { pattern: /FHE\.lt\(/g, name: 'FHE.lt', description: 'less-than comparison' },
    { pattern: /FHE\.eq\(/g, name: 'FHE.eq', description: 'equality comparison' },
  ];
  
  for (const op of operations) {
    if (contractContent.match(op.pattern)) {
      return op.name;
    }
  }
  
  return null;
}

// Helper function to extract "What You'll Learn" from contract comments
function extractWhatYoullLearn(contractContent: string): string[] {
  const learnItems: string[] = [];
  
  // Helper to clean comment lines
  const cleanLine = (line: string): string => {
    return line
      .replace(/^\s*\*\s*/, '')           // Remove leading * and spaces
      .replace(/^\/\/\/\s*/, '')          // Remove leading ///
      .replace(/^-\s*/, '')                // Remove leading -
      .replace(/^\s*[-•]\s*/, '')          // Remove leading bullet points
      .trim();
  };
  
  // Extract from @dev "This contract demonstrates:" section
  // Match multiline pattern - look for lines with /// and dashes
  const demonstratesMatch = contractContent.match(/@dev\s+This\s+(?:contract\s+)?(?:demonstrates|shows):([\s\S]*?)(?=\/\/\/\s*@dev\s+(?:Key Concepts|Educational Notes)|@dev\s+(?:Key Concepts|Educational Notes)|$)/i);
  if (demonstratesMatch) {
    const demoSection = demonstratesMatch[1];
    // Split by lines and extract bullet points (lines with /// and -)
    const lines = demoSection.split('\n');
    
    lines.forEach(line => {
      // Look for lines like: ///      - Multiple yield strategies...
      const bulletMatch = line.match(/\/\/\/\s*-\s*(.+)/);
      if (bulletMatch) {
        const item = bulletMatch[1].trim();
        if (item.length > 15 && !item.toLowerCase().includes('complex fhe operations')) {
          // Capitalize first letter
          const formatted = item.charAt(0).toUpperCase() + item.slice(1);
          // Format as learning item - use the full text as description
          // Extract a short concept name from the beginning
          const words = formatted.split(/\s+/);
          if (words.length >= 4) {
            // Use first 2-3 words as concept name, rest as description
            const conceptWords = words.slice(0, 3).join(' ');
            const description = words.slice(3).join(' ');
            learnItems.push(`**${conceptWords}** - ${description}`);
          } else if (words.length >= 2) {
            // For shorter items, use first word as concept, rest as description
            const conceptWord = words[0];
            const description = words.slice(1).join(' ');
            learnItems.push(`**${conceptWord}** - ${description}`);
          } else {
            learnItems.push(`**${formatted}**`);
          }
        }
      }
    });
  }
  
  // If we didn't get enough items, fall back to detecting FHE operations
  if (learnItems.length < 2) {
    const mainOp = extractMainOperation(contractContent);
    if (mainOp && !learnItems.some(item => item.includes(mainOp))) {
      learnItems.push(`**${mainOp} operation** - How to perform this specific homomorphic operation on encrypted values`);
    }
    
    if (contractContent.includes('FHE.fromExternal') && !learnItems.some(item => item.includes('encryption'))) {
      learnItems.push('**Off-chain encryption** - Encrypting values locally before sending to contract');
    }
    
    if ((contractContent.includes('FHE.allowThis') || contractContent.includes('FHE.allow')) && 
        !learnItems.some(item => item.includes('permission'))) {
      learnItems.push('**FHE permissions** - Granting permissions for operations and decryption');
    }
  }
  
  return learnItems;
}

// Helper function to extract key concepts from contract comments
function extractKeyConceptsFromComments(contractContent: string): Array<{ title: string; description: string }> {
  const concepts: Array<{ title: string; description: string }> = [];
  
  // Helper to clean comment lines
  const cleanLine = (line: string): string => {
    return line
      .replace(/^\s*\*\s*/, '')           // Remove leading * and spaces
      .replace(/^\/\/\/\s*/, '')          // Remove leading ///
      .replace(/^-\s*/, '')                // Remove leading -
      .replace(/^\s*[-•]\s*/, '')          // Remove leading bullet points
      .trim();
  };
  
  // Extract from @dev "Key Concepts:" section
  // Match multiline pattern - look for lines with /// and dashes
  const keyConceptsMatch = contractContent.match(/@dev\s+Key\s+Concepts:([\s\S]*?)(?=\/\/\/\s*@dev\s+Educational|@dev\s+Educational|$)/i);
  if (keyConceptsMatch) {
    const conceptSection = keyConceptsMatch[1];
    const lines = conceptSection.split('\n');
    
    lines.forEach((line) => {
      // Look for lines like: ///      - Strategy: A yield-generating mechanism...
      const bulletMatch = line.match(/\/\/\/\s*-\s*(.+)/);
      if (bulletMatch) {
        const item = bulletMatch[1].trim();
        if (item.length > 15) {
          // Parse format: "Concept Name: Description"
          const colonIndex = item.indexOf(':');
          if (colonIndex > 0) {
            const title = item.substring(0, colonIndex).trim();
            const description = item.substring(colonIndex + 1).trim();
            if (title.length > 3 && description.length > 10) {
              concepts.push({ title, description });
            }
          } else {
            // If no colon, use first word as title, rest as description
            const words = item.split(/\s+/);
            if (words.length > 2) {
              const title = words[0];
              const description = words.slice(1).join(' ');
              concepts.push({ title, description });
            } else {
              concepts.push({ title: item, description: item });
            }
          }
        }
      }
    });
  }
  
  // If we didn't get concepts from comments, fall back to generic based on operations
  if (concepts.length === 0) {
    const mainOp = extractMainOperation(contractContent);
    if (mainOp) {
      const opDescriptions: Record<string, string> = {
        'FHE.min': 'The `FHE.min()` function compares two encrypted values and returns the smaller one, all without decrypting either value.',
        'FHE.max': 'The `FHE.max()` function compares two encrypted values and returns the larger one, all without decrypting either value.',
        'FHE.add': 'The `FHE.add()` function performs addition on encrypted values, computing the sum without ever decrypting the operands.',
        'FHE.sub': 'The `FHE.sub()` function performs subtraction on encrypted values, computing the difference without decrypting.',
        'FHE.mul': 'The `FHE.mul()` function performs multiplication on encrypted values, computing the product without decrypting.',
        'FHE.div': 'The `FHE.div()` function performs division on encrypted values, computing the quotient without decrypting.',
        'FHE.rem': 'The `FHE.rem()` function computes the remainder (modulo) of an encrypted value divided by a plaintext modulus.',
      };
      concepts.push({
        title: `${mainOp} Operation`,
        description: opDescriptions[mainOp] || `The ${mainOp} function performs operations on encrypted values without decrypting them.`
      });
    }
    
    if (contractContent.includes('FHE.fromExternal')) {
      concepts.push({
        title: 'Off-Chain Encryption',
        description: 'Values are encrypted locally (on the client side) before being sent to the contract: plaintext values never appear in transactions, encryption is cryptographically bound to [contract, user] pair, and input proofs verify the binding.'
      });
    }
    
    if (contractContent.includes('FHE.allowThis') || contractContent.includes('FHE.allow')) {
      concepts.push({
        title: 'FHE Permissions',
        description: 'Permissions control who can perform operations (contracts need `FHE.allowThis()`) and decrypt values (users need `FHE.allow()`).'
      });
    }
  }
  
  return concepts;
}

// Helper function to extract key concepts from contract code - example-specific (fallback)
function extractKeyConcepts(contractContent: string, testContent: string, config: DocsConfig): string[] {
  // First try to extract from contract comments
  const learnItems = extractWhatYoullLearn(contractContent);
  if (learnItems.length > 0) {
    return learnItems;
  }
  
  // Fallback to old logic if no comments found
  const concepts: string[] = [];
  const mainOp = extractMainOperation(contractContent);
  
  if (mainOp) {
    concepts.push(`**${mainOp} operation** - How to perform this specific homomorphic operation on encrypted values`);
  }
  
  if (contractContent.includes('FHE.fromExternal') || testContent.includes('createEncryptedInput')) {
    concepts.push('**Off-chain encryption** - Encrypting values locally before sending to contract');
  }
  
  if (contractContent.includes('FHE.allowThis') || contractContent.includes('FHE.allow')) {
    concepts.push('**FHE permissions** - Granting permissions for operations and decryption');
  }
  
  return concepts;
}

// Helper function to extract pitfalls from test content
function extractPitfalls(testContent: string): Array<{ title: string; description: string }> {
  const pitfalls: Array<{ title: string; description: string }> = [];
  
  // Look for pitfall test descriptions - improved regex to capture full test body
  const pitfallMatches = testContent.matchAll(/it\(["']([^"']+)["'][\s\S]*?\{([\s\S]*?)(?=\n\s*(?:it\(|describe\(|}))/g);
  for (const match of pitfallMatches) {
    const title = match[1];
    const body = match[2] || '';
    
    // Only include tests that mention failure or pitfalls
    if (title.toLowerCase().includes('fail') || title.toLowerCase().includes('pitfall') || 
        title.toLowerCase().includes('wrong') || title.toLowerCase().includes('error') ||
        title.toLowerCase().includes('should not')) {
      // Extract comment description if present
      const commentMatch = body.match(/\/\/\s*(.+?)(?:\n|$)/);
      const description = commentMatch ? commentMatch[1].trim() : 
                         (body.length > 100 ? body.substring(0, 150).trim() + '...' : body.trim());
      
      pitfalls.push({
        title: title,
        description: description || title
      });
    }
  }
  
  // Also check for describe blocks with "Common Pitfalls" or "Error Cases"
  const pitfallDescribeMatches = testContent.matchAll(/describe\(["']([^"']*(?:Pitfall|Error|fail)[^"']*)["'][\s\S]*?\{([\s\S]*?)(?=\n\s*(?:describe\(|}))/gi);
  for (const match of pitfallDescribeMatches) {
    const describeTitle = match[1];
    const describeBody = match[2] || '';
    
    // Extract individual tests from the describe block
    const testMatches = describeBody.matchAll(/it\(["']([^"']+)["'][\s\S]*?\{([\s\S]*?)(?=\n\s*(?:it\(|describe\(|}))/g);
    for (const testMatch of testMatches) {
      const testTitle = testMatch[1];
      const testBody = testMatch[2] || '';
      const commentMatch = testBody.match(/\/\/\s*(.+?)(?:\n|$)/);
      const description = commentMatch ? commentMatch[1].trim() : testTitle;
      
      pitfalls.push({
        title: testTitle,
        description: description
      });
    }
  }
  
  return pitfalls;
}

// Helper function to generate comprehensive documentation sections
function generateComprehensiveSections(
  config: DocsConfig,
  contractContent: string,
  testContent: string,
  contractName: string
): string {
  let sections = '';
  
  // Overview section - use enhanced extraction, fallback to config description
  sections += `## Overview\n\n`;
  const extractedDescription = extractDescription(contractContent);
  
  // Check if config description is specific (contains FHE operation names or permission functions)
  const configHasSpecificOps = /FHE\.(eq|ne|gt|lt|ge|le|select|add|sub|mul|div|rem|min|max|xor|and|or|not|allowThis|allow|allowTransient)/i.test(config.description);
  
  // Always prefer extracted description if it's substantial (has multiple parts or is comprehensive)
  // UNLESS config has specific FHE operations mentioned (indicating a curated description)
  // Consider it substantial if it has multiple sentences, is longer than 80 chars, or has multiple clauses
  const isExtractedSubstantial = !configHasSpecificOps && extractedDescription && (
    extractedDescription.length > 80 ||
    (extractedDescription.match(/\./g) || []).length >= 2 ||
    extractedDescription.includes(',') && extractedDescription.length > 60 ||
    extractedDescription.includes('and') && extractedDescription.length > 70
  );
  
  // If extracted is not substantial or config has specific ops, use config description
  let overviewDescription: string;
  if (configHasSpecificOps) {
    // Use config description when it's specific
    overviewDescription = config.description;
  } else if (isExtractedSubstantial) {
    overviewDescription = extractedDescription;
  } else {
    // Enhance config description with code analysis for more comprehensive overview
    const codeAnalysis = analyzeContractCode(contractContent);
    if (codeAnalysis.length > 0) {
      const configLower = config.description.toLowerCase();
      const analysisLower = codeAnalysis.toLowerCase();
      // Check if code analysis adds new information (not already covered in config)
      const hasNewInfo = !configLower.includes(analysisLower.substring(0, Math.min(40, analysisLower.length))) &&
                         !analysisLower.includes(configLower.substring(0, Math.min(40, configLower.length)));
      
      if (hasNewInfo) {
        // Combine config description with code analysis for comprehensive overview
        overviewDescription = `${config.description} ${codeAnalysis}`;
        // Clean up any duplicate words at the boundary
        overviewDescription = overviewDescription
          .replace(/\s+/g, ' ')
          .replace(/\s*\.\s*\./g, '.')
          .replace(/\s*,\s*,/g, ',')
          .trim();
        // Ensure ends with period
        if (!overviewDescription.endsWith('.') && !overviewDescription.endsWith('!') && !overviewDescription.endsWith('?')) {
          overviewDescription += '.';
        }
      } else {
        // Use config if code analysis doesn't add value, but ensure it's comprehensive
        overviewDescription = config.description;
      }
    } else {
      overviewDescription = config.description;
    }
  }
  
  sections += `${overviewDescription}\n\n`;
  
  // What You'll Learn section - extract from contract comments
  sections += `## What You'll Learn\n\n`;
  
  // Special handling for anti-pattern contracts
  const isAntiPattern = config.category.toLowerCase().includes('anti-pattern') || 
                        config.title.toLowerCase().includes('anti-pattern');
  
  if (isAntiPattern && config.title.includes('Permissions')) {
    // Custom learn items for FHE Permissions Anti-Patterns
    sections += `- **Missing allowThis()** - What happens when you forget to grant contract permission after FHE operations\n`;
    sections += `- **Missing allow(user)** - Why users can't decrypt values without explicit permission\n`;
    sections += `- **View function permissions** - View functions CAN return handles, but users need permission to decrypt\n`;
    sections += `- **Transfer permission propagation** - Why recipients can't use transferred balances without permission grants\n`;
    sections += `- **Cross-contract delegation** - Using allowTransient for temporary access in cross-contract calls\n`;
  } else {
    const learnItems = extractWhatYoullLearn(contractContent);
    if (learnItems.length > 0) {
      learnItems.forEach(item => {
        sections += `- ${item}\n`;
      });
    } else {
      // Fallback to old method if no comments found
      const keyConcepts = extractKeyConcepts(contractContent, testContent, config);
      if (keyConcepts.length > 0) {
        keyConcepts.forEach(concept => {
          sections += `- ${concept}\n`;
        });
      }
    }
  }
  sections += `\n`;
  
  // Key Concepts section - extract from contract comments
  const keyConceptsFromComments = extractKeyConceptsFromComments(contractContent);
  const mainOp = extractMainOperation(contractContent); // Define mainOp here for use later
  let conceptNum = 1;
  
  sections += `## Key Concepts\n\n`;
  
  // Special handling for FHE Permissions Anti-Patterns
  if (isAntiPattern && config.title.includes('Permissions')) {
    sections += `### 1. FHE.allowThis() Permission\n\n`;
    sections += `After any FHE computation that produces a new encrypted value, the contract must call \`FHE.allowThis(value)\` to grant itself permission to use that value in future operations. Without this, the contract loses access to its own computed values.\n\n`;
    
    sections += `### 2. FHE.allow(user) Permission\n\n`;
    sections += `For users to decrypt encrypted values, they must be explicitly granted permission via \`FHE.allow(value, userAddress)\`. Without this, even if the value is stored correctly, no one can decrypt it.\n\n`;
    
    sections += `### 3. View Functions and Encrypted Handles\n\n`;
    sections += `**Important clarification**: View functions CAN return encrypted handles (euint32, ebool, etc.). This is explicitly supported in FHEVM. However, the caller must have been granted permission to decrypt the handle. The common misconception is that view functions can't return encrypted values - they can, but ACL modifications (allow, allowThis) cannot happen in view functions.\n\n`;
    
    sections += `### 4. Permission Propagation in Transfers\n\n`;
    sections += `When transferring encrypted values between users, both sender and recipient need permission updates. The sender's new balance and the recipient's new balance are both new encrypted values that require fresh permission grants.\n\n`;
    
    sections += `### 5. Cross-Contract Permissions with allowTransient\n\n`;
    sections += `When calling another contract that needs to operate on your encrypted values, use \`FHE.allowTransient(value, targetContract)\` to grant temporary permission that expires at the end of the transaction. This is more gas-efficient than permanent permissions for single-use delegations.\n\n`;
  } else if (keyConceptsFromComments.length > 0) {
    // Use concepts from contract comments if available
    keyConceptsFromComments.forEach(concept => {
      sections += `### ${conceptNum}. ${concept.title}\n\n`;
      sections += `${concept.description}\n\n`;
      conceptNum++;
    });
  } else {
    // Fallback to generic concepts based on operations
    if (mainOp) {
      const opDescriptions: Record<string, string> = {
        'FHE.min': 'The `FHE.min()` function compares two encrypted values and returns the smaller one, all without decrypting either value.',
        'FHE.max': 'The `FHE.max()` function compares two encrypted values and returns the larger one, all without decrypting either value.',
        'FHE.add': 'The `FHE.add()` function performs addition on encrypted values, computing the sum without ever decrypting the operands.',
        'FHE.sub': 'The `FHE.sub()` function performs subtraction on encrypted values, computing the difference without decrypting.',
        'FHE.mul': 'The `FHE.mul()` function performs multiplication on encrypted values, computing the product without decrypting.',
        'FHE.div': 'The `FHE.div()` function performs division on encrypted values, computing the quotient without decrypting.',
      'FHE.xor': 'The `FHE.xor()` function performs bitwise XOR on encrypted values, computing the result without decrypting.',
      'FHE.and': 'The `FHE.and()` function performs bitwise AND on encrypted values.',
      'FHE.or': 'The `FHE.or()` function performs bitwise OR on encrypted values.',
      'FHE.not': 'The `FHE.not()` function performs bitwise NOT (complement) on encrypted values.',
      'FHE.select': 'The `FHE.select()` function performs conditional selection (if-then-else) on encrypted values based on an encrypted boolean condition.',
      'FHE.rem': 'The `FHE.rem()` function computes the remainder (modulo) of an encrypted value divided by a plaintext modulus.',
    };
    
      sections += `### ${conceptNum}. ${mainOp} Operation\n\n`;
      sections += `${opDescriptions[mainOp] || `The \`${mainOp}\` function performs homomorphic operations on encrypted values without decrypting them.`}\n\n`;
      conceptNum++;
      
      // Only add encryption if actually used
      if (contractContent.includes('FHE.fromExternal') || testContent.includes('createEncryptedInput')) {
        sections += `### ${conceptNum}. Off-Chain Encryption\n\n`;
        sections += `Values are encrypted **locally** (on the client side) before being sent to the contract:\n`;
        sections += `- Plaintext values never appear in transactions\n`;
        sections += `- Encryption is cryptographically bound to [contract, user] pair\n`;
        sections += `- Input proofs verify the binding\n\n`;
        conceptNum++;
      }
      
      // Only add permissions if actually used
      if (contractContent.includes('FHE.allowThis') || contractContent.includes('FHE.allow')) {
        sections += `### ${conceptNum}. FHE Permissions\n\n`;
        sections += `Permissions control who can:\n`;
        sections += `- **Perform operations**: Contracts need \`FHE.allowThis()\`\n`;
        sections += `- **Decrypt values**: Users need \`FHE.allow()\`\n\n`;
        conceptNum++;
      }
    }
  }
  
  // Omnibus-specific concepts
  if (config.title.includes('Omnibus') || contractContent.includes('ERC7984Omnibus')) {
    sections += `### ${conceptNum}. Omnibus Pattern\n\n`;
    sections += `The omnibus pattern is useful for exchanges, custodians, or intermediaries where:\n`;
    sections += `- **Multiple sub-accounts** are tracked off-chain (not stored on-chain)\n`;
    sections += `- **Onchain settlement** occurs between omnibus accounts (omnibusFrom, omnibusTo)\n`;
    sections += `- **Sub-account addresses** (sender/recipient) are encrypted in events for privacy\n`;
    sections += `- **Omnibus accounts** (omnibusFrom/omnibusTo) are public addresses\n`;
    sections += `- **ACL permissions** are automatically granted to omnibus accounts\n`;
    sections += `- **Events** (OmnibusConfidentialTransfer) allow off-chain tracking of sub-account balances\n\n`;
    conceptNum++;
    
    sections += `### ${conceptNum}. Encrypted Addresses in Omnibus Transfers\n\n`;
    sections += `In omnibus transfers, both the amount and the sub-account addresses are encrypted:\n`;
    sections += `- **Encrypted sender address**: The sub-account sending tokens (encrypted for privacy)\n`;
    sections += `- **Encrypted recipient address**: The sub-account receiving tokens (encrypted for privacy)\n`;
    sections += `- **Encrypted amount**: The amount being transferred (standard FHE encryption)\n`;
    sections += `- All three values are created in a single encrypted input and share the same input proof\n`;
    sections += `- The \`OmnibusConfidentialTransfer\` event contains these encrypted addresses for off-chain tracking\n\n`;
    conceptNum++;
  }
  
  // Step-by-Step Walkthrough - extract actual function names
  const functionMatches = contractContent.matchAll(/function\s+(\w+)\s*\([^)]*\)/g);
  const functionNames: string[] = [];
  for (const match of functionMatches) {
    if (!match[1].startsWith('_') && match[1] !== 'constructor') {
      functionNames.push(match[1]);
    }
  }
  
  sections += `## Step-by-Step Walkthrough\n\n`;
  
  // Anti-pattern specific walkthrough
  if (isAntiPattern && config.title.includes('Permissions')) {
    sections += `### Step 1: Understand the Anti-Pattern\n\n`;
    sections += `Each function in this contract demonstrates a common permission mistake. The "wrong" functions show what NOT to do, while the "correct" functions show the proper implementation.\n\n`;
    
    sections += `### Step 2: Compare Wrong vs Correct Implementations\n\n`;
    sections += `Study the pairs of functions:\n`;
    sections += `- \`wrongMissingAllowThis()\` vs \`correctWithAllowThis()\`\n`;
    sections += `- \`wrongMissingUserAllow()\` vs \`correctWithUserAllow()\`\n`;
    sections += `- \`wrongStoreWithoutPermission()\` vs \`correctStoreWithPermission()\`\n`;
    sections += `- \`wrongTransferWithoutPermission()\` vs \`correctTransferWithPermission()\`\n`;
    sections += `- \`wrongCrossContractCall()\` vs \`correctCrossContractCall()\`\n\n`;
    
    sections += `### Step 3: Test Each Scenario\n\n`;
    sections += `Run the test suite to see how each anti-pattern manifests:\n`;
    sections += `- "Correct" functions allow successful decryption\n`;
    sections += `- "Wrong" functions store values but users can't access them\n\n`;
    
    sections += `### Step 4: Apply to Your Code\n\n`;
    sections += `When writing your own contracts:\n`;
    sections += `1. Always call \`FHE.allowThis()\` after any FHE computation\n`;
    sections += `2. Call \`FHE.allow(value, user)\` for each user who needs to decrypt\n`;
    sections += `3. Update permissions for all parties in transfers\n`;
    sections += `4. Use \`FHE.allowTransient()\` for cross-contract calls\n\n`;
  } else if (config.title.includes('Omnibus') || contractContent.includes('ERC7984Omnibus')) {
    // Omnibus-specific walkthrough
    sections += `### Step 1: Mint Tokens to Omnibus Account\n\n`;
    sections += `First, mint tokens to the omnibus account (omnibusFrom) that will handle the transfers. Use \`$_mint()\` to mint tokens to the omnibus account.\n\n`;
    
    sections += `### Step 2: Create Encrypted Values for Omnibus Transfer\n\n`;
    sections += `Create all encrypted values in a single encrypted input:\n`;
    sections += `- Encrypt the sender sub-account address using \`.addAddress(senderAddress)\`\n`;
    sections += `- Encrypt the recipient sub-account address using \`.addAddress(recipientAddress)\`\n`;
    sections += `- Encrypt the transfer amount using \`.add64(amount)\`\n`;
    sections += `- All three values share the same input proof when created together\n\n`;
    
    sections += `### Step 3: Perform Omnibus Transfer\n\n`;
    sections += `Call \`confidentialTransferOmnibus()\` or \`confidentialTransferFromOmnibus()\` with:\n`;
    sections += `- The omnibusTo address (public address)\n`;
    sections += `- The encrypted sender address (first handle)\n`;
    sections += `- The encrypted recipient address (second handle)\n`;
    sections += `- The encrypted amount (third handle)\n`;
    sections += `- The shared input proof\n\n`;
    
    sections += `### Step 4: Track Sub-Account Balances Off-Chain\n\n`;
    sections += `Listen for \`OmnibusConfidentialTransfer\` events to track sub-account balances off-chain. The event contains encrypted addresses and amounts for your accounting system.\n\n`;
  } else if (functionNames.length > 0 && mainOp) {
    // Example-specific walkthrough
    sections += `### Step 1: Set Encrypted Values\n\n`;
    sections += `Encrypt your values off-chain and send them to the contract using \`${functionNames[0] || 'setValue'}()\`.\n\n`;
    
    sections += `### Step 2: Perform ${mainOp} Operation\n\n`;
    sections += `Call the function that performs \`${mainOp}\` (e.g., \`${functionNames.find(f => f.includes('compute') || f.includes('min') || f.includes('max') || f.includes('result')) || functionNames[1] || 'compute'}()\`).\n\n`;
    
    if (testContent.includes('userDecrypt') || testContent.includes('publicDecrypt')) {
      sections += `### Step 3: Decrypt Result\n\n`;
      if (testContent.includes('userDecrypt')) {
        sections += `Use \`userDecrypt\` to retrieve the plaintext result.\n\n`;
      } else {
        sections += `Use \`publicDecrypt\` to retrieve the plaintext result.\n\n`;
      }
    }
  } else {
    // Generic walkthrough only if we can't extract specifics
    sections += `### Step 1: Setup\n\n`;
    sections += `Deploy the contract and prepare encrypted inputs.\n\n`;
    
    sections += `### Step 2: Execute Operations\n\n`;
    sections += `Call contract functions with encrypted values and proofs.\n\n`;
    
    sections += `### Step 3: Decrypt Results\n\n`;
    sections += `Use the appropriate decryption method to retrieve plaintext values.\n\n`;
  }
  
  // Common Pitfalls section
  const pitfalls = extractPitfalls(testContent);
  if (pitfalls.length > 0) {
    sections += `## Common Pitfalls\n\n`;
    pitfalls.slice(0, 3).forEach((pitfall, index) => {
      sections += `### ❌ Pitfall ${index + 1}: ${pitfall.title}\n\n`;
      sections += `**The Problem:** ${pitfall.description}\n\n`;
      sections += `**Why it fails:** The operation fails due to incorrect usage, permissions, or signer mismatch.\n\n`;
      sections += `**The Fix:** Ensure proper setup, matching signers, and correct permissions.\n\n`;
    });
  } else if (contractContent.includes('FHE.fromExternal')) {
    // Only show generic pitfall if encryption is used
    sections += `## Common Pitfalls\n\n`;
    sections += `### ❌ Pitfall: Signer Mismatch\n\n`;
    sections += `**The Problem:** Using wrong signer for encrypted input.\n\n`;
    sections += `**Why it fails:** The input proof binds the handle to a specific user address. If the transaction signer doesn't match, verification fails.\n\n`;
    sections += `**The Fix:** Always match encryption signer with transaction signer:\n\n`;
    sections += `\`\`\`typescript\n`;
    sections += `const enc = await fhevm.createEncryptedInput(contractAddress, user.address).encrypt();\n`;
    sections += `await contract.connect(user).initialize(enc.handles[0], enc.inputProof);\n`;
    sections += `\`\`\`\n\n`;
  }
  
  // Best Practices section
  sections += `## Best Practices\n\n`;
  sections += `1. **Always match encryption signer with transaction signer**\n`;
  sections += `2. **Grant permissions immediately after creating encrypted values**\n`;
  sections += `3. **Use descriptive variable names** for clarity\n`;
  sections += `4. **Validate inputs** before performing operations\n\n`;
  
  // Real-World Use Cases - example-specific
  sections += `## Real-World Use Cases\n\n`;
  
  if (mainOp === 'FHE.min' || mainOp === 'FHE.max') {
    sections += `- **Confidential Rankings**: Find winners/losers without revealing individual scores\n`;
    sections += `- **Privacy-Preserving Auctions**: Determine highest/lowest bid without revealing amounts\n`;
    sections += `- **Confidential Comparisons**: Compare encrypted values in business logic\n`;
  } else if (mainOp === 'FHE.add' || mainOp === 'FHE.mul') {
    sections += `- **Confidential Accounting**: Sum or multiply encrypted balances\n`;
    sections += `- **Privacy-Preserving Analytics**: Aggregate encrypted data points\n`;
    sections += `- **Confidential Calculations**: Perform financial computations on encrypted values\n`;
  } else if (mainOp === 'FHE.xor' || mainOp === 'FHE.and' || mainOp === 'FHE.or') {
    sections += `- **Encrypted Flags**: Set/check boolean flags without revealing state\n`;
    sections += `- **Privacy-Preserving Logic**: Perform bitwise operations on encrypted data\n`;
  } else if (mainOp === 'FHE.select') {
    sections += `- **Conditional Transfers**: Transfer based on encrypted conditions\n`;
    sections += `- **Privacy-Preserving Branching**: Implement if-then-else logic on encrypted values\n`;
  } else if (config.category.includes('Encryption')) {
    sections += `- **Confidential Voting**: Encrypt votes before submission\n`;
    sections += `- **Private Auctions**: Encrypt bids to hide amounts\n`;
  } else if (config.category.includes('Decryption')) {
    sections += `- **Confidential Balances**: Users decrypt their own token balances\n`;
    sections += `- **Private Messages**: Users decrypt messages sent to them\n`;
  } else if (config.title.includes('Omnibus') || contractContent.includes('ERC7984Omnibus')) {
    sections += `- **Exchange Custody**: Exchanges can track user balances off-chain while settling on-chain between omnibus accounts\n`;
    sections += `- **Custodial Services**: Custodians can manage multiple client accounts privately with encrypted sub-account tracking\n`;
    sections += `- **Intermediary Services**: Payment processors can handle transfers between sub-accounts without revealing individual account details\n`;
    sections += `- **Privacy-Preserving Ledgers**: Maintain confidential sub-account balances while providing on-chain settlement guarantees\n`;
  } else if (config.category.includes('ERC7984')) {
    sections += `- **Confidential Tokens**: Privacy-preserving token transfers\n`;
    sections += `- **Compliant RWA Tokens**: Real-world asset tokens with compliance features\n`;
  } else if (config.category.includes('Voting')) {
    sections += `- **Confidential Governance**: Private voting on proposals\n`;
    sections += `- **Secret Ballots**: Encrypted votes with public tallies\n`;
  } else if (config.category.includes('Vesting')) {
    sections += `- **Token Vesting**: Time-locked token releases\n`;
    sections += `- **Employee Compensation**: Confidential vesting schedules\n`;
  } else {
    sections += `- **Confidential Smart Contracts**: Building privacy-preserving applications\n`;
    sections += `- **Encrypted Data Processing**: Performing computations on sensitive data\n`;
  }
  
  return sections;
}

function generateGitBookMarkdown(config: DocsConfig, contractContent: string, testContent: string): string {
  const contractName = getContractName(contractContent);
  const description = config.description || extractDescription(contractContent);
  
  // Extract chapter tag from test file if not provided in config
  const chapterTag = config.chapter || extractChapterTag(testContent);

  // Start with title
  let markdown = `# ${config.title}\n\n`;
  
  // Add chapter tag if found (GitBook-compatible comment)
  if (chapterTag) {
    markdown += `<!-- chapter: ${chapterTag} -->\n\n`;
  }

  // Generate comprehensive sections
  markdown += generateComprehensiveSections(config, contractContent, testContent, contractName);

  // Add hint block
  markdown += `{% hint style="info" %}\n`;
  markdown += `To run this example correctly, make sure the files are placed in the following directories:\n\n`;
  markdown += `- \`.sol\` file → \`<your-project-root-dir>/contracts/\`\n`;
  markdown += `- \`.ts\` file → \`<your-project-root-dir>/test/\`\n\n`;
  markdown += `This ensures Hardhat can compile and test your contracts as expected.\n`;
  markdown += `{% endhint %}\n\n`;

  // Add tabs for contract and test
  markdown += `{% tabs %}\n\n`;

  // Contract tab
  markdown += `{% tab title="${contractName}.sol" %}\n\n`;
  markdown += `\`\`\`solidity\n`;
  markdown += contractContent;
  markdown += `\n\`\`\`\n\n`;
  markdown += `{% endtab %}\n\n`;

  // Test tab
  const testFileName = path.basename(config.test);
  markdown += `{% tab title="${testFileName}" %}\n\n`;
  markdown += `\`\`\`typescript\n`;
  markdown += testContent;
  markdown += `\n\`\`\`\n\n`;
  markdown += `{% endtab %}\n\n`;

  markdown += `{% endtabs %}\n`;

  return markdown;
}

function updateSummary(exampleName: string, config: DocsConfig): void {
  const rootDir = path.resolve(__dirname, '..');
  const summaryPath = path.join(rootDir, 'docs', 'SUMMARY.md');

  if (!fs.existsSync(summaryPath)) {
    log('Creating new SUMMARY.md', Color.Yellow);
    const summary = `# FHEVM Examples Documentation\n\n`;
    const examplesDir = path.dirname(summaryPath);
    if (!fs.existsSync(examplesDir)) {
      fs.mkdirSync(examplesDir, { recursive: true });
    }
    fs.writeFileSync(summaryPath, summary);
  }

  const summary = fs.readFileSync(summaryPath, 'utf-8');
  const outputFileName = path.basename(config.output);
  const linkText = config.title;
  const link = `- [${linkText}](${outputFileName})`;

  // Check if already in summary
  if (summary.includes(outputFileName)) {
    info('Example already in SUMMARY.md');
    return;
  }

  // Add to appropriate category
  const categoryHeader = `## ${config.category}`;
  let updatedSummary: string;

  if (summary.includes(categoryHeader)) {
    // Add under existing category
    const lines = summary.split('\n');
    const categoryIndex = lines.findIndex(line => line.trim() === categoryHeader);

    // Find next category or end
    let insertIndex = categoryIndex + 1;
    while (insertIndex < lines.length && !lines[insertIndex].startsWith('##')) {
      if (lines[insertIndex].trim() === '') {
        break;
      }
      insertIndex++;
    }

    lines.splice(insertIndex, 0, link);
    updatedSummary = lines.join('\n');
  } else {
    // Add new category
    updatedSummary = summary.trim() + `\n\n${categoryHeader}\n\n${link}\n`;
  }

  fs.writeFileSync(summaryPath, updatedSummary);
  success('Updated SUMMARY.md');
}

function generateDocs(exampleName: string, options: GenerateDocsOptions = {}): void {
  const config = EXAMPLES_CONFIG[exampleName];

  if (!config) {
    error(`Unknown example: ${exampleName}\n\nAvailable examples:\n${Object.keys(EXAMPLES_CONFIG).map(k => `  - ${k}`).join('\n')}`);
  }

  info(`Generating documentation for: ${config.title}`);

  // Read contract and test files
  const contractContent = readFile(config.contract);
  const testContent = readFile(config.test);
  
  // Extract chapter tag from test if not in config
  if (!config.chapter) {
    const extractedChapter = extractChapterTag(testContent);
    if (extractedChapter) {
      config.chapter = extractedChapter;
      info(`Found chapter tag: ${extractedChapter}`);
    }
  }

  // Generate GitBook markdown
  const markdown = generateGitBookMarkdown(config, contractContent, testContent);

  // Write output file
  const rootDir = path.resolve(__dirname, '..');
  const outputPath = path.join(rootDir, config.output);
  const outputDir = path.dirname(outputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, markdown);
  success(`Documentation generated: ${config.output}`);

  // Update SUMMARY.md
  if (!options.noSummary) {
    updateSummary(exampleName, config);
  }

  log('\n' + '='.repeat(60), Color.Green);
  success(`Documentation for "${config.title}" generated successfully!`);
  log('='.repeat(60), Color.Green);
}

function generateAllDocs(): void {
  info('Generating documentation for all examples...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const exampleName of Object.keys(EXAMPLES_CONFIG)) {
    try {
      generateDocs(exampleName, { noSummary: true });
      successCount++;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      log(`Failed to generate docs for ${exampleName}: ${errorMessage}`, Color.Red);
      errorCount++;
    }
  }

  // Update summary once at the end
  info('\nUpdating SUMMARY.md...');
  for (const exampleName of Object.keys(EXAMPLES_CONFIG)) {
    const config = EXAMPLES_CONFIG[exampleName];
    updateSummary(exampleName, config);
  }

  log('\n' + '='.repeat(60), Color.Green);
  success(`Generated ${successCount} documentation files`);
  if (errorCount > 0) {
    log(`Failed: ${errorCount}`, Color.Red);
  }
  log('='.repeat(60), Color.Green);
}

// Main execution
function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    log('FHEVM Documentation Generator', Color.Cyan);
    log('\nUsage: ts-node scripts/generate-docs.ts <example-name> | --all\n');
    if (Object.keys(EXAMPLES_CONFIG).length > 0) {
      log('Available examples:', Color.Yellow);
      Object.entries(EXAMPLES_CONFIG).forEach(([name, config]) => {
        log(`  ${name}`, Color.Green);
        log(`    ${config.title} - ${config.category}`, Color.Reset);
      });
    } else {
      log('No examples configured yet. Add examples to EXAMPLES_CONFIG in this script.', Color.Yellow);
    }
    log('\nOptions:', Color.Yellow);
    log('  --all    Generate documentation for all examples');
    log('\nExamples:', Color.Yellow);
    log('  ts-node scripts/generate-docs.ts fhe-counter');
    log('  ts-node scripts/generate-docs.ts --all\n');
    process.exit(0);
  }

  if (args[0] === '--all') {
    generateAllDocs();
  } else {
    generateDocs(args[0]);
  }
}

main();

