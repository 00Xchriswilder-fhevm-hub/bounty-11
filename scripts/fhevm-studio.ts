#!/usr/bin/env ts-node

/**
 * FHEVM Studio - Interactive Development & Testing Experience
 * 
 * A beautiful, interactive CLI tool that lets you explore, generate, and test
 * all FHEVM examples interactively with an intuitive interface.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as readline from 'readline';
import { EXAMPLES_MAP } from './create-fhevm-example';
import { CATEGORIES } from './create-fhevm-category';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(message: string, color: string = colors.reset): void {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message: string): void {
  log(`✅ ${message}`, colors.green);
}

function error(message: string): void {
  log(`❌ ${message}`, colors.red);
}

function info(message: string): void {
  log(`ℹ️  ${message}`, colors.blue);
}

function warning(message: string): void {
  log(`⚠️  ${message}`, colors.yellow);
}

function title(message: string): void {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(message, colors.cyan + colors.bright);
  log('='.repeat(60), colors.cyan);
}

function showBanner(): void {
  const banner = `
${colors.magenta}${colors.bright}
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║                    🎨   F H E V M   S T U D I O   🎨                         ║
║                                                                               ║
║     ███████╗██╗  ██╗███████╗██╗   ██╗███╗   ███╗                              ║
║     ██╔════╝██║  ██║██╔════╝██║   ██║████╗ ████║                              ║
║     █████╗  ███████║█████╗  ██║   ██║██╔████╔██║                              ║
║     ██╔══╝  ██╔══██║██╔══╝  ╚██╗ ██╔╝██║╚██╔╝██║                              ║
║     ██║     ██║  ██║███████╗ ╚████╔╝ ██║ ╚═╝ ██║                              ║
║     ╚═╝     ╚═╝  ╚═╝╚══════╝  ╚═══╝  ╚═╝     ╚═╝                              ║
║                                                                               ║
║     ███████╗████████╗██╗   ██╗██████╗ ██╗ ██████╗                             ║
║     ██╔════╝╚══██╔══╝██║   ██║██╔══██╗██║██╔═══██╗                            ║
║     ███████╗   ██║   ██║   ██║██║  ██║██║██║   ██║                            ║
║     ╚════██║   ██║   ██║   ██║██║  ██║██║██║   ██║                            ║
║     ███████║   ██║   ╚██████╔╝██████╔╝██║╚██████╔╝                            ║
║     ╚══════╝   ╚═╝    ╚═════╝ ╚═════╝ ╚═╝ ╚═════╝                             ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
${colors.reset}

${colors.cyan}${colors.bright}
        🚀  Your Interactive Workspace for FHEVM Development & Exploration  🚀
${colors.reset}

`;

  console.log(banner);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function selectFromList<T>(
  items: Array<{ name: string; value: T; description?: string }>,
  prompt: string
): Promise<T> {
  log(`\n${prompt}`, colors.cyan);
  log('', colors.reset);
  
  items.forEach((item, index) => {
    const desc = item.description ? ` - ${item.description}` : '';
    log(`  ${index + 1}. ${item.name}${desc}`, colors.cyan);
  });
  
  while (true) {
    const answer = await question(`\nSelect (1-${items.length}): `);
    const trimmed = answer.trim();
    const index = parseInt(trimmed) - 1;
    
    if (!isNaN(index) && index >= 0 && index < items.length) {
      return items[index].value;
    }
    
    error(`Invalid selection "${trimmed}". Please enter a number between 1 and ${items.length}.`);
  }
}

async function confirm(prompt: string, defaultValue: boolean = true): Promise<boolean> {
  const defaultText = defaultValue ? 'Y/n' : 'y/N';
  const answer = await question(`${prompt} (${defaultText}): `);
  
  if (answer.trim() === '') {
    return defaultValue;
  }
  
  return answer.toLowerCase().startsWith('y');
}

class FHEVMStudio {
  private sessionData: {
    startTime: Date;
    examplesGenerated: string[];
    examplesTested: string[];
    errors: Array<{ example: string; error: string }>;
  };

  constructor() {
    this.sessionData = {
      startTime: new Date(),
      examplesGenerated: [],
      examplesTested: [],
      errors: [],
    };
  }

  async showMainMenu(): Promise<string> {
    showBanner();
    
    const choices = [
      { name: ' Generate Single Example', value: 'single', description: 'Generate and test one example' },
      { name: ' Generate Category Project', value: 'category', description: 'Generate all examples in a category' },
      { name: ' Test Generated Example', value: 'test', description: 'Test an already generated example' },
      { name: ' Generate Documentation', value: 'docs', description: 'Generate documentation for examples' },
      { name: ' Update Dependencies', value: 'update-deps', description: 'Update package dependencies across examples' },
      { name: ' Cleanup Test Outputs', value: 'cleanup', description: 'Remove test output directories' },
      { name: ' Show Available Examples', value: 'list', description: 'List all available examples' },
      { name: ' Generate All Examples and Test', value: 'generate-all', description: 'Generate all examples with docs and run tests' },
      { name: ' Exit Studio', value: 'exit', description: 'Exit FHEVM Studio' },
    ];
    
    return await selectFromList(choices, 'What would you like to do?');
  }

  showExampleList(): void {
    const examples = Object.keys(EXAMPLES_MAP).map(key => ({
      name: `${key}`,
      value: key,
      description: EXAMPLES_MAP[key].description,
    }));
    
    const basicExamples = examples.filter(e => 
      EXAMPLES_MAP[e.value].category === 'basic'
    );
    const accessControlExamples = examples.filter(e => 
      EXAMPLES_MAP[e.value].category === 'access-control'
    );
    const inputProofExamples = examples.filter(e => 
      EXAMPLES_MAP[e.value].category === 'input-proofs'
    );
    const antiPatternExamples = examples.filter(e => 
      EXAMPLES_MAP[e.value].category === 'anti-patterns'
    );
    const openzeppelinExamples = examples.filter(e => 
      EXAMPLES_MAP[e.value].category === 'openzeppelin'
    );
    const advancedExamples = examples.filter(e => 
      EXAMPLES_MAP[e.value].category === 'advanced'
    );
    
    title('📚 Available Examples');
    
    if (basicExamples.length > 0) {
      log('\n  Basic Examples:', colors.cyan);
      basicExamples.forEach((ex) => {
        log(`    • ${ex.name}`, colors.gray);
        log(`      ${ex.description}`, colors.gray);
      });
    }
    
    if (accessControlExamples.length > 0) {
      log('\n  Access Control:', colors.cyan);
      accessControlExamples.forEach((ex) => {
        log(`    • ${ex.name}`, colors.gray);
        log(`      ${ex.description}`, colors.gray);
      });
    }
    
    if (inputProofExamples.length > 0) {
      log('\n  Input Proofs:', colors.cyan);
      inputProofExamples.forEach((ex) => {
        log(`    • ${ex.name}`, colors.gray);
        log(`      ${ex.description}`, colors.gray);
      });
    }
    
    if (antiPatternExamples.length > 0) {
      log('\n  Anti-Patterns:', colors.cyan);
      antiPatternExamples.forEach((ex) => {
        log(`    • ${ex.name}`, colors.gray);
        log(`      ${ex.description}`, colors.gray);
      });
    }
    
    if (openzeppelinExamples.length > 0) {
      log('\n  OpenZeppelin:', colors.cyan);
      openzeppelinExamples.forEach((ex) => {
        log(`    • ${ex.name}`, colors.gray);
        log(`      ${ex.description}`, colors.gray);
      });
    }
    
    if (advancedExamples.length > 0) {
      log('\n  Advanced:', colors.cyan);
      advancedExamples.forEach((ex) => {
        log(`    • ${ex.name}`, colors.gray);
        log(`      ${ex.description}`, colors.gray);
      });
    }
    
    log('', colors.reset);
  }

  async showExampleMenu(): Promise<string> {
    const examples = Object.keys(EXAMPLES_MAP).map(key => ({
      name: `${key} - ${EXAMPLES_MAP[key].description}`,
      value: key,
    }));
    
    return await selectFromList(examples, 'Select an example to generate:');
  }

  async showCategoryMenu(): Promise<string> {
    const categories = Object.keys(CATEGORIES).map(key => ({
      name: `${key} - ${CATEGORIES[key].name}`,
      value: key,
      description: CATEGORIES[key].description,
    }));
    
    return await selectFromList(categories, 'Select a category to generate:');
  }

  async generateExample(exampleName: string, withDocs: boolean = false): Promise<boolean> {
    title(`Generating: ${exampleName}`);
    
    const outputDir = `./output/${exampleName}`;
    
    if (fs.existsSync(outputDir)) {
      const overwrite = await confirm(`Directory ${outputDir} already exists. Overwrite?`, false);
      if (!overwrite) {
        warning('Skipped generation.');
        return false;
      }
      info('Removing existing directory...');
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
    
    try {
      info('Running create-fhevm-example script...');
      const docsFlag = withDocs ? ' --with-docs' : '';
      execSync(`ts-node scripts/create-fhevm-example.ts ${exampleName} ${outputDir}${docsFlag}`, {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
      
      success(`Example generated: ${outputDir}`);
      this.sessionData.examplesGenerated.push(exampleName);
      return true;
    } catch (err: any) {
      error(`Failed to generate example: ${err.message}`);
      this.sessionData.errors.push({ example: exampleName, error: err.message });
      return false;
    }
  }

  async testExample(exampleName: string): Promise<boolean> {
    title(`Testing: ${exampleName}`);
    
    const outputDir = `./output/${exampleName}`;
    
    if (!fs.existsSync(outputDir)) {
      error(`Directory not found: ${outputDir}`);
      warning('Generate the example first.');
      return false;
    }
    
    try {
      info('Compiling contracts...');
      execSync('npm run compile', {
        stdio: 'inherit',
        cwd: outputDir,
      });
      
      info('Running tests...');
      execSync('npm run test', {
        stdio: 'inherit',
        cwd: outputDir,
      });
      
      success(`Tests passed for: ${exampleName}`);
      this.sessionData.examplesTested.push(exampleName);
      return true;
    } catch (err: any) {
      error(`Tests failed for: ${exampleName}`);
      this.sessionData.errors.push({ example: exampleName, error: err.message });
      return false;
    }
  }

  async generateAndTestExample(exampleName: string, withDocs: boolean = false): Promise<boolean> {
    const generated = await this.generateExample(exampleName, withDocs);
    if (!generated) {
      return false;
    }
    
    const testNow = await confirm('\nTest the generated example now?', true);
    if (testNow) {
      return await this.testExample(exampleName);
    }
    
    return true;
  }

  async generateCategory(categoryName: string): Promise<boolean> {
    title(`Generating Category: ${categoryName}`);
    
    // Use categories folder like create-fhevm-category.ts default behavior
    const outputDir = `./categories/fhevm-examples-${categoryName}`;
    
    if (fs.existsSync(outputDir)) {
      const overwrite = await confirm(`Directory ${outputDir} already exists. Overwrite?`, false);
      if (!overwrite) {
        warning('Skipped generation.');
        return false;
      }
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
    
    try {
      info('Running create-fhevm-category script...');
      execSync(`ts-node scripts/create-fhevm-category.ts ${categoryName} ${outputDir}`, {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
      
      success(`Category generated: ${outputDir}`);
      this.sessionData.examplesGenerated.push(`category:${categoryName}`);
      
      const testNow = await confirm('\nTest the generated category now?', true);
      if (testNow) {
        return await this.testCategory(categoryName, outputDir);
      }
      
      return true;
    } catch (err: any) {
      error(`Failed to generate category: ${err.message}`);
      this.sessionData.errors.push({ example: `category:${categoryName}`, error: err.message });
      return false;
    }
  }

  async testCategory(categoryName: string, outputDir: string): Promise<boolean> {
    title(`Testing Category: ${categoryName}`);
    
    try {
      info('Compiling contracts...');
      execSync('npm run compile', {
        stdio: 'inherit',
        cwd: outputDir,
      });
      
      info('Running tests...');
      execSync('npm run test', {
        stdio: 'inherit',
        cwd: outputDir,
      });
      
      success(`Category tests passed: ${categoryName}`);
      return true;
    } catch (err: any) {
      error(`Category tests failed: ${err.message}`);
      return false;
    }
  }

  async generateDocs(exampleName?: string): Promise<boolean> {
    title('Generating Documentation');
    
    try {
      if (exampleName) {
        info(`Generating docs for: ${exampleName}`);
        execSync(`ts-node scripts/generate-docs.ts ${exampleName}`, {
          stdio: 'inherit',
          cwd: process.cwd(),
        });
        success(`Documentation generated for: ${exampleName}`);
      } else {
        const generateAll = await confirm('Generate documentation for all examples?', true);
        if (generateAll) {
          info('Generating all documentation...');
          execSync('ts-node scripts/generate-docs.ts --all', {
            stdio: 'inherit',
            cwd: process.cwd(),
          });
          success('All documentation generated!');
        } else {
          const exampleName = await this.showExampleMenu();
          return await this.generateDocs(exampleName);
        }
      }
      return true;
    } catch (err: any) {
      error(`Failed to generate documentation: ${err.message}`);
      return false;
    }
  }

  getPackageDescription(packageName: string): string {
    const descriptions: Record<string, string> = {
      '@fhevm/solidity': 'Core FHEVM Solidity library',
      '@fhevm/hardhat-plugin': 'FHEVM Hardhat plugin',
      '@fhevm/mock-utils': 'FHEVM mock utilities for testing',
      '@zama-fhe/relayer-sdk': 'Zama FHE relayer SDK',
      '@openzeppelin/confidential-contracts': 'OpenZeppelin confidential contracts',
      '@openzeppelin/contracts': 'OpenZeppelin standard contracts',
      'hardhat': 'Hardhat development environment',
    };
    return descriptions[packageName] || 'Package';
  }

  async getCurrentVersion(packageName: string): Promise<string | null> {
    const rootDir = process.cwd();
    const outputDir = path.join(rootDir, 'output');
    
    // Try to find the package in any example's package.json
    if (fs.existsSync(outputDir)) {
      const exampleDirs = fs.readdirSync(outputDir).filter(item => {
        const fullPath = path.join(outputDir, item);
        return fs.statSync(fullPath).isDirectory();
      });
      
      for (const dir of exampleDirs) {
        const packageJsonPath = path.join(outputDir, dir, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
          try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
            const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
            if (allDeps[packageName]) {
              return allDeps[packageName];
            }
          } catch (err) {
            // Continue to next file
          }
        }
      }
    }
    
    // Also check main project and base template
    const mainPackageJson = path.join(rootDir, 'package.json');
    if (fs.existsSync(mainPackageJson)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(mainPackageJson, 'utf-8'));
        const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        if (allDeps[packageName]) {
          return allDeps[packageName];
        }
      } catch (err) {
        // Continue
      }
    }
    
    const templatePackageJson = path.join(rootDir, 'fhevm-hardhat-template', 'package.json');
    if (fs.existsSync(templatePackageJson)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(templatePackageJson, 'utf-8'));
        const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        if (allDeps[packageName]) {
          return allDeps[packageName];
        }
      } catch (err) {
        // Continue
      }
    }
    
    return null;
  }

  async updateDependencies(): Promise<boolean> {
    title('Update Dependencies');
    
    try {
      // Common FHEVM dependencies
      const packageList = [
        '@fhevm/solidity',
        '@fhevm/hardhat-plugin',
        '@fhevm/mock-utils',
        '@zama-fhe/relayer-sdk',
        '@openzeppelin/confidential-contracts',
        '@openzeppelin/contracts',
        'hardhat',
      ];
      
      // Get current versions for each package
      info('Checking current versions in examples...');
      const commonPackages = await Promise.all(
        packageList.map(async (pkg) => {
          const currentVersion = await this.getCurrentVersion(pkg);
          const description = this.getPackageDescription(pkg);
          const versionText = currentVersion ? ` (current: ${currentVersion})` : ' (not found)';
          return {
            name: `${pkg}${versionText}`,
            value: pkg,
            description: description,
          };
        })
      );
      
      commonPackages.push({
        name: 'Custom package',
        value: 'custom',
        description: 'Enter a custom package name',
      });
      
      log('\nSelect package to update:', colors.cyan);
      const selectedPackage = await selectFromList(commonPackages, 'Choose a package:');
      
      let packageName: string;
      let currentVersion: string | null = null;
      
      if (selectedPackage === 'custom') {
        packageName = await question('Enter custom package name: ');
        if (!packageName.trim()) {
          error('Package name is required');
          return false;
        }
        packageName = packageName.trim();
        currentVersion = await this.getCurrentVersion(packageName);
      } else {
        packageName = selectedPackage;
        currentVersion = await this.getCurrentVersion(packageName);
      }
      
      const versionPrompt = currentVersion 
        ? `\nVersion (current: ${currentVersion}, e.g., ^0.9.1 or 0.3.0-5): `
        : '\nVersion (e.g., ^0.9.1 or 0.3.0-5): ';
      const version = await question(versionPrompt);
      
      if (!version.trim()) {
        error('Version is required');
        return false;
      }
      
      log('\nSelect update targets:', colors.cyan);
      const updateAll = await confirm('Update all generated examples (output/ and categories/)?', true);
      const updateBaseTemplate = await confirm('Update fhevm-hardhat-template?', false);
      const updateMain = await confirm('Update main project package.json?', false);
      
      if (!updateAll && !updateBaseTemplate && !updateMain) {
        warning('No targets selected. Nothing to update.');
        return false;
      }
      
      title('Updating Dependencies');
      
      const args: string[] = ['--package', packageName.trim(), version.trim()];
      
      if (updateAll) {
        args.push('--all');
      }
      
      if (updateBaseTemplate) {
        args.push('--base-template');
      }
      
      if (updateMain) {
        args.push('--main');
      }
      
      info(`Updating ${packageName} to ${version}...`);
      execSync(`ts-node scripts/update-dependencies.ts ${args.join(' ')}`, {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
      
      success(`Dependencies updated successfully!`);
      
      if (updateAll || updateBaseTemplate) {
        info('\nNote: You may need to run "npm install" in updated directories.');
        const runInstall = await confirm('Run npm install in updated directories?', false);
        
        if (runInstall) {
          const rootDir = process.cwd();
          
          if (updateAll) {
            // Update output examples
            if (fs.existsSync(path.join(rootDir, 'output'))) {
              const outputDirs = fs.readdirSync(path.join(rootDir, 'output')).filter(item => {
                const fullPath = path.join(rootDir, 'output', item);
                return fs.statSync(fullPath).isDirectory();
              });
              
              for (const dir of outputDirs) {
                const dirPath = path.join(rootDir, 'output', dir);
                if (fs.existsSync(path.join(dirPath, 'package.json'))) {
                  info(`Running npm install in output/${dir}...`);
                  try {
                    execSync('npm install', {
                      stdio: 'inherit',
                      cwd: dirPath,
                    });
                    success(`✓ output/${dir}`);
                  } catch (err: any) {
                    warning(`Failed to install in output/${dir}: ${err.message}`);
                  }
                }
              }
            }
            
            // Update category projects
            if (fs.existsSync(path.join(rootDir, 'categories'))) {
              const categoryDirs = fs.readdirSync(path.join(rootDir, 'categories')).filter(item => {
                const fullPath = path.join(rootDir, 'categories', item);
                return fs.statSync(fullPath).isDirectory();
              });
              
              for (const dir of categoryDirs) {
                const dirPath = path.join(rootDir, 'categories', dir);
                if (fs.existsSync(path.join(dirPath, 'package.json'))) {
                  info(`Running npm install in categories/${dir}...`);
                  try {
                    execSync('npm install', {
                      stdio: 'inherit',
                      cwd: dirPath,
                    });
                    success(`✓ categories/${dir}`);
                  } catch (err: any) {
                    warning(`Failed to install in categories/${dir}: ${err.message}`);
                  }
                }
              }
            }
          }
          
          if (updateBaseTemplate && fs.existsSync(path.join(rootDir, 'fhevm-hardhat-template'))) {
            const templatePath = path.join(rootDir, 'fhevm-hardhat-template');
            if (fs.existsSync(path.join(templatePath, 'package.json'))) {
              info('Running npm install in fhevm-hardhat-template...');
              try {
                execSync('npm install', {
                  stdio: 'inherit',
                  cwd: templatePath,
                });
                success('✓ fhevm-hardhat-template');
              } catch (err: any) {
                warning(`Failed to install in fhevm-hardhat-template: ${err.message}`);
              }
            }
          }
          
          if (updateMain) {
            info('Running npm install in main project...');
            try {
              execSync('npm install', {
                stdio: 'inherit',
                cwd: rootDir,
              });
              success('✓ Main project');
            } catch (err: any) {
              warning(`Failed to install in main project: ${err.message}`);
            }
          }
        }
      }
      
      return true;
    } catch (err: any) {
      error(`Failed to update dependencies: ${err.message}`);
      return false;
    }
  }

  async cleanup(): Promise<void> {
    title('Cleanup Generated Outputs and Generated Docs');
    
    const outputDir = './output';
    const docsDir = './docs';
    
    let testOutputs: string[] = [];
    if (fs.existsSync(outputDir)) {
      testOutputs = fs.readdirSync(outputDir).filter(item => {
        const fullPath = path.join(outputDir, item);
        return fs.statSync(fullPath).isDirectory() && 
               item !== 'node_modules';
      });
    }
    
    let docFiles: string[] = [];
    if (fs.existsSync(docsDir)) {
      docFiles = fs.readdirSync(docsDir).filter(item => {
        return item.endsWith('.md') && item !== 'SUMMARY.md';
      });
    }
    
    if (testOutputs.length === 0 && docFiles.length === 0) {
      info('No studio-generated outputs or docs found.');
      return;
    }
    
    if (testOutputs.length > 0) {
      log(`\nFound ${testOutputs.length} generated output directory(ies):`, colors.yellow);
      testOutputs.forEach(item => {
        log(`  - ${item}`, colors.gray);
      });
    }
    
    if (docFiles.length > 0) {
      log(`\nFound ${docFiles.length} generated documentation file(s):`, colors.yellow);
      docFiles.forEach(item => {
        log(`  - ${item}`, colors.gray);
      });
    }
    
    const confirmCleanup = await confirm('\nRemove all generated outputs and generated docs?', false);
    if (confirmCleanup) {
      testOutputs.forEach(item => {
        const fullPath = path.join(outputDir, item);
        info(`Removing: ${item}`);
        fs.rmSync(fullPath, { recursive: true, force: true });
      });
      
      if (docFiles.length > 0) {
        docFiles.forEach(item => {
          const fullPath = path.join(docsDir, item);
          info(`Removing: ${item}`);
          fs.unlinkSync(fullPath);
        });
      }
      
      const summaryPath = path.join(docsDir, 'SUMMARY.md');
      if (fs.existsSync(summaryPath)) {
        fs.writeFileSync(summaryPath, '# FHEVM Examples Documentation\n\n<!-- This file is auto-generated. Run \'npm run generate-all-docs\' to populate it. -->\n');
        info('Reset SUMMARY.md');
      }
      
      success('Cleanup complete!');
    } else {
      info('Cleanup cancelled.');
    }
  }

  async generateAllExamplesAndTest(): Promise<boolean> {
    title('Generate All Examples and Test');
    
    info('This will generate all examples with documentation and run tests for each one.');
    const skipTest = await confirm('\nSkip running tests? (only generate examples, no tests)', false);
    
    if (skipTest) {
      warning('Tests will be skipped - only examples will be generated.');
    } else {
      info('Tests will run after each example is generated.');
    }
    
    try {
      info('Running generate-all-examples-and-test script...');
      const skipTestFlag = skipTest ? ' --skip-test' : '';
      execSync(`ts-node scripts/generate-all-examples-and-test.ts${skipTestFlag}`, {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
      success('All examples generated and tested successfully!');
      return true;
    } catch (err: any) {
      error(`Failed to generate all examples: ${err.message}`);
      this.sessionData.errors.push({ example: 'all-examples', error: err.message });
      return false;
    }
  }

  async showSessionSummary(): Promise<void> {
    title('Session Summary');
    
    const duration = Math.round((new Date().getTime() - this.sessionData.startTime.getTime()) / 1000);
    
    log(`Duration: ${duration}s`, colors.gray);
    log(`Examples Generated: ${this.sessionData.examplesGenerated.length}`, colors.green);
    log(`Examples Tested: ${this.sessionData.examplesTested.length}`, colors.green);
    
    if (this.sessionData.examplesGenerated.length > 0) {
      log('\nGenerated:', colors.cyan);
      this.sessionData.examplesGenerated.forEach(ex => {
        log(`  - ${ex}`, colors.gray);
      });
    }
    
    if (this.sessionData.errors.length > 0) {
      log('\nErrors:', colors.red);
      this.sessionData.errors.forEach(err => {
        log(`  - ${err.example}: ${err.error}`, colors.red);
      });
    }
  }

  async run(): Promise<void> {
    try {
      while (true) {
        const choice = await this.showMainMenu();
        
        switch (choice) {
          case 'single': {
            const exampleName = await this.showExampleMenu();
            const defaultDir = `./output/${exampleName}`;
            const customDir = await question(`\nOutput directory (press Enter for default: ${defaultDir}): `);
            const outputDir = customDir.trim() || defaultDir;
            
            const withDocs = await confirm('\nGenerate documentation?', true);
            const testNow = await confirm('\nTest after generation?', true);
            if (testNow) {
              await this.generateAndTestExample(exampleName, withDocs);
            } else {
              await this.generateExample(exampleName, withDocs);
            }
            break;
          }
          
          case 'category': {
            const categoryName = await this.showCategoryMenu();
            await this.generateCategory(categoryName);
            break;
          }
          
          case 'test': {
            const exampleName = await this.showExampleMenu();
            await this.testExample(exampleName);
            break;
          }
          
          case 'docs': {
            await this.generateDocs();
            break;
          }
          
          case 'update-deps': {
            await this.updateDependencies();
            break;
          }
          
          case 'cleanup': {
            await this.cleanup();
            break;
          }
          
          case 'list': {
            this.showExampleList();
            break;
          }
          
          case 'generate-all': {
            await this.generateAllExamplesAndTest();
            break;
          }
          
          case 'exit': {
            await this.showSessionSummary();
            log('\n👋 Thanks for using FHEVM Studio!', colors.blue);
            rl.close();
            return;
          }
        }
        
        const continueStudio = await confirm('\nContinue with another action?', true);
        if (!continueStudio) {
          await this.showSessionSummary();
          log('\n👋 Thanks for using FHEVM Studio!', colors.blue);
          rl.close();
          return;
        }
      }
    } catch (err: any) {
      error(`Studio error: ${err.message}`);
      rl.close();
      process.exit(1);
    }
  }
}

const studio = new FHEVMStudio();
studio.run().catch((err) => {
  error(`Fatal error: ${err.message}`);
  process.exit(1);
});

