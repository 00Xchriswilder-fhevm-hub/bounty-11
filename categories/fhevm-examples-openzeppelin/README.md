# FHEVM Examples: OpenZeppelin Confidential Contracts

Examples using OpenZeppelin confidential contracts including ERC7984 tokens, wrappers, swaps, vesting wallets, confidential voting, and RWA tokens

## 📦 Included Examples

This project contains 10 example contracts:

1. **ERC7984Mock**
2. **ERC7984ToERC20Wrapper**
3. **SwapERC7984ToERC20**
4. **SwapERC7984ToERC7984**
5. **VestingWallet**
6. **VestingWalletConfidentialFactoryMock**
7. **VestingWalletCliffConfidentialFactoryMock**
8. **ERC7984VotesMock**
9. **ERC7984Initialized**
10. **ERC7984OmnibusMock**

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

### ERC7984Mock

Located in `contracts/ERC7984Mock.sol`

Run specific tests:
```bash
npx hardhat test test/ERC7984Mock.ts
```

### ERC7984ToERC20Wrapper

Located in `contracts/ERC7984ToERC20Wrapper.sol`

Run specific tests:
```bash
npx hardhat test test/ERC7984ToERC20Wrapper.ts
```

### SwapERC7984ToERC20

Located in `contracts/SwapERC7984ToERC20.sol`

Run specific tests:
```bash
npx hardhat test test/SwapERC7984ToERC20.ts
```

### SwapERC7984ToERC7984

Located in `contracts/SwapERC7984ToERC7984.sol`

Run specific tests:
```bash
npx hardhat test test/SwapERC7984ToERC7984.ts
```

### VestingWallet

Located in `contracts/VestingWallet.sol`

Run specific tests:
```bash
npx hardhat test test/VestingWallet.ts
```

### VestingWalletConfidentialFactoryMock

Located in `contracts/VestingWalletConfidentialFactoryMock.sol`

Run specific tests:
```bash
npx hardhat test test/VestingWalletConfidentialFactoryMock.ts
```

### VestingWalletCliffConfidentialFactoryMock

Located in `contracts/VestingWalletCliffConfidentialFactoryMock.sol`

Run specific tests:
```bash
npx hardhat test test/VestingWalletCliffConfidentialFactoryMock.ts
```

### ERC7984VotesMock

Located in `contracts/ERC7984VotesMock.sol`

Run specific tests:
```bash
npx hardhat test test/ERC7984VotesMock.ts
```

### ERC7984Initialized

Located in `contracts/ERC7984Initialized.sol`

Run specific tests:
```bash
npx hardhat test test/ERC7984Initialized.ts
```

### ERC7984OmnibusMock

Located in `contracts/ERC7984OmnibusMock.sol`

Run specific tests:
```bash
npx hardhat test test/ERC7984OmnibusMock.ts
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
npx hardhat verify --network sepolia <ERC7984MOCK_ADDRESS>
npx hardhat verify --network sepolia <ERC7984TOERC20WRAPPER_ADDRESS>
npx hardhat verify --network sepolia <SWAPERC7984TOERC20_ADDRESS>
npx hardhat verify --network sepolia <SWAPERC7984TOERC7984_ADDRESS>
npx hardhat verify --network sepolia <VESTINGWALLET_ADDRESS>
npx hardhat verify --network sepolia <VESTINGWALLETCONFIDENTIALFACTORYMOCK_ADDRESS>
npx hardhat verify --network sepolia <VESTINGWALLETCLIFFCONFIDENTIALFACTORYMOCK_ADDRESS>
npx hardhat verify --network sepolia <ERC7984VOTESMOCK_ADDRESS>
npx hardhat verify --network sepolia <ERC7984INITIALIZED_ADDRESS>
npx hardhat verify --network sepolia <ERC7984OMNIBUSMOCK_ADDRESS>
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
