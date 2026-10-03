# Binora Swap

Binora Swap is a complete BNB Chain AMM DEX starter inspired by Uniswap.

## Project name
Binora Swap

## Why this version is final
- Smart contract base for AMM pair creation and liquidity routing
- BNB Testnet deployment script
- Modern wallet-ready web interface
- Estimated swap and liquidity UX
- Clean project structure and documentation

## Stack
- Solidity 0.8.20
- Hardhat
- OpenZeppelin contracts
- React + Vite
- Ethers v6
- BNB Smart Chain Testnet

## Smart contracts
- `contracts/AMMFactory.sol` — creates pair contracts
- `contracts/AMMPair.sol` — constant-product pool and LP logic
- `contracts/AMMRouter.sol` — adds liquidity and swaps tokens
- `contracts/Token.sol` — ERC20 sample token
- `contracts/WBNB.sol` — wrapped BNB contract

## Quick start

Install all dependencies:

```bash
npm install
```

Compile the contracts:

```bash
npm run compile
```

Run the tests:

```bash
npm test
```

Install and launch the frontend:

```bash
npm run frontend:install
npm run frontend:dev
```

## Deployment to BNB testnet

Create the environment file:

```bash
cp .env.example .env
```

Update `.env`:

```bash
PRIVATE_KEY=your_private_key_here
BNB_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
BSC_API_KEY=your_bscscan_api_key
```

Deploy:

```bash
npm run deploy:bsc
```

## Frontend features
- Wallet connection UI
- Swap form
- Liquidity section
- Pool overview panel
- Token selection and pricing display

## Notes
This project is a strong starter for a real BNB DEX. For production deployment, connect real tokens, contract addresses, and a secure wallet setup. Keep private keys in a trusted environment only.
