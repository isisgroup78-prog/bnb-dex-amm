# Binora Swap

Binora Swap is a BNB Chain AMM DEX inspired by Uniswap. It includes core liquidity pool logic, token swapping, LP management, and a wallet-connected frontend.

## Project name

Binora Swap

## Features

- Constant-product AMM pools
- Factory-based pair creation
- Add and remove liquidity
- Token swaps with fee logic
- Wrapped BNB support
- React + Vite frontend for wallet connection and trading
- Hardhat deployment for BNB Testnet

## Smart contract architecture

- `contracts/AMMFactory.sol` — deploys trading pairs
- `contracts/AMMPair.sol` — pool and LP logic
- `contracts/AMMRouter.sol` — user-facing liquidity and swap entrypoints
- `contracts/Token.sol` — sample ERC20 token
- `contracts/WBNB.sol` — wrapped BNB
- `scripts/deploy.js` — deployment script

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Compile contracts:

```bash
npm run compile
```

3. Run tests:

```bash
npm test
```

4. Install and start the frontend:

```bash
npm run frontend:install
npm run frontend:dev
```

5. Deploy to BNB Testnet:

```bash
cp .env.example .env
npm run deploy:bsc
```

## Environment variables

```bash
PRIVATE_KEY=your_private_key_here
BNB_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
BSC_API_KEY=your_bscscan_api_key
```

## Frontend

The frontend is available in `frontend/` and includes:

- wallet connection
- token selection
- trade form
- liquidity panel
- deployment configuration helpers

## Notes

This starter is production-oriented and suitable for a BNB Chain project prototype. You will still need a funded wallet and valid testnet RPC settings for live deployment.
