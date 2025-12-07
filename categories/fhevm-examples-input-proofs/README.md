# FHEVM Examples: Input Proof Examples

Explains input proofs, their usage, common mistakes, and handle lifecycle in FHEVM

## 📦 Included Examples

This project contains 4 example contracts:

1. **InputProofBasics**
2. **InputProofUsage**
3. **InputProofAntiPatterns**
4. **HandleLifecycle**

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

### InputProofBasics

Located in `contracts/InputProofBasics.sol`

Run specific tests:
```bash
npx hardhat test test/InputProofBasics.ts
```

### InputProofUsage

Located in `contracts/InputProofUsage.sol`

Run specific tests:
```bash
npx hardhat test test/InputProofUsage.ts
```

### InputProofAntiPatterns

Located in `contracts/InputProofAntiPatterns.sol`

Run specific tests:
```bash
npx hardhat test test/InputProofAntiPatterns.ts
```

### HandleLifecycle

Located in `contracts/HandleLifecycle.sol`

Run specific tests:
```bash
npx hardhat test test/HandleLifecycle.ts
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
npx hardhat verify --network sepolia <INPUTPROOFBASICS_ADDRESS>
npx hardhat verify --network sepolia <INPUTPROOFUSAGE_ADDRESS>
npx hardhat verify --network sepolia <INPUTPROOFANTIPATTERNS_ADDRESS>
npx hardhat verify --network sepolia <HANDLELIFECYCLE_ADDRESS>
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
