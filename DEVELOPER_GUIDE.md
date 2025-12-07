# Developer Guide

This guide provides step-by-step instructions for developers working on the FHEVM Example Hub project.

## Table of Contents

1. [Adding New Examples](#adding-new-examples)
2. [Updating Dependencies](#updating-dependencies)

---

## Adding New Examples

This section walks you through the complete process of adding a new FHEVM example to the project.

### Step 1: Create the Contract

1. **Choose the appropriate category:**
   - `basic/` - Fundamental FHE operations (encryption, decryption, FHE operations)
   - `access-control/` - FHE permissions and access control
   - `input-proofs/` - Input proof usage and lifecycle
   - `anti-patterns/` - Common mistakes to avoid
   - `openzeppelin/` - OpenZeppelin confidential contracts
   - `advanced/` - Complex FHEVM applications

2. **Create the contract file:**
   ```
   contracts/<category>/<ContractName>.sol
   ```

3. **Include comprehensive NatSpec comments:**
   ```solidity
   /**
    * @title ContractName
    * @notice Brief description of what this contract does
    * @dev Detailed explanation including:
    *      - What FHE operations are used
    *      - Key concepts demonstrated
    *      - This contract demonstrates:
    *        - Concept 1
    *        - Concept 2
    *      - Key Concepts:
    *        - Concept Name: Description
    *        - Another Concept: Description
    */
   contract ContractName {
       // Contract implementation
   }
   ```

4. **Follow FHEVM best practices:**
   - Always grant both `FHE.allowThis()` and `FHE.allow()` permissions
   - Use plaintext divisors for `FHE.div()` operations
   - Never use `view` modifier with FHE operations
   - Handle encrypted values correctly (no on-chain decryption of `ebool`)

### Step 2: Create the Test File

1. **Create the test file:**
   ```
   test/<category>/<ContractName>.ts
   ```

2. **Include comprehensive test cases:**
   ```typescript
   import { expect } from "chai";
   import { ethers } from "hardhat";
   import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
   import { FHEVM } from "@zama-fhe/relayer-sdk";

   describe("ContractName", function () {
     // Deploy fixture
     async function deployFixture() {
       // Setup code
     }

     describe("✅ Success Cases", function () {
       it("should do something successfully", async function () {
         // Test implementation
       });
     });

     describe("❌ Error Cases", function () {
       it("should fail when invalid input", async function () {
         // Test implementation
       });
     });
   });
   ```

3. **Test requirements:**
   - ✅ Success cases (what works correctly)
   - ❌ Error cases (what fails and why)
   - Edge cases
   - Permission scenarios
   - FHE operation correctness

### Step 3: Update EXAMPLES_MAP

Edit `scripts/create-fhevm-example.ts` and add your example to the `EXAMPLES_MAP`:

```typescript
export const EXAMPLES_MAP: Record<string, ExampleConfig> = {
  // ... existing examples ...
  
  'example-name': {
    contract: 'contracts/category/ContractName.sol',
    test: 'test/category/ContractName.ts',
    description: 'Brief description of what this example demonstrates',
    category: 'category-name',
    dependencies: ['contracts/openzeppelin/ERC7984Mock.sol'], // Optional: if contract needs additional files
  },
};
```

**Important:**
- Use kebab-case for the example name (e.g., `confidential-lending-pool`)
- Match the category name exactly (e.g., `basic`, `advanced`, `openzeppelin`)
- Include any dependencies in the `dependencies` array

### Step 4: Update Documentation Config

Edit `scripts/generate-docs.ts` and add your example to the `EXAMPLES_CONFIG`:

```typescript
export const EXAMPLES_CONFIG: Record<string, DocsConfig> = {
  // ... existing examples ...
  
  'example-name': {
    title: 'Example Title',
    description: 'Detailed description of the example and what it teaches',
    contract: 'contracts/category/ContractName.sol',
    test: 'test/category/ContractName.ts',
    output: 'docs/example-name.md',
    category: 'Category Name', // Display name (e.g., "Basic", "Advanced")
  },
};
```

**Important:**
- The `output` path should match the example name with `.md` extension
- The `category` should be the display name (capitalized, with spaces if needed)

### Step 5: Update Category Configuration (if needed)

If your example belongs to a category that generates category projects, edit `scripts/create-fhevm-category.ts`:

```typescript
export const CATEGORIES: Record<string, CategoryConfig> = {
  // ... existing categories ...
  
  'category-name': {
    name: 'Category Display Name',
    description: 'Description of the category',
    contracts: [
      // ... existing contracts ...
      {
        path: 'contracts/category/ContractName.sol',
        test: 'test/category/ContractName.ts',
        additionalFiles: ['contracts/openzeppelin/ERC7984Mock.sol'], // Optional
      },
    ],
  },
};
```

### Step 6: Update Batch Generation Script (if needed)

If you want the example included in batch generation, edit `scripts/generate-all-examples-and-test.ts`:

```typescript
const EXAMPLES_BY_CATEGORY: Record<string, string[]> = {
  // ... existing categories ...
  
  'category-name': [
    // ... existing examples ...
    'example-name',
  ],
};
```

### Step 7: Test Your Example

1. **Test the contract compilation:**
   ```bash
   npx hardhat compile
   ```

2. **Run the test:**
   ```bash
   npx hardhat test test/category/ContractName.ts
   ```

3. **Generate a standalone example:**
   ```bash
   npm run create-example example-name ./test-output/my-example
   cd ./test-output/my-example
   npm install
   npm run compile
   npm run test
   ```

4. **Generate documentation:**
   ```bash
   npm run generate-docs example-name
   ```

5. **Verify documentation:**
   ```bash
   cat docs/example-name.md
   ```

### Step 8: Update README (if needed)

If your example is significant or adds a new category, update `README.md`:

1. Update the example count in the statistics table
2. Add the example to the appropriate category list
3. Update any relevant descriptions

### Checklist

Before submitting your new example, ensure:

- [ ] Contract compiles without errors
- [ ] Tests pass (both success and failure cases)
- [ ] Contract includes comprehensive NatSpec comments
- [ ] Test file includes ✅ and ❌ sections
- [ ] Example added to `EXAMPLES_MAP` in `create-fhevm-example.ts`
- [ ] Example added to `EXAMPLES_CONFIG` in `generate-docs.ts`
- [ ] Example added to category in `create-fhevm-category.ts` (if applicable)
- [ ] Standalone example generates correctly
- [ ] Documentation generates correctly
- [ ] README updated (if needed)

---

## Updating Dependencies

This section explains how to update package dependencies across all examples, categories, base template, and the main project.

### Method 1: Using the Update Dependencies Script (Recommended)

The `update-dependencies.ts` script automates dependency updates across the entire project.

#### Basic Usage

```bash
npm run update-dependencies -- --package <package-name> <version> [options]
```

#### Options

- `--package <name> <version>` - Package name and version to update (required)
- `--all` - Update all generated examples in `output/` and `categories/` directories
- `--base-template` - Update `fhevm-hardhat-template/package.json`
- `--main` - Update main project `package.json`
- `--help` - Show help message

#### Examples

**Update @fhevm/solidity in all examples:**
```bash
npm run update-dependencies -- --package @fhevm/solidity ^0.9.1 --all
```

**Update @zama-fhe/relayer-sdk in all examples and base template:**
```bash
npm run update-dependencies -- --package @zama-fhe/relayer-sdk 0.3.0-5 --all --base-template
```

**Update hardhat in main project only:**
```bash
npm run update-dependencies -- --package hardhat ^2.26.0 --main
```

**Update everything:**
```bash
npm run update-dependencies -- --package @fhevm/solidity ^0.9.1 --all --base-template --main
```

#### Using FHEVM Studio (Interactive)

For an interactive experience:

```bash
npm run studio
```

Then select:
1. "Update Dependencies" from the main menu
2. Choose the package from the list (shows current versions)
3. Enter the new version
4. Select update targets (all examples, base template, main project)
5. Optionally run `npm install` in updated directories

### Method 2: Manual Update Process

If you need more control or the script doesn't work for your use case:

#### Step 1: Update Base Template

1. Navigate to the base template:
   ```bash
   cd fhevm-hardhat-template
   ```

2. Edit `package.json`:
   ```json
   {
     "dependencies": {
       "@fhevm/solidity": "^0.9.1"  // Update version here
     },
     "devDependencies": {
       "@fhevm/hardhat-plugin": "^0.3.0-1"  // Update version here
     }
   }
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Test:
   ```bash
   npm run compile
   npm run test
   ```

#### Step 2: Update Main Project

1. Edit `package.json` in the project root:
   ```json
   {
     "devDependencies": {
       "@fhevm/solidity": "^0.9.1",  // Update version here
       "@fhevm/hardhat-plugin": "^0.3.0-1"  // Update version here
     }
   }
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

#### Step 3: Update Generated Examples

**Option A: Use the update script (recommended):**
```bash
npm run update-dependencies -- --package @fhevm/solidity ^0.9.1 --all
```

**Option B: Manual update (if needed):**

1. Find all `package.json` files:
   ```bash
   find output -name package.json
   find categories -name package.json
   ```

2. Update each file manually or use a find/replace tool

3. Run `npm install` in each directory:
   ```bash
   for dir in output/*/; do
     cd "$dir"
     npm install
     cd ../..
   done
   ```

### Common Dependency Updates

#### Updating @fhevm/solidity

```bash
npm run update-dependencies -- --package @fhevm/solidity ^0.9.1 --all --base-template --main
```

Then run `npm install` in updated directories if needed.

#### Updating @fhevm/hardhat-plugin

```bash
npm run update-dependencies -- --package @fhevm/hardhat-plugin ^0.3.0-1 --all --base-template --main
```

#### Updating @zama-fhe/relayer-sdk

```bash
npm run update-dependencies -- --package @zama-fhe/relayer-sdk 0.3.0-5 --all --base-template --main
```

#### Updating OpenZeppelin Packages

```bash
# Confidential contracts
npm run update-dependencies -- --package @openzeppelin/confidential-contracts ^0.3.0 --all --base-template --main

# Standard contracts
npm run update-dependencies -- --package @openzeppelin/contracts ^5.4.0 --all --base-template --main
```

### After Updating Dependencies

1. **Test compilation:**
   ```bash
   npx hardhat compile
   ```

2. **Run tests:**
   ```bash
   npx hardhat test
   ```

3. **Regenerate examples (if needed):**
   ```bash
   npm run generate-all-and-test -- --skip-test
   ```

4. **Test a generated example:**
   ```bash
   cd output/fhe-counter
   npm install
   npm run compile
   npm run test
   ```

### Troubleshooting

**Issue: Script doesn't find package.json files**
- Ensure examples have been generated: `npm run generate-all-and-test -- --skip-test`
- Check that `output/` and `categories/` directories exist

**Issue: Version format errors**
- Use proper semver format: `^0.9.1`, `~0.9.1`, `0.9.1`, `0.3.0-5`
- Avoid invalid formats like `v0.9.1` or `version 0.9.1`

**Issue: npm install fails after update**
- Check for version conflicts in package.json
- Ensure Node.js version is compatible (>= 20)
- Try deleting `node_modules` and `package-lock.json`, then reinstall

**Issue: Tests fail after dependency update**
- Check for breaking changes in the updated package
- Review package changelog
- Update test code if API changed

### Best Practices

1. **Test before bulk updates:**
   - Update one example first to verify compatibility
   - Test compilation and tests
   - Then update all examples

2. **Keep versions consistent:**
   - Use the same version across all examples
   - Document version changes in commit messages

3. **Update incrementally:**
   - Update one package at a time
   - Test after each update
   - Commit changes separately

4. **Document breaking changes:**
   - If a dependency update requires code changes, document them
   - Update this guide if new steps are needed

---

## Additional Resources

- **README.md** - Project overview and quick start
- **scripts.md** - Detailed documentation for all automation scripts
- **FHEVM Documentation** - https://docs.zama.ai/fhevm
- **OpenZeppelin Confidential Contracts** - https://github.com/OpenZeppelin/openzeppelin-confidential-contracts

---

**Last Updated**: Generated with project documentation

