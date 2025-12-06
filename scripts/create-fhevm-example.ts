#!/usr/bin/env ts-node

/**
 * create-fhevm-example - CLI tool to generate standalone FHEVM example repositories
 *
 * Usage: ts-node scripts/create-fhevm-example.ts <example-name> [output-dir]
 *
 * Example: ts-node scripts/create-fhevm-example.ts fhe-counter ./my-fhe-counter
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

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

function error(message: string): never {
  log(`❌ Error: ${message}`, Color.Red);
  process.exit(1);
}

function success(message: string): void {
  log(`✅ ${message}`, Color.Green);
}

function info(message: string): void {
  log(`ℹ️  ${message}`, Color.Blue);
}

// Example configuration interface
export interface ExampleConfig {
  contract: string;
  test: string;
  testFixture?: string;
  description: string;
  category?: string;
  dependencies?: string[]; // Additional contracts or test helpers needed for tests
}

// Map of example names to their contract and test paths
export const EXAMPLES_MAP: Record<string, ExampleConfig> = {
  // Basic Examples
  'fhe-counter': {
    contract: 'contracts/basic/FHECounter.sol',
    test: 'test/basic/FHECounter.ts',
    description: 'A simple FHE counter demonstrating basic encrypted operations',
    category: 'basic',
  },
  'encrypt-single-value': {
    contract: 'contracts/basic/encrypt/EncryptSingleValue.sol',
    test: 'test/basic/encrypt/EncryptSingleValue.ts',
    description: 'Demonstrates FHE encryption mechanism and common pitfalls',
    category: 'basic',
  },
  'encrypt-multiple-values': {
    contract: 'contracts/basic/encrypt/EncryptMultipleValues.sol',
    test: 'test/basic/encrypt/EncryptMultipleValues.ts',
    description: 'Shows how to encrypt and handle multiple values',
    category: 'basic',
  },
  'user-decrypt-single-value': {
    contract: 'contracts/basic/decrypt/UserDecryptSingleValue.sol',
    test: 'test/basic/decrypt/UserDecryptSingleValue.ts',
    description: 'Demonstrates user decryption and permission requirements',
    category: 'basic',
  },
  'user-decrypt-multiple-values': {
    contract: 'contracts/basic/decrypt/UserDecryptMultipleValues.sol',
    test: 'test/basic/decrypt/UserDecryptMultipleValues.ts',
    description: 'Shows how to decrypt multiple encrypted values',
    category: 'basic',
  },
  'public-decrypt-single-value': {
    contract: 'contracts/basic/decrypt/PublicDecryptSingleValue.sol',
    test: 'test/basic/decrypt/PublicDecryptSingleValue.ts',
    description: 'Demonstrates public decryption mechanism',
    category: 'basic',
  },
  'public-decrypt-multiple-values': {
    contract: 'contracts/basic/decrypt/PublicDecryptMultipleValues.sol',
    test: 'test/basic/decrypt/PublicDecryptMultipleValues.ts',
    description: 'Shows public decryption with multiple values',
    category: 'basic',
  },
  'fhe-add': {
    contract: 'contracts/basic/fhe-operations/FHEAdd.sol',
    test: 'test/basic/fhe-operations/FHEAdd.ts',
    description: 'Demonstrates FHE addition operations',
    category: 'basic',
  },
  'fhe-if-then-else': {
    contract: 'contracts/basic/fhe-operations/FHEIfThenElse.sol',
    test: 'test/basic/fhe-operations/FHEIfThenElse.ts',
    description: 'Shows conditional operations on encrypted values',
    category: 'basic',
  },
  'fhe-min': {
    contract: 'contracts/basic/fhe-operations/FHEMin.sol',
    test: 'test/basic/fhe-operations/FHEMin.ts',
    description: 'Demonstrates FHE.min operation to find minimum of two encrypted values',
    category: 'basic',
  },
  'fhe-mul': {
    contract: 'contracts/basic/fhe-operations/FHEMul.sol',
    test: 'test/basic/fhe-operations/FHEMul.ts',
    description: 'Demonstrates FHE.mul operation to multiply two encrypted values',
    category: 'basic',
  },
  'fhe-xor': {
    contract: 'contracts/basic/fhe-operations/FHEXor.sol',
    test: 'test/basic/fhe-operations/FHEXor.ts',
    description: 'Demonstrates FHE.xor operation for bitwise XOR on encrypted values',
    category: 'basic',
  },
  'fhe-div': {
    contract: 'contracts/basic/fhe-operations/FHEDiv.sol',
    test: 'test/basic/fhe-operations/FHEDiv.ts',
    description: 'Demonstrates FHE.div operation to divide two encrypted values',
    category: 'basic',
  },
  'fhe-bitwise': {
    contract: 'contracts/basic/fhe-operations/FHEBitwise.sol',
    test: 'test/basic/fhe-operations/FHEBitwise.ts',
    description: 'Demonstrates FHE.and, FHE.or, and FHE.not operations',
    category: 'basic',
  },
  // Access Control Examples
  'access-control': {
    contract: 'contracts/access-control/AccessControl.sol',
    test: 'test/access-control/AccessControl.ts',
    description: 'Demonstrates FHE access control using FHE.allow() and FHE.allowThis()',
    category: 'access-control',
  },
  'allow-transient': {
    contract: 'contracts/access-control/AllowTransient.sol',
    test: 'test/access-control/AllowTransient.ts',
    description: 'Demonstrates FHE.allowTransient() for temporary permissions',
    category: 'access-control',
  },
  'permission-examples': {
    contract: 'contracts/access-control/PermissionExamples.sol',
    test: 'test/access-control/PermissionExamples.ts',
    description: 'Various FHE permission scenarios and patterns',
    category: 'access-control',
  },
  // Input Proof Examples
  'input-proof-basics': {
    contract: 'contracts/input-proofs/InputProofBasics.sol',
    test: 'test/input-proofs/InputProofBasics.ts',
    description: 'Explains what input proofs are and why they are needed',
    category: 'input-proofs',
  },
  'input-proof-usage': {
    contract: 'contracts/input-proofs/InputProofUsage.sol',
    test: 'test/input-proofs/InputProofUsage.ts',
    description: 'Demonstrates correct usage of input proofs',
    category: 'input-proofs',
  },
  'input-proof-anti-patterns': {
    contract: 'contracts/input-proofs/InputProofAntiPatterns.sol',
    test: 'test/input-proofs/InputProofAntiPatterns.ts',
    description: 'Common mistakes with input proofs and how to avoid them',
    category: 'input-proofs',
  },
  'handle-lifecycle': {
    contract: 'contracts/input-proofs/HandleLifecycle.sol',
    test: 'test/input-proofs/HandleLifecycle.ts',
    description: 'Understanding how handles are generated and their lifecycle',
    category: 'input-proofs',
  },
  // Anti-Pattern Examples
  'view-with-encrypted': {
    contract: 'contracts/anti-patterns/ViewWithEncrypted.sol',
    test: 'test/anti-patterns/ViewWithEncrypted.ts',
    description: 'Why view functions cannot return encrypted values',
    category: 'anti-patterns',
  },
  'missing-allow-this': {
    contract: 'contracts/anti-patterns/MissingAllowThis.sol',
    test: 'test/anti-patterns/MissingAllowThis.ts',
    description: 'What happens when FHE.allowThis() permission is missing',
    category: 'anti-patterns',
  },
  'handle-misuse': {
    contract: 'contracts/anti-patterns/HandleMisuse.sol',
    test: 'test/anti-patterns/HandleMisuse.ts',
    description: 'Incorrect handle usage patterns and correct alternatives',
    category: 'anti-patterns',
  },
  // OpenZeppelin Examples
  'erc7984-example': {
    contract: 'contracts/openzeppelin/ERC7984Mock.sol',
    test: 'test/openzeppelin/ERC7984Example.ts',
    description: 'Basic ERC7984 confidential token implementation using OpenZeppelin mock',
    category: 'openzeppelin',
  },
  'erc7984-to-erc20-wrapper': {
    contract: 'contracts/openzeppelin/ERC7984ToERC20Wrapper.sol',
    test: 'test/openzeppelin/ERC7984ToERC20Wrapper.ts',
    description: 'Wraps ERC20 tokens into ERC7984 confidential tokens',
    category: 'openzeppelin',
    dependencies: ['contracts/openzeppelin/ERC20Mock.sol'],
  },
  'swap-erc7984-to-erc20': {
    contract: 'contracts/openzeppelin/SwapERC7984ToERC20.sol',
    test: 'test/openzeppelin/SwapERC7984ToERC20.ts',
    description: 'Swaps ERC7984 confidential tokens to ERC20 tokens',
    category: 'openzeppelin',
    dependencies: ['contracts/openzeppelin/ERC7984Mock.sol', 'test/openzeppelin/helpers/ERC20Mock.sol'],
  },
  'swap-erc7984-to-erc7984': {
    contract: 'contracts/openzeppelin/SwapERC7984ToERC7984.sol',
    test: 'test/openzeppelin/SwapERC7984ToERC7984.ts',
    description: 'Swaps between two ERC7984 confidential tokens',
    category: 'openzeppelin',
    dependencies: ['contracts/openzeppelin/ERC7984Mock.sol'],
  },
  'vesting-wallet-confidential': {
    contract: 'contracts/openzeppelin/VestingWalletConfidentialFactoryMock.sol',
    test: 'test/openzeppelin/VestingWalletConfidential.ts',
    description: 'OpenZeppelin VestingWalletConfidential factory for creating confidential token vesting wallets',
    category: 'openzeppelin',
    dependencies: [
      'contracts/openzeppelin/ERC7984Mock.sol',
      'contracts/openzeppelin/VestingWalletConfidential.sol',
      '@openzeppelin/confidential-contracts/finance/VestingWalletConfidentialFactory.sol'
    ],
  },
  'vesting-wallet-cliff-confidential': {
    contract: 'contracts/openzeppelin/VestingWalletCliffConfidentialFactoryMock.sol',
    test: 'test/openzeppelin/VestingWalletCliffConfidential.ts',
    description: 'OpenZeppelin VestingWalletCliffConfidential factory with cliff period for confidential tokens',
    category: 'openzeppelin',
    dependencies: [
      'contracts/openzeppelin/ERC7984Mock.sol',
      'contracts/openzeppelin/VestingWalletConfidential.sol',
      'contracts/openzeppelin/VestingWalletCliffConfidential.sol',
      '@openzeppelin/confidential-contracts/finance/VestingWalletConfidentialFactory.sol'
    ],
  },
  'confidential-voting': {
    contract: 'contracts/openzeppelin/ERC7984VotesMock.sol',
    test: 'test/openzeppelin/ERC7984VotesExample.ts',
    description: 'OpenZeppelin ERC7984Votes for confidential governance and voting power tracking',
    category: 'openzeppelin',
    dependencies: [
      'contracts/openzeppelin/ERC7984Mock.sol',
      '@openzeppelin/confidential-contracts/token/ERC7984/extensions/ERC7984Votes.sol'
    ],
  },
  'erc7984-rwa': {
    contract: 'contracts/openzeppelin/ERC7984RwaMock.sol',
    test: 'test/openzeppelin/ERC7984RwaExample.ts',
    description: 'Demonstrates ERC7984 RWA (Real World Assets) with compliance features: pause, freeze, block users, and force transfers',
    category: 'openzeppelin',
    dependencies: [
      '@openzeppelin/confidential-contracts/token/ERC7984/extensions/ERC7984Rwa.sol',
      '@openzeppelin/confidential-contracts/utils/HandleAccessManager.sol'
    ],
  },
  'erc7984-omnibus': {
    contract: 'contracts/openzeppelin/ERC7984OmnibusMock.sol',
    test: 'test/openzeppelin/ERC7984OmnibusExample.ts',
    description: 'Demonstrates ERC7984Omnibus for omnibus transfers with encrypted sub-account addresses',
    category: 'openzeppelin',
    dependencies: [
      '@openzeppelin/confidential-contracts/token/ERC7984/extensions/ERC7984Omnibus.sol'
    ],
  },
  'vesting-wallet': {
    contract: 'contracts/openzeppelin/VestingWallet.sol',
    test: 'test/openzeppelin/VestingWallet.ts',
    description: 'Confidential vesting wallet for ERC7984 tokens',
    category: 'openzeppelin',
    dependencies: ['contracts/openzeppelin/ERC7984Mock.sol'],
  },
  // Advanced Examples
  'fhe-legacy-vault': {
    contract: 'contracts/advanced/FHELegacyVault.sol',
    test: 'test/advanced/FHELegacyVault.ts', // Will need to create test
    description: 'Secure vault system with time-locked access using FHEVM and IPFS',
    category: 'advanced',
  },
  'simple-voting': {
    contract: 'contracts/advanced/SimpleVoting.sol',
    test: 'test/advanced/SimpleVoting.ts', // Will need to create test
    description: 'Confidential voting system with encrypted votes',
    category: 'advanced',
  },
  'review-cards-fhe': {
    contract: 'contracts/advanced/ReviewCardsFHE.sol',
    test: 'test/advanced/ReviewCardsFHE.ts', // Will need to create test
    description: 'Review and rating system with encrypted ratings',
    category: 'advanced',
  },
  'blind-auction': {
    contract: 'contracts/advanced/BlindAuction.sol',
    test: 'test/advanced/BlindAuction.ts',
    description: 'Confidential blind auction where bids are encrypted until reveal phase',
    category: 'advanced',
  },
  'confidential-portfolio-rebalancer': {
    contract: 'contracts/advanced/ConfidentialPortfolioRebalancer.sol',
    test: 'test/advanced/ConfidentialPortfolioRebalancer.ts',
    description: 'Advanced portfolio management with automatic rebalancing using multiple ERC7984 tokens and complex FHE operations',
    category: 'advanced',
    dependencies: ['contracts/openzeppelin/ERC7984Mock.sol'],
  },
};

function copyDirectoryRecursive(source: string, destination: string): void {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  const items = fs.readdirSync(source);

  items.forEach(item => {
    const sourcePath = path.join(source, item);
    const destPath = path.join(destination, item);
    const stat = fs.statSync(sourcePath);

    if (stat.isDirectory()) {
      // Skip node_modules, artifacts, cache, etc.
      if (['node_modules', 'artifacts', 'cache', 'coverage', 'types', 'dist', '.git'].includes(item)) {
        return;
      }
      copyDirectoryRecursive(sourcePath, destPath);
    } else {
      // Skip certain files
      if (['.gitignore', 'package-lock.json'].includes(item)) {
        return;
      }
      fs.copyFileSync(sourcePath, destPath);
    }
  });
}

function getContractName(contractPath: string): string | null {
  const content = fs.readFileSync(contractPath, 'utf-8');
  // Match contract declaration, ignoring comments and ensuring it's followed by 'is' or '{'
  const match = content.match(/^\s*contract\s+(\w+)(?:\s+is\s+|\s*\{)/m);
  return match ? match[1] : null;
}

function updateDeployScript(outputDir: string, contractName: string): void {
  const deployDir = path.join(outputDir, 'deploy');
  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir, { recursive: true });
  }

  const deployScriptPath = path.join(deployDir, 'deploy.ts');

  const deployScript = `import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployed${contractName} = await deploy("${contractName}", {
    from: deployer,
    log: true,
  });

  console.log(\`${contractName} contract: \`, deployed${contractName}.address);
};
export default func;
func.id = "deploy_${contractName.toLowerCase()}";
func.tags = ["${contractName}"];
`;

  fs.writeFileSync(deployScriptPath, deployScript);
}

function updatePackageJson(outputDir: string, exampleName: string, description: string): void {
  const packageJsonPath = path.join(outputDir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    error(`package.json not found in template: ${outputDir}`);
  }
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  packageJson.name = `fhevm-example-${exampleName}`;
  packageJson.description = description;
  packageJson.homepage = `https://github.com/zama-ai/fhevm-examples/${exampleName}`;

  // Fix version mismatch: @fhevm/hardhat-plugin expects @zama-fhe/relayer-sdk@0.3.0-5
  // Use exact version (not ^) to prevent npm from installing 0.3.0-6
  if (packageJson.devDependencies && packageJson.devDependencies['@zama-fhe/relayer-sdk']) {
    packageJson.devDependencies['@zama-fhe/relayer-sdk'] = '0.3.0-5';
  }
  
  // Fix @fhevm/mock-utils version to 0.3.0-1 to match relayer-sdk@0.3.0-5
  if (!packageJson.devDependencies) {
    packageJson.devDependencies = {};
  }
  packageJson.devDependencies['@fhevm/mock-utils'] = '0.3.0-1';

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  // Delete package-lock.json so npm will regenerate it with correct versions
  // The template's package-lock.json has 0.3.0-6 locked, which causes the error
  const packageLockPath = path.join(outputDir, 'package-lock.json');
  if (fs.existsSync(packageLockPath)) {
    fs.unlinkSync(packageLockPath);
  }
}

function updateHardhatConfig(outputDir: string, contractName: string): void {
  const hardhatConfigPath = path.join(outputDir, 'hardhat.config.ts');
  if (!fs.existsSync(hardhatConfigPath)) {
    // If hardhat.config.ts doesn't exist, skip
    return;
  }

  let configContent = fs.readFileSync(hardhatConfigPath, 'utf-8');
  
  // Replace the import statement for the task file
  // Replace: import "./tasks/FHECounter";
  // With: import "./tasks/{contractName}";
  configContent = configContent.replace(
    /import\s+["']\.\/tasks\/FHECounter["'];?/g,
    `import "./tasks/${contractName}";`
  );

  fs.writeFileSync(hardhatConfigPath, configContent);
}

function updateHardhatConfigForOpenZeppelin(outputDir: string): void {
  const hardhatConfigPath = path.join(outputDir, 'hardhat.config.ts');
  if (!fs.existsSync(hardhatConfigPath)) {
    return; // Silently fail if config doesn't exist
  }
  let configContent = fs.readFileSync(hardhatConfigPath, 'utf-8');

  // Add paths configuration to resolve @openzeppelin/confidential-contracts from contracts directory
  // Check if paths already exists in solidity settings
  if (!configContent.includes('paths:')) {
    // Add paths configuration after evmVersion
    configContent = configContent.replace(
      /(evmVersion:\s*"cancun",)/,
      `$1\n      paths: {\n        "@openzeppelin/confidential-contracts": ["./contracts/@openzeppelin/confidential-contracts"],\n      },`
    );
  }

  fs.writeFileSync(hardhatConfigPath, configContent);
}

function generateReadme(exampleName: string, description: string, contractName: string): string {
  return `# FHEVM Example: ${exampleName}

${description}

## Quick Start

### Prerequisites

- **Node.js**: Version 20 or higher
- **npm**: Package manager

### Installation

1. **Install dependencies**

   \`\`\`bash
   npm install
   \`\`\`

2. **Set up environment variables**

   \`\`\`bash
   npx hardhat vars set MNEMONIC
   npx hardhat vars set INFURA_API_KEY
   # Optional: Set Etherscan API key for contract verification
   npx hardhat vars set ETHERSCAN_API_KEY
   \`\`\`

3. **Compile and test**

   \`\`\`bash
   npm run compile
   npm run test
   \`\`\`

## Contract

The main contract is \`${contractName}\` located in \`contracts/${contractName}.sol\`.

## Testing

Run the test suite:

\`\`\`bash
npm run test
\`\`\`

For Sepolia testnet testing:

\`\`\`bash
npm run test:sepolia
\`\`\`

## Deployment

Deploy to local network:

\`\`\`bash
npx hardhat node
npx hardhat deploy --network localhost
\`\`\`

Deploy to Sepolia:

\`\`\`bash
npx hardhat deploy --network sepolia
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
\`\`\`

## Documentation

- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [FHEVM Examples](https://docs.zama.org/protocol/examples)
- [FHEVM Hardhat Plugin](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat)

## License

This project is licensed under the BSD-3-Clause-Clear License.

---

**Built with ❤️ using [FHEVM](https://github.com/zama-ai/fhevm) by Zama**
`;
}

function extractDescription(content: string): string {
  // Extract description from @notice tag (preferred) or first non-tag line in comment
  // Skip @title, @dev, @param tags - only get the actual description text
  
  // First try to get @notice
  const noticeMatch = content.match(/@notice\s+(.+?)(?:\n|$)/);
  if (noticeMatch) {
    return noticeMatch[1].trim();
  }
  
  // If no @notice, try to get first non-tag line after /**
  const commentBlockMatch = content.match(/\/\*\*\s*\n((?:\s*\*[^@\s].*?\n?)+)/s);
  if (commentBlockMatch) {
    let description = commentBlockMatch[1];
    // Remove all @tags
    description = description.replace(/@\w+\s+[^\n]+\n?/g, '');
    // Remove leading * and whitespace from each line
    description = description.replace(/^\s*\*\s*/gm, '');
    description = description.trim();
    return description;
  }
  
  return '';
}

