#!/usr/bin/env ts-node

/**
 * generate-all-examples-and-test.ts - Generate all examples with docs and run tests
 *
 * Usage: ts-node scripts/generate-all-examples-and-test.ts [options]
 *
 * Options:
 *   --skip-test          Skip running tests (only generate examples)
 *   --skip-compile       Skip compilation (assume already compiled)
 *   --category <name>    Only generate examples from specific category
 *   --help               Show help
 *
 * Examples:
 *   ts-node scripts/generate-all-examples-and-test.ts
 *   ts-node scripts/generate-all-examples-and-test.ts --skip-test
 *   ts-node scripts/generate-all-examples-and-test.ts --category basic
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
  Magenta = '\x1b[35m',
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

function warning(message: string): void {
  log(`⚠️  ${message}`, Color.Yellow);
}

function error(message: string): void {
  log(`❌ Error: ${message}`, Color.Red);
}

interface ExampleConfig {
  name: string;
  category: string;
}

// All examples organized by category (matching EXAMPLES_MAP keys)
const EXAMPLES_BY_CATEGORY: Record<string, ExampleConfig[]> = {
  basic: [
    { name: 'fhe-counter', category: 'basic' },
    { name: 'encrypt-single-value', category: 'basic' },
    { name: 'encrypt-multiple-values', category: 'basic' },
    { name: 'user-decrypt-single-value', category: 'basic' },
    { name: 'user-decrypt-multiple-values', category: 'basic' },
    { name: 'public-decrypt-single-value', category: 'basic' },
    { name: 'public-decrypt-multiple-values', category: 'basic' },
    { name: 'fhe-add', category: 'basic' },
    { name: 'fhe-if-then-else', category: 'basic' },
    { name: 'fhe-min', category: 'basic' },
    { name: 'fhe-mul', category: 'basic' },
    { name: 'fhe-xor', category: 'basic' },
    { name: 'fhe-div', category: 'basic' },
    { name: 'fhe-bitwise', category: 'basic' },
    { name: 'fhe-sub', category: 'basic' },
    { name: 'fhe-rem', category: 'basic' },
    { name: 'fhe-max', category: 'basic' },
    { name: 'fhe-comparison', category: 'basic' },
  ],
  'access-control': [
    { name: 'access-control', category: 'access-control' },
    { name: 'allow-transient', category: 'access-control' },
    { name: 'permission-examples', category: 'access-control' },
  ],
  'input-proofs': [
    { name: 'input-proof-basics', category: 'input-proofs' },
    { name: 'input-proof-usage', category: 'input-proofs' },
    { name: 'input-proof-anti-patterns', category: 'input-proofs' },
    { name: 'handle-lifecycle', category: 'input-proofs' },
  ],
  'anti-patterns': [
    { name: 'fhe-permissions-anti-patterns', category: 'anti-patterns' },
    { name: 'missing-allow-this', category: 'anti-patterns' },
    { name: 'handle-misuse', category: 'anti-patterns' },
  ],
  openzeppelin: [
    { name: 'erc7984-example', category: 'openzeppelin' },
    { name: 'erc7984-to-erc20-wrapper', category: 'openzeppelin' },
    { name: 'vesting-wallet', category: 'openzeppelin' },
    { name: 'vesting-wallet-confidential', category: 'openzeppelin' },
    { name: 'vesting-wallet-cliff-confidential', category: 'openzeppelin' },
    { name: 'confidential-voting', category: 'openzeppelin' },
    { name: 'erc7984-rwa', category: 'openzeppelin' },
    { name: 'erc7984-omnibus', category: 'openzeppelin' },
    { name: 'swap-erc7984-to-erc20', category: 'openzeppelin' },
    { name: 'swap-erc7984-to-erc7984', category: 'openzeppelin' },
  ],
  advanced: [
    { name: 'fhe-legacy-vault', category: 'advanced' },
    { name: 'simple-voting', category: 'advanced' },
    { name: 'review-cards-fhe', category: 'advanced' },
    { name: 'blind-auction', category: 'advanced' },
    { name: 'confidential-portfolio-rebalancer', category: 'advanced' },
    { name: 'confidential-lending-pool', category: 'advanced' },
    { name: 'confidential-yield-aggregator', category: 'advanced' },
  ],
};

function getAllExamples(): ExampleConfig[] {
  return Object.values(EXAMPLES_BY_CATEGORY).flat();
}

function getExamplesByCategory(category: string): ExampleConfig[] {
  return EXAMPLES_BY_CATEGORY[category] || [];
}

function generateExample(exampleName: string, outputDir: string): boolean {
  try {
    // Remove existing directory if it exists (to allow regeneration)
    if (fs.existsSync(outputDir)) {
      info(`Removing existing directory: ${outputDir}`);
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
    
    info(`Generating ${exampleName}...`);
    const command = `npm run create-example -- ${exampleName} ${outputDir} --with-docs`;
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
    success(`Generated ${exampleName}`);
    return true;
  } catch (err) {
    error(`Failed to generate ${exampleName}: ${err}`);
    return false;
  }
}

function runTests(outputDir: string): boolean {
  try {
    if (!fs.existsSync(outputDir)) {
      warning(`Output directory not found: ${outputDir}`);
      return false;
    }

    const packageJsonPath = path.join(outputDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      warning(`package.json not found in ${outputDir}`);
      return false;
    }

    info(`Running tests in ${path.basename(outputDir)}...`);
    execSync('npm test', { 
      stdio: 'inherit', 
      cwd: outputDir,
      env: { ...process.env, CI: 'true' } // Set CI to avoid interactive prompts
    });
    success(`Tests passed for ${path.basename(outputDir)}`);
    return true;
  } catch (err) {
    error(`Tests failed for ${path.basename(outputDir)}: ${err}`);
    return false;
  }
}

function showHelp(): void {
  log('FHEVM Generate All Examples and Test Tool', Color.Cyan);
  log('\nUsage: ts-node scripts/generate-all-examples-and-test.ts [options]\n');
  log('Options:', Color.Yellow);
  log('  --skip-test          Skip running tests (only generate examples)');
  log('  --skip-compile       Skip compilation (assume already compiled)');
  log('  --category <name>    Only generate examples from specific category');
  log('  --help               Show this help message\n');
  log('Available categories:', Color.Yellow);
  Object.keys(EXAMPLES_BY_CATEGORY).forEach(cat => {
    log(`  - ${cat} (${EXAMPLES_BY_CATEGORY[cat].length} examples)`);
  });
  log('\nExamples:', Color.Yellow);
  log('  # Generate all examples and run tests');
  log('  ts-node scripts/generate-all-examples-and-test.ts');
  log('');
  log('  # Generate all examples without tests');
  log('  ts-node scripts/generate-all-examples-and-test.ts --skip-test');
  log('');
  log('  # Generate only basic examples');
  log('  ts-node scripts/generate-all-examples-and-test.ts --category basic');
  log('');
}

function main(): void {
  const args = process.argv.slice(2);
  const rootDir = path.resolve(__dirname, '..');
  const outputBaseDir = path.join(rootDir, 'output');

  if (args.length > 0 && (args[0] === '--help' || args[0] === '-h')) {
    showHelp();
    process.exit(0);
  }

  const skipTest = args.includes('--skip-test');
  const skipCompile = args.includes('--skip-compile');
  const categoryIndex = args.indexOf('--category');
  const category = categoryIndex >= 0 && categoryIndex + 1 < args.length 
    ? args[categoryIndex + 1] 
    : null;

  // Get examples to process
  const examples = category 
    ? getExamplesByCategory(category)
    : getAllExamples();

  if (examples.length === 0) {
    error(`No examples found${category ? ` for category: ${category}` : ''}`);
    process.exit(1);
  }

  log('\n' + '='.repeat(60), Color.Cyan);
  info(`Generating ${examples.length} example(s)${category ? ` from category: ${category}` : ''}`);
  if (skipTest) {
    warning('Tests will be skipped');
  }
  log('='.repeat(60) + '\n', Color.Cyan);

  // Ensure output directory exists
  if (!fs.existsSync(outputBaseDir)) {
    fs.mkdirSync(outputBaseDir, { recursive: true });
  }

  let successCount = 0;
  let failCount = 0;
  const failedExamples: string[] = [];

  // Process each example
  for (const example of examples) {
    const outputDir = path.join(outputBaseDir, example.name);
    
    log(`\n${'─'.repeat(60)}`, Color.Cyan);
    info(`Processing: ${example.name} (${example.category})`);
    log(`${'─'.repeat(60)}\n`, Color.Cyan);

    // Generate example
    const generated = generateExample(example.name, outputDir);
    
    if (!generated) {
      failCount++;
      failedExamples.push(example.name);
      continue;
    }

    // Run tests if not skipped
    if (!skipTest) {
      log(`\n${'─'.repeat(60)}`, Color.Cyan);
      info(`Running tests for: ${example.name}`);
      log(`${'─'.repeat(60)}\n`, Color.Cyan);
      const testPassed = runTests(outputDir);
      if (!testPassed) {
        failCount++;
        failedExamples.push(example.name);
        continue;
      }
    } else {
      info(`Skipping tests for ${example.name} (--skip-test flag)`);
    }

    successCount++;
  }

  // Summary
  log('\n' + '='.repeat(60), Color.Cyan);
  log('SUMMARY', Color.Cyan);
  log('='.repeat(60), Color.Cyan);
  success(`Successfully processed: ${successCount}/${examples.length}`);
  
  if (failCount > 0) {
    error(`Failed: ${failCount}/${examples.length}`);
    warning('Failed examples:');
    failedExamples.forEach(name => {
      log(`  - ${name}`, Color.Red);
    });
  } else {
    success('All examples generated and tested successfully!');
  }
  log('='.repeat(60) + '\n', Color.Cyan);
}

main();

