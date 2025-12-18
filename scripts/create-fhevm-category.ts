#!/usr/bin/env ts-node

/**
 * create-fhevm-category - CLI tool to generate FHEVM projects with multiple examples from a category
 *
 * Usage: ts-node scripts/create-fhevm-category.ts <category> [output-dir]
 *
 * Example: ts-node scripts/create-fhevm-category.ts basic ./output/fhevm-basic-examples
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
  Magenta = '\x1b[35m',
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

// Contract item interface
export interface ContractItem {
  path: string;
  test: string;
  fixture?: string;
  additionalFiles?: string[];
  skipTest?: boolean; // Skip test when creating category (file still included)
}

// Category configuration interface
export interface CategoryConfig {
  name: string;
  description: string;
  contracts: ContractItem[];
  additionalDeps?: Record<string, string>;
}

// Category definitions
export const CATEGORIES: Record<string, CategoryConfig> = {
  basic: {
    name: 'Basic FHEVM Examples',
    description: 'Fundamental FHEVM operations including encryption, decryption, and basic FHE operations',
    contracts: [
      { path: 'contracts/basic/FHECounter.sol', test: 'test/basic/FHECounter.ts' },
      { path: 'contracts/basic/encrypt/EncryptSingleValue.sol', test: 'test/basic/encrypt/EncryptSingleValue.ts' },
      { path: 'contracts/basic/encrypt/EncryptMultipleValues.sol', test: 'test/basic/encrypt/EncryptMultipleValues.ts' },
      { path: 'contracts/basic/decrypt/UserDecryptSingleValue.sol', test: 'test/basic/decrypt/UserDecryptSingleValue.ts' },
      { path: 'contracts/basic/decrypt/UserDecryptMultipleValues.sol', test: 'test/basic/decrypt/UserDecryptMultipleValues.ts' },
      { path: 'contracts/basic/decrypt/PublicDecryptSingleValue.sol', test: 'test/basic/decrypt/PublicDecryptSingleValue.ts' },
      { path: 'contracts/basic/decrypt/PublicDecryptMultipleValues.sol', test: 'test/basic/decrypt/PublicDecryptMultipleValues.ts' },
      { path: 'contracts/basic/fhe-operations/FHEAdd.sol', test: 'test/basic/fhe-operations/FHEAdd.ts' },
      { path: 'contracts/basic/fhe-operations/FHEIfThenElse.sol', test: 'test/basic/fhe-operations/FHEIfThenElse.ts' },
      { path: 'contracts/basic/fhe-operations/FHEMin.sol', test: 'test/basic/fhe-operations/FHEMin.ts' },
      { path: 'contracts/basic/fhe-operations/FHEMul.sol', test: 'test/basic/fhe-operations/FHEMul.ts' },
      { path: 'contracts/basic/fhe-operations/FHEXor.sol', test: 'test/basic/fhe-operations/FHEXor.ts' },
      { path: 'contracts/basic/fhe-operations/FHEDiv.sol', test: 'test/basic/fhe-operations/FHEDiv.ts' },
      { path: 'contracts/basic/fhe-operations/FHEBitwise.sol', test: 'test/basic/fhe-operations/FHEBitwise.ts' },
    ],
  },
  'access-control': {
    name: 'Access Control Examples',
    description: 'Demonstrates FHE access control patterns including FHE.allow(), FHE.allowThis(), and FHE.allowTransient()',
    contracts: [
      { path: 'contracts/access-control/AccessControl.sol', test: 'test/access-control/AccessControl.ts' },
      { path: 'contracts/access-control/AllowTransient.sol', test: 'test/access-control/AllowTransient.ts' },
      { path: 'contracts/access-control/PermissionExamples.sol', test: 'test/access-control/PermissionExamples.ts' },
    ],
  },
  'input-proofs': {
    name: 'Input Proof Examples',
    description: 'Explains input proofs, their usage, common mistakes, and handle lifecycle in FHEVM',
    contracts: [
      { path: 'contracts/input-proofs/InputProofBasics.sol', test: 'test/input-proofs/InputProofBasics.ts' },
      { path: 'contracts/input-proofs/InputProofUsage.sol', test: 'test/input-proofs/InputProofUsage.ts' },
      { path: 'contracts/input-proofs/InputProofAntiPatterns.sol', test: 'test/input-proofs/InputProofAntiPatterns.ts' },
      { path: 'contracts/input-proofs/HandleLifecycle.sol', test: 'test/input-proofs/HandleLifecycle.ts' },
    ],
  },
  'anti-patterns': {
    name: 'Anti-Pattern Examples',
    description: 'Common mistakes and anti-patterns in FHEVM development, showing what NOT to do',
    contracts: [
      { path: 'contracts/anti-patterns/ViewWithEncrypted.sol', test: 'test/anti-patterns/ViewWithEncrypted.ts' },
      { path: 'contracts/anti-patterns/MissingAllowThis.sol', test: 'test/anti-patterns/MissingAllowThis.ts' },
      { path: 'contracts/anti-patterns/HandleMisuse.sol', test: 'test/anti-patterns/HandleMisuse.ts' },
    ],
  },
  openzeppelin: {
    name: 'OpenZeppelin Confidential Contracts',
    description: 'Examples using OpenZeppelin confidential contracts including ERC7984 tokens, wrappers, swaps, vesting wallets, confidential voting, and RWA tokens',
    contracts: [
      { path: 'contracts/openzeppelin/ERC7984Mock.sol', test: 'test/openzeppelin/ERC7984Example.ts' },
      { path: 'contracts/openzeppelin/ERC7984ToERC20Wrapper.sol', test: 'test/openzeppelin/ERC7984ToERC20Wrapper.ts', additionalFiles: ['contracts/openzeppelin/ERC20Mock.sol'] },
      { path: 'contracts/openzeppelin/SwapERC7984ToERC20.sol', test: 'test/openzeppelin/SwapERC7984ToERC20.ts', additionalFiles: ['contracts/openzeppelin/ERC20Mock.sol'], skipTest: true },
      { path: 'contracts/openzeppelin/SwapERC7984ToERC7984.sol', test: 'test/openzeppelin/SwapERC7984ToERC7984.ts', skipTest: true },
      { path: 'contracts/openzeppelin/VestingWallet.sol', test: 'test/openzeppelin/VestingWallet.ts' },
      { path: 'contracts/openzeppelin/VestingWalletConfidentialFactoryMock.sol', test: 'test/openzeppelin/VestingWalletConfidential.ts', additionalFiles: ['contracts/openzeppelin/VestingWalletConfidential.sol'] },
      { path: 'contracts/openzeppelin/VestingWalletCliffConfidentialFactoryMock.sol', test: 'test/openzeppelin/VestingWalletCliffConfidential.ts', additionalFiles: ['contracts/openzeppelin/VestingWalletCliffConfidential.sol'] },
      { path: 'contracts/openzeppelin/ERC7984VotesMock.sol', test: 'test/openzeppelin/ERC7984VotesExample.ts' },
      { path: 'contracts/openzeppelin/ERC7984RwaMock.sol', test: 'test/openzeppelin/ERC7984RwaExample.ts' },
      { path: 'contracts/openzeppelin/ERC7984OmnibusMock.sol', test: 'test/openzeppelin/ERC7984OmnibusExample.ts' },
    ],
    additionalDeps: {
      '@openzeppelin/confidential-contracts': '^0.3.0',
      '@openzeppelin/contracts': '^5.4.0',
    },
  },
  advanced: {
    name: 'Advanced FHEVM Examples',
    description: 'Complex FHEVM applications including vaults, voting systems, rating systems, blind auctions, and portfolio management',
    contracts: [
      { path: 'contracts/advanced/FHELegacyVault.sol', test: 'test/advanced/FHELegacyVault.ts' },
      { path: 'contracts/advanced/SimpleVoting.sol', test: 'test/advanced/SimpleVoting.ts' },
      { path: 'contracts/advanced/ReviewCardsFHE.sol', test: 'test/advanced/ReviewCardsFHE.ts' },
      { path: 'contracts/advanced/BlindAuction.sol', test: 'test/advanced/BlindAuction.ts' },
      { path: 'contracts/advanced/ConfidentialPortfolioRebalancer.sol', test: 'test/advanced/ConfidentialPortfolioRebalancer.ts', additionalFiles: ['contracts/openzeppelin/ERC7984Mock.sol'] },
    ],
  },
};

function copyDirectoryRecursive(source: string, destination: string, excludeDirs: string[] = []): void {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  const items = fs.readdirSync(source);

  items.forEach(item => {
    const sourcePath = path.join(source, item);
    const destPath = path.join(destination, item);
    const stat = fs.statSync(sourcePath);

    if (stat.isDirectory()) {
      if (excludeDirs.includes(item)) {
        return;
      }
      copyDirectoryRecursive(sourcePath, destPath, excludeDirs);
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
  const match = content.match(/^\s*contract\s+(\w+)(?:\s+is\s+|\s*\{)/m);
  return match ? match[1] : null;
}

function generateDeployScript(contractNames: string[]): string {
  return `import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

${contractNames.map(name => `  // Deploy ${name}
  const deployed${name} = await deploy("${name}", {
    from: deployer,
    log: true,
  });
  console.log(\`${name} contract: \${deployed${name}.address}\`);
`).join('\n')}
};

export default func;
func.id = "deploy_all";
func.tags = ["all", ${contractNames.map(n => `"${n}"`).join(', ')}];
`;
}

function generateReadme(category: string, contractNames: string[]): string {
  const categoryInfo = CATEGORIES[category];

  return `# FHEVM Examples: ${categoryInfo.name}

${categoryInfo.description}

## 📦 Included Examples

This project contains ${contractNames.length} example contract${contractNames.length > 1 ? 's' : ''}:

${contractNames.map((name, i) => `${i + 1}. **${name}**`).join('\n')}

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

3. **Compile all contracts**

   \`\`\`bash
   npm run compile
   \`\`\`

4. **Run all tests**

   \`\`\`bash
   npm run test
   \`\`\`

## Contracts

${contractNames.map(name => `### ${name}

Located in \`contracts/${name}.sol\`

Run specific tests:
\`\`\`bash
npx hardhat test test/${name}.ts
\`\`\`
`).join('\n')}

## Deployment

### Local Network

\`\`\`bash
# Start local node
npx hardhat node

# Deploy all contracts
npx hardhat deploy --network localhost
\`\`\`

### Sepolia Testnet

\`\`\`bash
# Deploy all contracts
npx hardhat deploy --network sepolia

# Verify contracts
${contractNames.map(name => `npx hardhat verify --network sepolia <${name.toUpperCase()}_ADDRESS>`).join('\n')}
\`\`\`

## Available Scripts

| Script | Description |
|--------|-------------|
| \`npm run compile\` | Compile all contracts |
| \`npm run test\` | Run all tests |
| \`npm run test:sepolia\` | Run tests on Sepolia |
| \`npm run lint\` | Run all linters |
| \`npm run lint:sol\` | Lint Solidity only |
| \`npm run lint:ts\` | Lint TypeScript only |
| \`npm run prettier:check\` | Check formatting |
| \`npm run prettier:write\` | Auto-format code |
| \`npm run clean\` | Clean build artifacts |
| \`npm run coverage\` | Generate coverage report |

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

function createCategoryProject(category: string, outputDir: string): void {
  const rootDir = path.resolve(__dirname, '..');
  // fhevm-hardhat-template is inside zama-bounty-11
  const templateDir = path.join(rootDir, 'fhevm-hardhat-template');

  // Validate category
  if (!CATEGORIES[category]) {
    error(`Unknown category: ${category}\n\nAvailable categories:\n${Object.keys(CATEGORIES).map(k => `  - ${k}: ${CATEGORIES[k].name}`).join('\n')}`);
  }

  // Check if template exists
  if (!fs.existsSync(templateDir)) {
    error(`Base template not found: ${templateDir}\nPlease ensure fhevm-hardhat-template is cloned from https://github.com/zama-ai/fhevm-hardhat-template`);
  }

  const categoryInfo = CATEGORIES[category];
  info(`Creating FHEVM project: ${categoryInfo.name}`);
  info(`Output directory: ${outputDir}`);

  // Check if output directory exists
  if (fs.existsSync(outputDir)) {
    error(`Output directory already exists: ${outputDir}`);
  }

  // Step 1: Copy template
  log('\n📋 Step 1: Copying template...', Color.Cyan);
  copyDirectoryRecursive(templateDir, outputDir, ['node_modules', 'artifacts', 'cache', 'coverage', 'types', 'dist', '.git']);
  success('Template copied');

  // Step 2: Clear template contracts and tests
  log('\n🧹 Step 2: Clearing template files...', Color.Cyan);
  const contractsDir = path.join(outputDir, 'contracts');
  const testsDir = path.join(outputDir, 'test');

  // Remove template contract
  fs.readdirSync(contractsDir).forEach(file => {
    if (file.endsWith('.sol')) {
      fs.unlinkSync(path.join(contractsDir, file));
    }
  });

  // Remove template tests
  fs.readdirSync(testsDir).forEach(file => {
    if (file.endsWith('.ts')) {
      fs.unlinkSync(path.join(testsDir, file));
    }
  });
  success('Template files cleared');

  // Step 3: Copy all contracts and tests from category
  log('\n📄 Step 3: Copying contracts and tests...', Color.Cyan);
  const contractNames: string[] = [];
  const copiedTests = new Set<string>();

  categoryInfo.contracts.forEach(({ path: contractPath, test: testPath, fixture, additionalFiles, skipTest }) => {
    // Copy contract - preserve directory structure
    const fullContractPath = path.join(rootDir, contractPath);
    if (!fs.existsSync(fullContractPath)) {
      log(`Warning: Contract not found: ${contractPath}`, Color.Yellow);
      return;
    }

    const contractName = getContractName(fullContractPath);
    if (contractName) {
      contractNames.push(contractName);
      
      // Remove 'contracts/' prefix and category name (e.g., contracts/basic/encrypt/ -> encrypt/)
      let contractRelativePath = contractPath.replace('contracts/', '');
      // Remove category prefix if present (e.g., basic/encrypt/ -> encrypt/)
      if (contractRelativePath.startsWith(`${category}/`)) {
        contractRelativePath = contractRelativePath.replace(`${category}/`, '');
      }
      
      const subDir = path.dirname(contractRelativePath);
      
      // If there's a subdirectory, preserve it (e.g., encrypt/, decrypt/, fhe-operations/)
      let destContractPath: string;
      if (subDir && subDir !== '.') {
        const destSubDir = path.join(contractsDir, subDir);
        if (!fs.existsSync(destSubDir)) {
          fs.mkdirSync(destSubDir, { recursive: true });
        }
        destContractPath = path.join(destSubDir, path.basename(contractPath));
      } else {
        destContractPath = path.join(contractsDir, path.basename(contractPath));
      }
      
      // Read contract content and fix import paths for additional files
      let contractContent = fs.readFileSync(fullContractPath, 'utf-8');
      
      // Fix import paths for openzeppelin contracts when copying to category
      // Change ../openzeppelin/ to ./openzeppelin/ or openzeppelin/ depending on structure
      if (additionalFiles) {
        additionalFiles.forEach(filePath => {
          if (filePath.startsWith('contracts/openzeppelin/')) {
            const fileName = path.basename(filePath);
            // Replace ../openzeppelin/ with ./openzeppelin/ or openzeppelin/
            contractContent = contractContent.replace(
              /from\s+["']\.\.\/openzeppelin\/([^"']+)["']/g,
              `from "./openzeppelin/$1"`
            );
          }
        });
      }
      
      fs.writeFileSync(destContractPath, contractContent);
      log(`  ✓ ${contractRelativePath}`, Color.Green);
    }

    // Copy test - preserve directory structure (skip if skipTest is true)
    const fullTestPath = path.join(rootDir, testPath);
    if (!skipTest && fs.existsSync(fullTestPath) && !copiedTests.has(testPath)) {
      // Remove 'test/' prefix and category name (e.g., test/basic/encrypt/ -> encrypt/)
      let testRelativePath = testPath.replace('test/', '');
      // Remove category prefix if present (e.g., basic/encrypt/ -> encrypt/)
      if (testRelativePath.startsWith(`${category}/`)) {
        testRelativePath = testRelativePath.replace(`${category}/`, '');
      }
      
      const subDir = path.dirname(testRelativePath);
      
      // If there's a subdirectory, preserve it (e.g., encrypt/, decrypt/, fhe-operations/)
      let destTestPath: string;
      if (subDir && subDir !== '.') {
        const destSubDir = path.join(testsDir, subDir);
        if (!fs.existsSync(destSubDir)) {
          fs.mkdirSync(destSubDir, { recursive: true });
        }
        destTestPath = path.join(destSubDir, path.basename(testPath));
      } else {
        destTestPath = path.join(testsDir, path.basename(testPath));
      }
      
      fs.copyFileSync(fullTestPath, destTestPath);
      copiedTests.add(testPath);
      log(`  ✓ ${testRelativePath}`, Color.Green);
    }

    // Copy fixture if exists
    if (fixture) {
      const fullFixturePath = path.join(rootDir, fixture);
      if (fs.existsSync(fullFixturePath) && !copiedTests.has(fixture)) {
        const fixtureFileName = path.basename(fixture);
        const destFixturePath = path.join(testsDir, fixtureFileName);
        fs.copyFileSync(fullFixturePath, destFixturePath);
        copiedTests.add(fixture);
        log(`  ✓ ${fixtureFileName}`, Color.Green);
      }
    }

    // Copy additional files if any
    if (additionalFiles) {
      additionalFiles.forEach(filePath => {
        const fullFilePath = path.join(rootDir, filePath);
        if (fs.existsSync(fullFilePath)) {
          // Determine if it's a contract or test helper
          if (filePath.startsWith('contracts/')) {
            // It's a contract - preserve directory structure if it has subdirectories
            const contractRelativePath = filePath.replace('contracts/', '');
            const subDir = path.dirname(contractRelativePath);
            
            let destContractPath: string;
            if (subDir && subDir !== '.') {
              // Preserve subdirectory structure (e.g., openzeppelin/)
              const destSubDir = path.join(contractsDir, subDir);
              if (!fs.existsSync(destSubDir)) {
                fs.mkdirSync(destSubDir, { recursive: true });
              }
              destContractPath = path.join(destSubDir, path.basename(filePath));
            } else {
              // No subdirectory, copy to root contracts directory
              const contractName = path.basename(filePath);
              destContractPath = path.join(contractsDir, contractName);
            }
            fs.copyFileSync(fullFilePath, destContractPath);
            log(`  ✓ ${contractRelativePath} (dependency)`, Color.Green);
          } else if (filePath.startsWith('test/')) {
            // It's a test helper - copy to test directory
            const fileName = path.basename(filePath);
            const destFilePath = path.join(testsDir, fileName);
            fs.copyFileSync(fullFilePath, destFilePath);
            log(`  ✓ ${fileName} (test helper)`, Color.Green);
          } else {
            // Default to contracts directory
            const fileName = path.basename(filePath);
            const destFilePath = path.join(contractsDir, fileName);
            fs.copyFileSync(fullFilePath, destFilePath);
            log(`  ✓ ${fileName} (dependency)`, Color.Green);
          }
        } else {
          log(`  ⚠ Warning: Additional file not found: ${filePath}`, Color.Yellow);
        }
      });
    }
  });

  success(`Copied ${contractNames.length} contracts and their tests`);

  // Step 4: Generate deployment script
  log('\n⚙️  Step 4: Generating deployment script...', Color.Cyan);
  const deployScript = generateDeployScript(contractNames);
  const deployPath = path.join(outputDir, 'deploy', 'deploy.ts');
  fs.writeFileSync(deployPath, deployScript);
  success('Deployment script generated');

  // Step 5: Update package.json
  log('\n📦 Step 5: Updating package.json...', Color.Cyan);
  const packageJsonPath = path.join(outputDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  packageJson.name = `fhevm-examples-${category}`;
  packageJson.description = categoryInfo.description;
  packageJson.homepage = `https://github.com/zama-ai/fhevm-examples/${category}`;

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

  // Add additional dependencies if needed (as devDependencies)
  if (categoryInfo.additionalDeps) {
    if (!packageJson.devDependencies) {
      packageJson.devDependencies = {};
    }
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      ...categoryInfo.additionalDeps,
    };
  }

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  // Delete package-lock.json so npm will regenerate it with correct versions
  // The template's package-lock.json has 0.3.0-6 locked, which causes the error
  const packageLockPath = path.join(outputDir, 'package-lock.json');
  if (fs.existsSync(packageLockPath)) {
    fs.unlinkSync(packageLockPath);
  }

  success('package.json updated');

  // Step 6: Generate README
  log('\n📝 Step 6: Generating README...', Color.Cyan);
  const readme = generateReadme(category, contractNames);
  fs.writeFileSync(path.join(outputDir, 'README.md'), readme);
  success('README.md generated');

  // Final summary
  log('\n' + '='.repeat(60), Color.Green);
  success(`FHEVM ${categoryInfo.name} project created successfully!`);
  log('='.repeat(60), Color.Green);

  log('\n📊 Project Summary:', Color.Magenta);
  log(`  Category: ${categoryInfo.name}`);
  log(`  Contracts: ${contractNames.length}`);
  log(`  Location: ${path.relative(process.cwd(), outputDir)}`);

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
    log('FHEVM Category Project Generator', Color.Cyan);
    log('\nUsage: ts-node scripts/create-fhevm-category.ts <category> [output-dir]\n');
    if (Object.keys(CATEGORIES).length > 0) {
      log('Available categories:', Color.Yellow);
      Object.entries(CATEGORIES).forEach(([key, info]) => {
        log(`  ${key}`, Color.Green);
        log(`    ${info.name}`, Color.Cyan);
        log(`    ${info.description}`, Color.Reset);
        log(`    Contracts: ${info.contracts.length}`, Color.Blue);
      });
    } else {
      log('No categories configured yet. Add categories to CATEGORIES in this script.', Color.Yellow);
    }
    log('\nExamples:', Color.Yellow);
    log('  ts-node scripts/create-fhevm-category.ts basic ./output/basic-examples');
    log('  ts-node scripts/create-fhevm-category.ts auctions ./output/auction-examples\n');
    process.exit(0);
  }

  const category = args[0];
  const outputDir = args[1] || path.join(process.cwd(), 'categories', `fhevm-examples-${category}`);

  createCategoryProject(category, outputDir);
}

// Only run main if this file is executed directly (not imported)
if (require.main === module) {
  main();
}

