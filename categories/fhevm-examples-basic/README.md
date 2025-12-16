# FHEVM Examples: Basic FHEVM Examples

Fundamental FHEVM operations including encryption, decryption, and basic FHE operations

## 📦 Included Examples

This project contains 18 example contracts:

1. **FHECounter**
2. **EncryptSingleValue**
3. **EncryptMultipleValues**
4. **UserDecryptSingleValue**
5. **UserDecryptMultipleValues**
6. **HeadsOrTails**
7. **HighestDieRoll**
8. **FHEAdd**
9. **FHEIfThenElse**
10. **FHEMin**
11. **FHEMul**
12. **FHEXor**
13. **FHEDiv**
14. **FHEBitwise**
15. **FHESub**
16. **FHERem**
17. **FHEMax**
18. **FHEComparison**

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

### FHECounter

Located in `contracts/FHECounter.sol`

Run specific tests:
```bash
npx hardhat test test/FHECounter.ts
```

### EncryptSingleValue

Located in `contracts/EncryptSingleValue.sol`

Run specific tests:
```bash
npx hardhat test test/EncryptSingleValue.ts
```

### EncryptMultipleValues

Located in `contracts/EncryptMultipleValues.sol`

Run specific tests:
```bash
npx hardhat test test/EncryptMultipleValues.ts
```

### UserDecryptSingleValue

Located in `contracts/UserDecryptSingleValue.sol`

Run specific tests:
```bash
npx hardhat test test/UserDecryptSingleValue.ts
```

### UserDecryptMultipleValues

Located in `contracts/UserDecryptMultipleValues.sol`

Run specific tests:
```bash
npx hardhat test test/UserDecryptMultipleValues.ts
```

### HeadsOrTails

Located in `contracts/HeadsOrTails.sol`

Run specific tests:
```bash
npx hardhat test test/HeadsOrTails.ts
```

### HighestDieRoll

Located in `contracts/HighestDieRoll.sol`

Run specific tests:
```bash
npx hardhat test test/HighestDieRoll.ts
```

### FHEAdd

Located in `contracts/FHEAdd.sol`

Run specific tests:
```bash
npx hardhat test test/FHEAdd.ts
```

### FHEIfThenElse

Located in `contracts/FHEIfThenElse.sol`

Run specific tests:
```bash
npx hardhat test test/FHEIfThenElse.ts
```

### FHEMin

Located in `contracts/FHEMin.sol`

Run specific tests:
```bash
npx hardhat test test/FHEMin.ts
```

### FHEMul

Located in `contracts/FHEMul.sol`

Run specific tests:
```bash
npx hardhat test test/FHEMul.ts
```

### FHEXor

Located in `contracts/FHEXor.sol`

Run specific tests:
```bash
npx hardhat test test/FHEXor.ts
```

### FHEDiv

Located in `contracts/FHEDiv.sol`

Run specific tests:
```bash
npx hardhat test test/FHEDiv.ts
```

### FHEBitwise

Located in `contracts/FHEBitwise.sol`

Run specific tests:
```bash
npx hardhat test test/FHEBitwise.ts
```

### FHESub

Located in `contracts/FHESub.sol`

Run specific tests:
```bash
npx hardhat test test/FHESub.ts
```

### FHERem

Located in `contracts/FHERem.sol`

Run specific tests:
```bash
npx hardhat test test/FHERem.ts
```

### FHEMax

Located in `contracts/FHEMax.sol`

Run specific tests:
```bash
npx hardhat test test/FHEMax.ts
```

### FHEComparison

Located in `contracts/FHEComparison.sol`

Run specific tests:
```bash
npx hardhat test test/FHEComparison.ts
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
npx hardhat verify --network sepolia <FHECOUNTER_ADDRESS>
npx hardhat verify --network sepolia <ENCRYPTSINGLEVALUE_ADDRESS>
npx hardhat verify --network sepolia <ENCRYPTMULTIPLEVALUES_ADDRESS>
npx hardhat verify --network sepolia <USERDECRYPTSINGLEVALUE_ADDRESS>
npx hardhat verify --network sepolia <USERDECRYPTMULTIPLEVALUES_ADDRESS>
npx hardhat verify --network sepolia <HEADSORTAILS_ADDRESS>
npx hardhat verify --network sepolia <HIGHESTDIEROLL_ADDRESS>
npx hardhat verify --network sepolia <FHEADD_ADDRESS>
npx hardhat verify --network sepolia <FHEIFTHENELSE_ADDRESS>
npx hardhat verify --network sepolia <FHEMIN_ADDRESS>
npx hardhat verify --network sepolia <FHEMUL_ADDRESS>
npx hardhat verify --network sepolia <FHEXOR_ADDRESS>
npx hardhat verify --network sepolia <FHEDIV_ADDRESS>
npx hardhat verify --network sepolia <FHEBITWISE_ADDRESS>
npx hardhat verify --network sepolia <FHESUB_ADDRESS>
npx hardhat verify --network sepolia <FHEREM_ADDRESS>
npx hardhat verify --network sepolia <FHEMAX_ADDRESS>
npx hardhat verify --network sepolia <FHECOMPARISON_ADDRESS>
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
