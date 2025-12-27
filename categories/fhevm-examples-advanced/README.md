# FHEVM Examples: Advanced FHEVM Examples

Complex FHEVM applications including vaults, voting systems, rating systems, blind auctions, and portfolio management

## 📦 Included Examples

This project contains 8 example contracts:

1. **FHELegacyVault**
2. **SimpleVoting_uint32**
3. **ReviewCardsFHE**
4. **BlindAuction**
5. **ConfidentialPortfolioRebalancer**
6. **ConfidentialLendingPool**
7. **ConfidentialYieldAggregator**
8. **BeliefMarket**

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

### FHELegacyVault

Located in `contracts/FHELegacyVault.sol`

Run specific tests:
```bash
npx hardhat test test/FHELegacyVault.ts
```

### SimpleVoting_uint32

Located in `contracts/SimpleVoting_uint32.sol`

Run specific tests:
```bash
npx hardhat test test/SimpleVoting_uint32.ts
```

### ReviewCardsFHE

Located in `contracts/ReviewCardsFHE.sol`

Run specific tests:
```bash
npx hardhat test test/ReviewCardsFHE.ts
```

### BlindAuction

Located in `contracts/BlindAuction.sol`

Run specific tests:
```bash
npx hardhat test test/BlindAuction.ts
```

### ConfidentialPortfolioRebalancer

Located in `contracts/ConfidentialPortfolioRebalancer.sol`

Run specific tests:
```bash
npx hardhat test test/ConfidentialPortfolioRebalancer.ts
```

### ConfidentialLendingPool

Located in `contracts/ConfidentialLendingPool.sol`

Run specific tests:
```bash
npx hardhat test test/ConfidentialLendingPool.ts
```

### ConfidentialYieldAggregator

Located in `contracts/ConfidentialYieldAggregator.sol`

Run specific tests:
```bash
npx hardhat test test/ConfidentialYieldAggregator.ts
```

### BeliefMarket

Located in `contracts/BeliefMarket.sol`

Run specific tests:
```bash
npx hardhat test test/BeliefMarket.ts
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
npx hardhat verify --network sepolia <FHELEGACYVAULT_ADDRESS>
npx hardhat verify --network sepolia <SIMPLEVOTING_UINT32_ADDRESS>
npx hardhat verify --network sepolia <REVIEWCARDSFHE_ADDRESS>
npx hardhat verify --network sepolia <BLINDAUCTION_ADDRESS>
npx hardhat verify --network sepolia <CONFIDENTIALPORTFOLIOREBALANCER_ADDRESS>
npx hardhat verify --network sepolia <CONFIDENTIALLENDINGPOOL_ADDRESS>
npx hardhat verify --network sepolia <CONFIDENTIALYIELDAGGREGATOR_ADDRESS>
npx hardhat verify --network sepolia <BELIEFMARKET_ADDRESS>
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
