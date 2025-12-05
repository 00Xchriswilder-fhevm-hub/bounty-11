#!/usr/bin/env ts-node

/**
 * update-dependencies.ts - Maintenance tool for updating dependencies across all examples
 *
 * Usage: ts-node scripts/update-dependencies.ts [options]
 *
 * Options:
 *   --package <name> <version>  Update specific package version
 *   --all                       Update all generated examples
 *   --base-template            Update fhevm-hardhat-template dependencies
 *   --help                      Show help
 *
 * Examples:
 *   ts-node scripts/update-dependencies.ts --package @zama-fhe/relayer-sdk 0.3.0-5
 *   ts-node scripts/update-dependencies.ts --all
 *   ts-node scripts/update-dependencies.ts --base-template
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

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

function error(message: string): never {
  log(`❌ Error: ${message}`, Color.Red);
  process.exit(1);
}

interface UpdateOptions {
  packageName?: string;
  packageVersion?: string;
  updateAll?: boolean;
  updateBaseTemplate?: boolean;
  updateMain?: boolean;
  updateCategories?: boolean;
  updateOutput?: boolean;
}

function findPackageJsonFiles(directory: string, recursive: boolean = true): string[] {
  const pattern = recursive ? '**/package.json' : 'package.json';
  return glob.sync(pattern, {
    cwd: directory,
    absolute: true,
    ignore: ['**/node_modules/**'],
  });
}

function updatePackageJson(
  packageJsonPath: string,
  packageName: string,
  version: string,
  isDevDependency: boolean = true
): boolean {
  if (!fs.existsSync(packageJsonPath)) {
    warning(`Package.json not found: ${packageJsonPath}`);
    return false;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const depsKey = isDevDependency ? 'devDependencies' : 'dependencies';
    
    if (!packageJson[depsKey]) {
      packageJson[depsKey] = {};
    }

    const oldVersion = packageJson[depsKey][packageName];
    if (oldVersion === version) {
      return false; // No change needed
    }

    packageJson[depsKey][packageName] = version;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    
    return oldVersion !== undefined;
  } catch (err) {
    warning(`Failed to update ${packageJsonPath}: ${err}`);
    return false;
  }
}

function updateBaseTemplate(packageName: string, version: string): void {
  const rootDir = path.resolve(__dirname, '..');
  const baseTemplatePath = path.join(rootDir, 'fhevm-hardhat-template', 'package.json');
  
  if (!fs.existsSync(baseTemplatePath)) {
    warning(`Base template not found: ${baseTemplatePath}`);
    return;
  }

  info(`Updating base template: ${packageName}@${version}`);
  const updated = updatePackageJson(baseTemplatePath, packageName, version);
  if (updated) {
    success(`Updated base template`);
  } else {
    info(`Base template already has correct version or package not found`);
  }
}

function updateAllExamples(packageName: string, version: string): void {
  const rootDir = path.resolve(__dirname, '..');
  const outputDir = path.join(rootDir, 'output');
  const categoriesDir = path.join(rootDir, 'categories');
  
  let updatedCount = 0;
  let skippedCount = 0;

  // Update output examples
  if (fs.existsSync(outputDir)) {
    info(`Updating examples in output/ directory...`);
    const outputFiles = findPackageJsonFiles(outputDir);
    
    for (const file of outputFiles) {
      const updated = updatePackageJson(file, packageName, version);
      if (updated) {
        updatedCount++;
        log(`  ✓ ${path.relative(rootDir, file)}`, Color.Green);
      } else {
        skippedCount++;
      }
    }
  }

  // Update category examples
  if (fs.existsSync(categoriesDir)) {
    info(`Updating examples in categories/ directory...`);
    const categoryFiles = findPackageJsonFiles(categoriesDir);
    
    for (const file of categoryFiles) {
      const updated = updatePackageJson(file, packageName, version);
      if (updated) {
        updatedCount++;
        log(`  ✓ ${path.relative(rootDir, file)}`, Color.Green);
      } else {
        skippedCount++;
      }
    }
  }

  success(`Updated ${updatedCount} package.json files, skipped ${skippedCount}`);
}

function updateMainProject(packageName: string, version: string): void {
  const rootDir = path.resolve(__dirname, '..');
  const packageJsonPath = path.join(rootDir, 'package.json');
  
  info(`Updating main project: ${packageName}@${version}`);
  const updated = updatePackageJson(packageJsonPath, packageName, version);
  if (updated) {
    success(`Updated main project`);
  } else {
    info(`Main project already has correct version or package not found`);
  }
}

function showHelp(): void {
  log('FHEVM Dependency Update Tool', Color.Cyan);
  log('\nUsage: ts-node scripts/update-dependencies.ts [options]\n');
  log('Options:', Color.Yellow);
  log('  --package <name> <version>  Update specific package version');
  log('  --all                       Update all generated examples');
  log('  --base-template             Update fhevm-hardhat-template dependencies');
  log('  --main                      Update main project dependencies');
  log('  --help                      Show this help message\n');
  log('Examples:', Color.Yellow);
  log('  # Update relayer-sdk version in all examples');
  log('  ts-node scripts/update-dependencies.ts --package @zama-fhe/relayer-sdk 0.3.0-5 --all');
  log('');
  log('  # Update base template');
  log('  ts-node scripts/update-dependencies.ts --package @fhevm/solidity ^0.9.1 --base-template');
  log('');
  log('  # Update main project');
  log('  ts-node scripts/update-dependencies.ts --package @fhevm/hardhat-plugin ^0.3.0-1 --main');
  log('');
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    process.exit(0);
  }

  const options: UpdateOptions = {};
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    if (arg === '--package' && i + 2 < args.length) {
      options.packageName = args[i + 1];
      options.packageVersion = args[i + 2];
      i += 3;
    } else if (arg === '--all') {
      options.updateAll = true;
      i++;
    } else if (arg === '--base-template') {
      options.updateBaseTemplate = true;
      i++;
    } else if (arg === '--main') {
      options.updateMain = true;
      i++;
    } else {
      error(`Unknown option: ${arg}\nUse --help for usage information`);
    }
  }

  if (!options.packageName || !options.packageVersion) {
    error('Package name and version required. Use --package <name> <version>');
  }

  log('\n' + '='.repeat(60), Color.Cyan);
  info(`Updating ${options.packageName} to ${options.packageVersion}`);
  log('='.repeat(60) + '\n', Color.Cyan);

  if (options.updateMain) {
    updateMainProject(options.packageName, options.packageVersion);
  }

  if (options.updateBaseTemplate) {
    updateBaseTemplate(options.packageName, options.packageVersion);
  }

  if (options.updateAll) {
    updateAllExamples(options.packageName, options.packageVersion);
  }

  if (!options.updateAll && !options.updateBaseTemplate && !options.updateMain) {
    warning('No update targets specified. Use --all, --base-template, or --main');
    warning('Use --help for usage information');
  }

  log('\n' + '='.repeat(60), Color.Green);
  success('Dependency update completed!');
  log('='.repeat(60) + '\n', Color.Green);
}

main();

