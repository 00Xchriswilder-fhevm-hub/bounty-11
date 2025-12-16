# Scripts Documentation

This document provides comprehensive documentation for all automation scripts in the FHEVM Example Hub project.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Script Overview](#script-overview)
3. [create-fhevm-example.ts](#create-fhevm-examplets)
4. [create-fhevm-category.ts](#create-fhevm-categoryts)
5. [generate-docs.ts](#generate-docsts)
6. [generate-all-examples-and-test.ts](#generate-all-examples-and-testts)
7. [fhevm-studio.ts](#fhevm-studiotts)
8. [update-dependencies.ts](#update-dependenciests)
9. [Quick Reference](#quick-reference)

---

## Prerequisites

Before running any scripts, ensure you have:

- **Node.js** >= 20
- **npm** >= 7.0.0
- **TypeScript** (installed as dev dependency)
- **ts-node** (installed as dev dependency)
- All project dependencies installed: `npm install`

### Verify Installation

```bash
node --version  # Should be >= 20
npm --version   # Should be >= 7.0.0
npm install     # Install all dependencies
```

---

## Script Overview

| Script | Purpose | Output Location |
|--------|---------|----------------|
| `create-fhevm-example.ts` | Generate standalone example repository | `./output/<example-name>/` |
| `create-fhevm-category.ts` | Generate category project with multiple examples | `./categories/fhevm-examples-<category>/` |
| `generate-docs.ts` | Generate GitBook documentation | `./docs/<example-name>.md` |
| `generate-all-examples-and-test.ts` | Batch generate all examples and run tests | `./output/` |
| `fhevm-studio.ts` | Interactive CLI for exploring and generating examples | Various |
| `update-dependencies.ts` | Update dependencies across all examples | In-place updates |

---

## create-fhevm-example.ts

**Purpose**: Generates a standalone, self-contained FHEVM example repository from a template.

### Usage

```bash
# Using npm script (recommended)
npm run create-example <example-name> <output-dir> [--with-docs]

# Direct execution
ts-node scripts/create-fhevm-example.ts <example-name> <output-dir> [--with-docs]
```

### Arguments

- `<example-name>` (required): The name of the example to generate (e.g., `fhe-counter`, `blind-auction`)
- `<output-dir>` (required): Directory where the example repository will be created
- `--with-docs` (optional): Include comprehensive documentation in the generated repository

### Examples

```bash
# Generate basic example
npm run create-example fhe-counter ./output/my-fhe-counter

# Generate with documentation
npm run create-example fhe-counter ./output/my-fhe-counter --with-docs

# Generate advanced example
npm run create-example confidential-portfolio-rebalancer ./output/portfolio-rebalancer --with-docs

# Direct execution
ts-node scripts/create-fhevm-example.ts blind-auction ./output/blind-auction
```

### What It Does

1. Copies the base Hardhat template (`fhevm-hardhat-template/`)
2. Copies the contract file from `contracts/<category>/`
3. Copies the test file from `test/<category>/`
4. Copies any additional dependencies (e.g., `ERC7984Mock.sol`)
5. Fixes import paths for standalone usage
6. Generates a README.md with example-specific content
7. Optionally generates comprehensive documentation in `docs/` folder
8. Creates deployment scripts
9. Updates package.json with correct dependencies

### Available Examples

Run `npm run help:create` to see all available examples, or check `scripts/create-fhevm-example.ts` for the `EXAMPLES_MAP`.

### Output Structure

```
<output-dir>/
├── contracts/
│   └── <ContractName>.sol
├── test/
│   └── <TestName>.ts
├── deploy/
│   └── deploy.ts
├── docs/                    # Only if --with-docs flag used
│   └── <ContractName>.md
├── hardhat.config.ts
├── package.json
├── README.md
└── ... (other template files)
```

---

## create-fhevm-category.ts

**Purpose**: Generates a project containing multiple examples from a specific category.

### Usage

```bash
# Using npm script (recommended)
npm run create-category <category-name> [output-dir]

# Direct execution
ts-node scripts/create-fhevm-category.ts <category-name> [output-dir]
```

### Arguments

- `<category-name>` (required): The category to generate
  - Available: `basic`, `access-control`, `input-proofs`, `anti-patterns`, `openzeppelin`, `advanced`
- `<output-dir>` (optional): Custom output directory (defaults to `./categories/fhevm-examples-<category>/`)

### Examples

```bash
# Generate basic category (default location)
npm run create-category basic

# Generate with custom output directory
npm run create-category basic ./my-basic-examples

# Generate advanced category
npm run create-category advanced

# Direct execution
ts-node scripts/create-fhevm-category.ts openzeppelin ./my-openzeppelin-examples
```

### What It Does

1. Creates a new Hardhat project structure
2. Copies all contracts from the specified category
3. Copies all corresponding test files
4. Copies shared dependencies (e.g., `ERC7984Mock.sol`)
5. Generates a unified deployment script
6. Creates a comprehensive README.md listing all examples
7. Preserves directory structure for dependencies

### Available Categories

- **basic** (14 examples): Encryption, decryption, FHE operations
- **access-control** (3 examples): FHE permissions and access control
- **input-proofs** (4 examples): Input proof usage and lifecycle
- **anti-patterns** (3 examples): Common mistakes to avoid
- **openzeppelin** (10 examples): OpenZeppelin confidential contracts
- **advanced** (7 examples): Complex FHEVM applications

### Output Structure

```
<output-dir>/
├── contracts/
│   ├── <Example1>.sol
│   ├── <Example2>.sol
│   └── ... (all category examples)
├── test/
│   ├── <Test1>.ts
│   ├── <Test2>.ts
│   └── ... (all category tests)
├── deploy/
│   └── deploy.ts
├── hardhat.config.ts
├── package.json
├── README.md
└── ... (other template files)
```

---

## generate-docs.ts

**Purpose**: Generates GitBook-formatted documentation from contract and test files.

### Usage

```bash
# Using npm script (recommended)
npm run generate-docs <example-name>
npm run generate-all-docs  # Generate all documentation

# Direct execution
ts-node scripts/generate-docs.ts <example-name>
ts-node scripts/generate-docs.ts --all
```

### Arguments

- `<example-name>` (required for single): The name of the example to document
- `--all` (optional): Generate documentation for all examples

### Examples

```bash
# Generate documentation for a single example
npm run generate-docs fhe-counter

# Generate all documentation
npm run generate-all-docs

# Direct execution
ts-node scripts/generate-docs.ts blind-auction
ts-node scripts/generate-docs.ts --all
```

### What It Does

1. Reads the contract file and extracts NatSpec comments
2. Reads the test file and extracts test scenarios
3. Analyzes code to extract FHE operations and patterns
4. Generates comprehensive markdown documentation with:
   - Overview (extracted from `@notice`, `@dev` comments)
   - What You'll Learn (from contract comments)
   - Key Concepts (from contract comments)
   - Contract Code (formatted Solidity)
   - Test Code (formatted TypeScript)
   - Usage Instructions
   - FHE Operations Used
5. Updates `docs/SUMMARY.md` with the new entry

### Output

Documentation files are generated in `./docs/` directory:
- `docs/<example-name>.md` - Individual example documentation
- `docs/SUMMARY.md` - GitBook summary/index (auto-updated)

### Features

- **Unique Content**: Extracts specific learning points and key concepts from contract `@dev` comments
- **Code Analysis**: Automatically detects FHE operations and patterns when comments are minimal
- **GitBook Compatible**: Generates files ready for GitBook publication
- **Comprehensive**: Includes contract code, test code, and usage instructions

---

## generate-all-examples-and-test.ts

**Purpose**: Batch generates all examples with documentation and optionally runs tests.

### Usage

```bash
# Using npm script (recommended)
npm run generate-all-and-test [options]

# Direct execution
ts-node scripts/generate-all-examples-and-test.ts [options]
```

### Options

- `--skip-test`: Skip running tests (only generate examples)
- `--skip-compile`: Skip compilation (assume already compiled)
- `--category <name>`: Only generate examples from specific category
- `--help`: Show help message

### Examples

```bash
# Generate all examples with docs and run tests
npm run generate-all-and-test

# Generate all examples without running tests
npm run generate-all-and-test -- --skip-test

# Generate only basic category examples
npm run generate-all-and-test -- --category basic

# Direct execution
ts-node scripts/generate-all-examples-and-test.ts
ts-node scripts/generate-all-examples-and-test.ts --skip-test
ts-node scripts/generate-all-examples-and-test.ts --category advanced
```

### What It Does

1. Iterates through all examples (or specific category)
2. Generates each example with `--with-docs` flag
3. Changes directory into each generated example
4. Runs `npm install` in each example
5. Runs `npm run compile` to compile contracts
6. Optionally runs `npm run test` to execute tests
7. Provides summary of success/failure counts

### Output

All examples are generated in `./output/` directory:
- `output/<example1>/`
- `output/<example2>/`
- ... (41 total examples)

### Use Cases

- **Demo Preparation**: Generate all examples for demonstrations
- **Testing**: Verify all examples compile and pass tests
- **Documentation**: Generate all documentation at once
- **CI/CD**: Use in automated testing pipelines

---

## fhevm-studio.ts

**Purpose**: Interactive command-line interface for exploring, generating, and testing FHEVM examples.

### Usage

```bash
# Using npm script (recommended)
npm run studio

# Direct execution
ts-node scripts/fhevm-studio.ts
```

### Features

The interactive menu provides:

1. **Browse Examples** - View all available examples with descriptions
2. **Generate Example** - Generate a single example repository
3. **Generate Category Project** - Generate all examples from a category
4. **Test Example** - Run tests for a generated example
5. **Generate Documentation** - Generate docs for an example
6. **Cleanup Test Outputs** - Remove generated test directories
7. **Show Available Examples** - List all examples with descriptions
8. **Generate All Examples and Test** - Batch generate all examples

### Examples

```bash
# Launch interactive studio
npm run studio

# Then follow the menu prompts:
# 1. Select an option from the menu
# 2. Choose example/category from submenu
# 3. Follow prompts for output directory
# 4. Watch as examples are generated and tested
```

### What It Does

- Provides a beautiful, colorized menu interface
- Allows interactive exploration of all examples
- Guides through generation process step-by-step
- Shows progress and results in real-time
- Tracks session data (examples generated, errors, etc.)

### Use Cases

- **Learning**: Explore examples interactively
- **Development**: Quick generation and testing workflow
- **Exploration**: Discover available examples and their descriptions

---

## update-dependencies.ts

**Purpose**: Maintenance tool for updating package dependencies across all generated examples, categories, base template, and main project.

### Usage

```bash
# Using npm script (recommended)
npm run update-dependencies [options]

# Direct execution
ts-node scripts/update-dependencies.ts [options]
```

### Options

- `--package <name> <version>`: Update specific package to version
- `--all`: Update all generated examples in `output/` directory
- `--base-template`: Update `fhevm-hardhat-template/` dependencies
- `--main`: Update main project (`package.json`) dependencies
- `--categories`: Update all category projects in `categories/` directory
- `--help`: Show help message

### Examples

```bash
# Update @fhevm/solidity in all examples
npm run update-dependencies -- --package @fhevm/solidity ^0.9.1 --all

# Update @zama-fhe/relayer-sdk in all examples and base template
npm run update-dependencies -- --package @zama-fhe/relayer-sdk 0.3.0-5 --all --base-template

# Update all dependencies in everything
npm run update-dependencies -- --package @fhevm/solidity ^0.9.1 --all --base-template --main --categories

# Direct execution
ts-node scripts/update-dependencies.ts --package @fhevm/hardhat-plugin 0.3.0-1 --all
```

### What It Does

1. Scans target directories (`output/`, `categories/`, `fhevm-hardhat-template/`)
2. Finds all `package.json` files
3. Updates specified package version in each file
4. Optionally runs `npm install` in each directory
5. Provides summary of updated files

### Use Cases

- **Version Updates**: Update FHEVM packages across all examples
- **Maintenance**: Keep all examples in sync with latest dependencies
- **Bulk Operations**: Update multiple packages at once

### Important Notes

- Always test examples after updating dependencies
- Some dependency updates may require code changes
- Consider updating examples one category at a time for testing

---

## Quick Reference

### NPM Scripts

| Command | Script | Description |
|---------|--------|-------------|
| `npm run create-example` | `create-fhevm-example.ts` | Generate standalone example |
| `npm run create-category` | `create-fhevm-category.ts` | Generate category project |
| `npm run generate-docs` | `generate-docs.ts` | Generate single doc |
| `npm run generate-all-docs` | `generate-docs.ts --all` | Generate all docs |
| `npm run generate-all-and-test` | `generate-all-examples-and-test.ts` | Batch generate & test |
| `npm run studio` | `fhevm-studio.ts` | Interactive CLI |
| `npm run update-dependencies` | `update-dependencies.ts` | Update dependencies |
| `npm run help:create` | `create-fhevm-example.ts --help` | Show create help |
| `npm run help:category` | `create-fhevm-category.ts --help` | Show category help |
| `npm run help:docs` | `generate-docs.ts --help` | Show docs help |
| `npm run help:update-deps` | `update-dependencies.ts --help` | Show update help |

### Common Workflows

#### Generate a Single Example

```bash
npm run create-example fhe-counter ./output/my-counter --with-docs
cd ./output/my-counter
npm install
npm run compile
npm run test
```

#### Generate All Examples

```bash
npm run generate-all-and-test
```

#### Generate Documentation for All Examples

```bash
npm run generate-all-docs
```

#### Update Dependencies

```bash
npm run update-dependencies -- --package @fhevm/solidity ^0.9.1 --all --base-template
```

#### Interactive Exploration

```bash
npm run studio
```

### Direct Execution

All scripts can be run directly with `ts-node`:

```bash
ts-node scripts/<script-name>.ts [arguments] [options]
```

### Getting Help

Most scripts support `--help` flag:

```bash
npm run help:create
npm run help:category
npm run help:docs
npm run help:update-deps
```

Or directly:

```bash
ts-node scripts/create-fhevm-example.ts --help
ts-node scripts/create-fhevm-category.ts --help
ts-node scripts/generate-docs.ts --help
ts-node scripts/update-dependencies.ts --help
```

---

## Troubleshooting

### Common Issues

1. **"Command not found" or "ts-node not found"**
   - Solution: Run `npm install` to install all dependencies

2. **"Example not found"**
   - Solution: Check available examples with `npm run help:create` or check `scripts/create-fhevm-example.ts`

3. **"Base template not found"**
   - Solution: Ensure `fhevm-hardhat-template/` directory exists in project root

4. **"Permission denied" errors**
   - Solution: Ensure you have write permissions to output directories

5. **TypeScript compilation errors**
   - Solution: Ensure all dependencies are installed: `npm install`

### Getting More Information

- Check script source files in `scripts/` directory for detailed implementation
- Review `README.md` for project overview and examples
- Check `package.json` for all available npm scripts

---

## Contributing

When adding new scripts or modifying existing ones:

1. Follow the existing script structure and patterns
2. Include comprehensive help text (`--help` flag)
3. Use consistent color coding and logging
4. Update this documentation
5. Test with multiple examples/categories
6. Update `package.json` scripts if needed

---

**Last Updated**: Generated automatically with project documentation







