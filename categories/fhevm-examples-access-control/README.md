# FHEVM Examples: Access Control Examples

Demonstrates FHE access control patterns including FHE.allow(), FHE.allowThis(), and FHE.allowTransient()

## 📦 Included Examples

This project contains 3 example contracts:

1. **AccessControl**
2. **AllowTransient**
3. **PermissionExamples**

## Quick Start

### Prerequisites

- **Node.js**: Version 20 or higher
- **npm**: Package manager

### Installation

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up environment variables**

   ```bash
   npx hardhat vars set MNEMONIC
   npx hardhat vars set INFURA_API_KEY
   # Optional: Set Etherscan API key for contract verification
   npx hardhat vars set ETHERSCAN_API_KEY
   ```

3. **Compile all contracts**

   ```bash
   npm run compile
   ```

4. **Run all tests**

   ```bash
   npm run test
   ```

## Contracts

### AccessControl

Located in `contracts/AccessControl.sol`

Run specific tests:
```bash
npx hardhat test test/AccessControl.ts
```

### AllowTransient

Located in `contracts/AllowTransient.sol`

Run specific tests:
```bash
npx hardhat test test/AllowTransient.ts
```

### PermissionExamples

Located in `contracts/PermissionExamples.sol`

Run specific tests:
```bash
npx hardhat test test/PermissionExamples.ts
```


## Deployment

### Local Network

```bash
# Start local node
npx hardhat node

# Deploy all contracts
npx hardhat deploy --network localhost
```

### Sepolia Testnet

```bash
# Deploy all contracts
npx hardhat deploy --network sepolia

# Verify contracts
npx hardhat verify --network sepolia <ACCESSCONTROL_ADDRESS>
npx hardhat verify --network sepolia <ALLOWTRANSIENT_ADDRESS>
npx hardhat verify --network sepolia <PERMISSIONEXAMPLES_ADDRESS>
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run compile` | Compile all contracts |
| `npm run test` | Run all tests |
| `npm run test:sepolia` | Run tests on Sepolia |
| `npm run lint` | Run all linters |
| `npm run lint:sol` | Lint Solidity only |
| `npm run lint:ts` | Lint TypeScript only |
| `npm run prettier:check` | Check formatting |
| `npm run prettier:write` | Auto-format code |
| `npm run clean` | Clean build artifacts |
| `npm run coverage` | Generate coverage report |

## Documentation

- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [FHEVM Examples](https://docs.zama.org/protocol/examples)
- [FHEVM Hardhat Plugin](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat)

## License

This project is licensed under the BSD-3-Clause-Clear License.

---

**Built with ❤️ using [FHEVM](https://github.com/zama-ai/fhevm) by Zama**