function extractNatSpecComments(content: string): { title?: string; notice?: string; dev?: string; params: Array<{ name: string; description: string }> } {
  const result: { title?: string; notice?: string; dev?: string; params: Array<{ name: string; description: string }> } = { params: [] };
  
  // Extract @title
  const titleMatch = content.match(/@title\s+(.+)/);
  if (titleMatch) result.title = titleMatch[1].trim();
  
  // Extract @notice
  const noticeMatch = content.match(/@notice\s+(.+)/);
  if (noticeMatch) result.notice = noticeMatch[1].trim();
  
  // Extract @dev
  const devMatch = content.match(/@dev\s+(.+)/);
  if (devMatch) result.dev = devMatch[1].trim();
  
  // Extract @param
  const paramMatches = content.matchAll(/@param\s+(\w+)\s+(.+)/g);
  for (const match of paramMatches) {
    result.params.push({ name: match[1], description: match[2].trim() });
  }
  
  return result;
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
function extractMainOperationForDocs(contractContent: string): string | null {
  const operations = [
    { pattern: /FHE\.min\(/g, name: 'FHE.min' },
    { pattern: /FHE\.max\(/g, name: 'FHE.max' },
    { pattern: /FHE\.add\(/g, name: 'FHE.add' },
    { pattern: /FHE\.sub\(/g, name: 'FHE.sub' },
    { pattern: /FHE\.mul\(/g, name: 'FHE.mul' },
    { pattern: /FHE\.div\(/g, name: 'FHE.div' },
    { pattern: /FHE\.xor\(/g, name: 'FHE.xor' },
    { pattern: /FHE\.and\(/g, name: 'FHE.and' },
    { pattern: /FHE\.or\(/g, name: 'FHE.or' },
    { pattern: /FHE\.not\(/g, name: 'FHE.not' },
    { pattern: /FHE\.select\(/g, name: 'FHE.select' },
  ];
  
  for (const op of operations) {
    if (contractContent.match(op.pattern)) {
      return op.name;
    }
  }
  
  return null;
}

// Helper function to extract key concepts from contract code - example-specific
function extractKeyConceptsForDocs(contractContent: string, testContent: string): string[] {
  const concepts: string[] = [];
  const mainOp = extractMainOperationForDocs(contractContent);
  
  // Example-specific operation (most important)
  if (mainOp) {
    concepts.push(`**${mainOp} operation** - How to perform this specific homomorphic operation on encrypted values`);
  }
  
  // Only add encryption if actually used
  if (contractContent.includes('FHE.fromExternal') || testContent.includes('createEncryptedInput')) {
    concepts.push('**Off-chain encryption** - Encrypting values locally before sending to contract');
  }
  
  // Only add permissions if actually used
  if (contractContent.includes('FHE.allowThis') || contractContent.includes('FHE.allow')) {
    concepts.push('**FHE permissions** - Granting permissions for operations and decryption');
  }
  
  // Only add decryption if actually used
  if (testContent.includes('userDecrypt')) {
    concepts.push('**User decryption** - Decrypting results for authorized users');
  }
  
  if (contractContent.includes('makePubliclyDecryptable') || testContent.includes('publicDecrypt')) {
    concepts.push('**Public decryption** - Making results publicly decryptable');
  }
  
  return concepts;
}

// Helper function to extract pitfalls from test content
function extractPitfallsFromTests(testContent: string): Array<{ title: string; description: string }> {
  const pitfalls: Array<{ title: string; description: string }> = [];
  
  // Look for pitfall test descriptions
  const pitfallMatches = testContent.matchAll(/it\(["']([^"']+)["'].*?\{([^}]+)\}/gs);
  for (const match of pitfallMatches) {
    const title = match[1];
    const body = match[2];
    
    // Only include tests that mention failure or pitfalls
    if (title.toLowerCase().includes('fail') || title.toLowerCase().includes('pitfall') || 
        title.toLowerCase().includes('wrong') || title.toLowerCase().includes('error') ||
        title.toLowerCase().includes('should not')) {
      // Extract description from comments in the test
      const commentMatch = body.match(/\/\/\s*(.+)/);
      const description = commentMatch ? commentMatch[1] : title;
      
      pitfalls.push({
        title: title,
        description: description
      });
    }
  }
  
  return pitfalls;
}

// Helper function to generate comprehensive documentation sections
function generateComprehensiveDocSections(
  contractContent: string,
  testContent: string,
  contractName: string,
  description: string,
  natspec: { title?: string; notice?: string; dev?: string; params: Array<{ name: string; description: string }> }
): string {
  let sections = '';
  
  // Overview section
  sections += `## Overview\n\n`;
  sections += `${description}\n\n`;
  
  // What You'll Learn section
  sections += `## What You'll Learn\n\n`;
  const keyConcepts = extractKeyConceptsForDocs(contractContent, testContent);
  keyConcepts.forEach(concept => {
    sections += `- ${concept}\n`;
  });
  sections += `\n`;
  
  // Key Concepts section - only include what's relevant
  const mainOp = extractMainOperationForDocs(contractContent);
  let conceptNum = 1;
  
  sections += `## Key Concepts\n\n`;
  
  // Main operation concept (most important)
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
    };
    
    sections += `### ${conceptNum}. ${mainOp} Operation\n\n`;
    sections += `${opDescriptions[mainOp] || `The \`${mainOp}\` function performs homomorphic operations on encrypted values without decrypting them.`}\n\n`;
    conceptNum++;
  }
  
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
  
  // Step-by-Step Walkthrough - extract actual function names
  const functionMatches = contractContent.matchAll(/function\s+(\w+)\s*\([^)]*\)/g);
  const functionNames: string[] = [];
  for (const match of functionMatches) {
    if (!match[1].startsWith('_') && match[1] !== 'constructor') {
      functionNames.push(match[1]);
    }
  }
  
  sections += `## Step-by-Step Walkthrough\n\n`;
  
  if (functionNames.length > 0 && mainOp) {
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
  const pitfalls = extractPitfallsFromTests(testContent);
  sections += `## Common Pitfalls\n\n`;
  
  if (pitfalls.length > 0) {
    pitfalls.slice(0, 3).forEach((pitfall, index) => {
      sections += `### ❌ Pitfall ${index + 1}: ${pitfall.title}\n\n`;
      sections += `**The Problem:** ${pitfall.description}\n\n`;
      sections += `**Why it fails:** The input proof verification or permission check fails when requirements aren't met.\n\n`;
      sections += `**The Fix:** Always ensure signers match and permissions are granted correctly.\n\n`;
    });
  } else {
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
  } else if (contractContent.includes('FHE.fromExternal')) {
    sections += `- **Confidential Voting**: Encrypt votes before submission\n`;
    sections += `- **Private Auctions**: Encrypt bids to hide amounts\n`;
    sections += `- **Confidential Tokens**: Encrypt token amounts in transfers\n`;
  } else if (contractContent.includes('userDecrypt') || testContent.includes('userDecrypt')) {
    sections += `- **Confidential Balances**: Users decrypt their own token balances\n`;
    sections += `- **Private Messages**: Users decrypt messages sent to them\n`;
  } else if (contractContent.includes('makePubliclyDecryptable') || testContent.includes('publicDecrypt')) {
    sections += `- **Public Results**: Reveal encrypted game results or tallies\n`;
    sections += `- **Transparent Outcomes**: Make encrypted computations publicly verifiable\n`;
  } else {
    sections += `- **Confidential Smart Contracts**: Building privacy-preserving applications\n`;
    sections += `- **Encrypted Data Processing**: Performing computations on sensitive data\n`;
  }
  
  return sections;
}

function generateExampleDocumentation(
  outputDir: string,
  contractPath: string,
  testPath: string,
  exampleName: string,
  description: string,
  contractName: string
): void {
  const docsDir = path.join(outputDir, 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  // Read contract and test files
  const contractContent = fs.readFileSync(contractPath, 'utf-8');
  const testContent = fs.readFileSync(testPath, 'utf-8');

  // Extract NatSpec comments
  const natspec = extractNatSpecComments(contractContent);
  const extractedDescription = extractDescription(contractContent) || description;
  
  // Extract chapter tag from test file
  const chapterTag = extractChapterTag(testContent);

  // Generate comprehensive markdown documentation
  // Use extracted title if available, otherwise use contract name
  const docTitle = natspec.title || contractName;
  let markdown = `# ${docTitle}\n\n`;
  
  // Add chapter tag if found (GitBook-compatible comment)
  if (chapterTag) {
    markdown += `<!-- chapter: ${chapterTag} -->\n\n`;
  }
  
  // Generate comprehensive sections
  markdown += generateComprehensiveDocSections(
    contractContent,
    testContent,
    contractName,
    extractedDescription,
    natspec
  );

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
  const testFileName = path.basename(testPath);
  markdown += `{% tab title="${testFileName}" %}\n\n`;
  markdown += `\`\`\`typescript\n`;
  markdown += testContent;
  markdown += `\n\`\`\`\n\n`;
  markdown += `{% endtab %}\n\n`;

  markdown += `{% endtabs %}\n`;

  // Use the contract name from the example configuration (not from test file type declarations)
  // This ensures docs are named after the actual contract (e.g., SwapERC7984ToERC7984.md)
  // rather than helper types (e.g., ERC7984Mock.md)
  const docPath = path.join(docsDir, `${contractName}.md`);
  fs.writeFileSync(docPath, markdown);
  success(`Documentation generated: docs/${contractName}.md`);
}

function createExample(exampleName: string, outputDir: string, withDocs: boolean = false): void {
  const rootDir = path.resolve(__dirname, '..');
  // fhevm-hardhat-template is inside zama-bounty-11
  const templateDir = path.join(rootDir, 'fhevm-hardhat-template');

  // Check if template exists
  if (!fs.existsSync(templateDir)) {
    error(`Base template not found: ${templateDir}\nPlease ensure fhevm-hardhat-template is cloned from https://github.com/zama-ai/fhevm-hardhat-template`);
  }

  // Check if example exists
  if (!EXAMPLES_MAP[exampleName]) {
    error(`Unknown example: ${exampleName}\n\nAvailable examples:\n${Object.keys(EXAMPLES_MAP).map(k => `  - ${k}`).join('\n')}`);
  }

  const example = EXAMPLES_MAP[exampleName];
  const contractPath = path.join(rootDir, example.contract);
  const testPath = path.join(rootDir, example.test);

  // Validate paths exist
  if (!fs.existsSync(contractPath)) {
    error(`Contract not found: ${example.contract}`);
  }
  if (!fs.existsSync(testPath)) {
    error(`Test not found: ${example.test}`);
  }

  info(`Creating FHEVM example: ${exampleName}`);
  info(`Output directory: ${outputDir}`);

  // Step 1: Copy template
  log('\n📋 Step 1: Copying template...', Color.Cyan);
  if (fs.existsSync(outputDir)) {
    error(`Output directory already exists: ${outputDir}`);
  }
  copyDirectoryRecursive(templateDir, outputDir);
  success('Template copied');

  // Step 2: Copy contract
  log('\n📄 Step 2: Copying contract...', Color.Cyan);
  const contractName = getContractName(contractPath);
  if (!contractName) {
    error('Could not extract contract name from contract file');
  }
  const destContractPath = path.join(outputDir, 'contracts', `${contractName}.sol`);

  // Remove template contract
  const templateContract = path.join(outputDir, 'contracts', 'FHECounter.sol');
  if (fs.existsSync(templateContract)) {
    fs.unlinkSync(templateContract);
  }

  fs.copyFileSync(contractPath, destContractPath);
  success(`Contract copied: ${contractName}.sol`);

  // Step 3: Copy test
  log('\n🧪 Step 3: Copying test...', Color.Cyan);
  const destTestPath = path.join(outputDir, 'test', path.basename(testPath));

  // Remove template tests
  const testDir = path.join(outputDir, 'test');
  if (fs.existsSync(testDir)) {
    fs.readdirSync(testDir).forEach(file => {
      if (file.endsWith('.ts')) {
        fs.unlinkSync(path.join(testDir, file));
      }
    });
  }

  fs.copyFileSync(testPath, destTestPath);
  success(`Test copied: ${path.basename(testPath)}`);

  // Copy test fixture if it exists
  if (example.testFixture) {
    const fixtureSourcePath = path.join(rootDir, example.testFixture);
    if (fs.existsSync(fixtureSourcePath)) {
      const destFixturePath = path.join(outputDir, 'test', path.basename(example.testFixture));
      fs.copyFileSync(fixtureSourcePath, destFixturePath);
      success(`Test fixture copied: ${path.basename(example.testFixture)}`);
    }
  }

  // Copy OpenZeppelin contracts directory if this is an OpenZeppelin example
  if (example.category === 'openzeppelin') {
    log('\n📦 Copying OpenZeppelin confidential contracts...', Color.Cyan);
    const openzeppelinContractsDir = path.join(rootDir, '..', 'openzeppelin-confidential-contracts', 'contracts');
    // Copy to contracts/@openzeppelin/confidential-contracts to match import paths
    const destOpenzeppelinDir = path.join(outputDir, 'contracts', '@openzeppelin', 'confidential-contracts');
    
    if (fs.existsSync(openzeppelinContractsDir)) {
      // Copy entire OpenZeppelin contracts directory structure
      copyDirectoryRecursive(openzeppelinContractsDir, destOpenzeppelinDir);
      log(`  ✓ Copied OpenZeppelin confidential contracts`, Color.Green);
      success('OpenZeppelin contracts copied');
      
      // Update hardhat.config.ts to resolve @openzeppelin/confidential-contracts imports
      updateHardhatConfigForOpenZeppelin(outputDir);
    } else {
      log(`  ⚠ Warning: OpenZeppelin contracts directory not found at: ${openzeppelinContractsDir}`, Color.Yellow);
      log(`  ⚠ Make sure openzeppelin-confidential-contracts is cloned in the parent directory`, Color.Yellow);
    }
  }

  // Copy dependency contracts if needed (for all examples, including OpenZeppelin)
  if (example.dependencies) {
    log('\n📦 Copying dependencies...', Color.Cyan);
    example.dependencies.forEach(depPath => {
      const fullDepPath = path.join(rootDir, depPath);
      if (fs.existsSync(fullDepPath)) {
        // Determine if it's a contract or test helper
        if (depPath.startsWith('contracts/')) {
          // It's a contract - copy to contracts/
          const contractName = path.basename(depPath);
          const destContractPath = path.join(outputDir, 'contracts', contractName);
          fs.copyFileSync(fullDepPath, destContractPath);
          log(`  ✓ ${contractName}`, Color.Green);
        } else if (depPath.startsWith('test/')) {
          // For test helpers that are contracts (like ERC20Mock.sol), copy to contracts/ instead
          if (depPath.endsWith('.sol')) {
            const contractName = path.basename(depPath);
            const destContractPath = path.join(outputDir, 'contracts', contractName);
            fs.copyFileSync(fullDepPath, destContractPath);
            log(`  ✓ ${contractName} (copied to contracts/)`, Color.Green);
          } else {
            // It's a test helper - preserve directory structure
            const testRelativePath = depPath.replace('test/', '');
            const destTestPath = path.join(outputDir, 'test', testRelativePath);
            const destTestDir = path.dirname(destTestPath);
            if (!fs.existsSync(destTestDir)) {
              fs.mkdirSync(destTestDir, { recursive: true });
            }
            fs.copyFileSync(fullDepPath, destTestPath);
            log(`  ✓ test/${testRelativePath}`, Color.Green);
          }
        }
      } else {
        log(`  ⚠ Warning: Dependency not found: ${depPath}`, Color.Yellow);
      }
    });
    if (example.dependencies.length > 0) {
      success(`Copied ${example.dependencies.length} dependency file(s)`);
    }
  }

  // Step 4: Update configuration files
  log('\n⚙️  Step 4: Updating configuration...', Color.Cyan);
  updateDeployScript(outputDir, contractName);
  updatePackageJson(outputDir, exampleName, example.description);
  updateHardhatConfig(outputDir, contractName);
  success('Configuration updated');

  // Step 5: Generate README
  log('\n📝 Step 5: Generating README...', Color.Cyan);
  const readme = generateReadme(exampleName, example.description, contractName);
  fs.writeFileSync(path.join(outputDir, 'README.md'), readme);
  success('README.md generated');

  // Step 6: Update tasks directory if it exists
  log('\n🔧 Step 6: Updating tasks...', Color.Cyan);
  const tasksDir = path.join(outputDir, 'tasks');
  if (fs.existsSync(tasksDir)) {
    // Update or remove contract-specific task file
    const oldTaskFile = path.join(tasksDir, 'FHECounter.ts');
    const newTaskFile = path.join(tasksDir, `${contractName}.ts`);

    if (fs.existsSync(oldTaskFile)) {
      // Read the task file and replace FHECounter with the new contract name
      let taskContent = fs.readFileSync(oldTaskFile, 'utf-8');

      // Replace all occurrences of FHECounter with the new contract name
      taskContent = taskContent.replace(/FHECounter/g, contractName);
      taskContent = taskContent.replace(/fheCounter/g, contractName.charAt(0).toLowerCase() + contractName.slice(1));

      // Write to new file
      fs.writeFileSync(newTaskFile, taskContent);

      // Remove old file if different name
      if (oldTaskFile !== newTaskFile) {
        fs.unlinkSync(oldTaskFile);
      }

      success(`Updated tasks/${contractName}.ts`);
    }

    // Keep accounts.ts as-is (it's generic)
    success('Tasks directory preserved');
  }
  success('Cleanup complete');

  // Step 7: Generate documentation if requested
  if (withDocs) {
    log('\n📚 Step 7: Generating documentation...', Color.Cyan);
    // Use the copied contract and test files in the output directory
    const copiedContractPath = path.join(outputDir, 'contracts', `${contractName}.sol`);
    const copiedTestPath = path.join(outputDir, 'test', path.basename(testPath));
    generateExampleDocumentation(
      outputDir,
      copiedContractPath,
      copiedTestPath,
      exampleName,
      example.description,
      contractName
    );
  }

  // Final summary
  log('\n' + '='.repeat(60), Color.Green);
  success(`FHEVM example "${exampleName}" created successfully!`);
  log('='.repeat(60), Color.Green);

  log('\n📦 Next steps:', Color.Yellow);
  log(`  cd ${path.relative(process.cwd(), outputDir)}`);
  log('  npm install');
  log('  npm run compile');
  log('  npm run test');

  log('\n🎉 Happy coding with FHEVM!', Color.Cyan);
}

// Main execution
function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    log('FHEVM Example Generator', Color.Cyan);
    log('\nUsage: ts-node scripts/create-fhevm-example.ts <example-name> [output-dir] [--with-docs]\n');
    if (Object.keys(EXAMPLES_MAP).length > 0) {
      log('Available examples:', Color.Yellow);
      Object.entries(EXAMPLES_MAP).forEach(([name, info]) => {
        log(`  ${name}`, Color.Green);
        log(`    ${info.description}`, Color.Reset);
      });
    } else {
      log('No examples configured yet. Add examples to EXAMPLES_MAP in this script.', Color.Yellow);
    }
    log('\nOptions:', Color.Yellow);
    log('  --with-docs    Generate comprehensive documentation from code annotations');
    log('\nExamples:', Color.Yellow);
    log('  ts-node scripts/create-fhevm-example.ts fhe-counter ./my-fhe-counter');
    log('  ts-node scripts/create-fhevm-example.ts fhe-counter ./my-fhe-counter --with-docs\n');
    process.exit(0);
  }

  // Parse arguments
  const exampleName = args[0];
  let outputDir: string | undefined;
  let withDocs = false;

  // Check for --with-docs flag (can be anywhere in args)
  const flagIndex = args.indexOf('--with-docs');
  if (flagIndex !== -1) {
    withDocs = true;
    // Remove flag from args array
    args.splice(flagIndex, 1);
  }

  // Get outputDir (now at index 1 after flag removal, or original index 1)
  outputDir = args[1];

  // Set default output directory if not provided
  if (!outputDir) {
    outputDir = path.join(process.cwd(), 'output', `fhevm-example-${exampleName}`);
  }

  createExample(exampleName, outputDir, withDocs);
}

// Only run main if this file is executed directly (not imported)
if (require.main === module) {
  main();
}

