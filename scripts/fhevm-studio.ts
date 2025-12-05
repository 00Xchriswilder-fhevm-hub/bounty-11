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
║     ███████╗██╗  ██╗███████╗██╗   ██╗███╗   ███╗    ███████╗████████╗        ║
║     ██╔════╝██║  ██║██╔════╝██║   ██║████╗ ████║    ██╔════╝╚══██╔══╝        ║
║     █████╗  ███████║█████╗  ██║   ██║██╔████╔██║    ███████╗   ██║           ║
║     ██╔══╝  ██╔══██║██╔══╝  ╚██╗ ██╔╝██║╚██╔╝██║    ╚════██║   ██║           ║
║     ██║     ██║  ██║███████╗ ╚████╔╝ ██║ ╚═╝ ██║    ███████║   ██║           ║
║     ╚═╝     ╚═╝  ╚═╝╚══════╝  ╚═══╝  ╚═╝     ╚═╝    ╚══════╝   ╚═╝           ║
║                                                                               ║
║                    ███████╗██╗   ██╗██████╗ ██╗   ██╗                        ║
║                    ██╔════╝██║   ██║██╔══██╗██║   ██║                        ║
║                    █████╗  ██║   ██║██║  ██║██║   ██║                        ║
║                    ██╔══╝  ██║   ██║██║  ██║██║   ██║                        ║
║                    ██║     ╚██████╔╝██████╔╝╚██████╔╝                        ║
║                    ╚═╝      ╚═════╝ ╚═════╝  ╚═════╝                         ║
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

