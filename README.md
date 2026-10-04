# KINGLOZO DEX v1

KINGLOZO DEX v1 is a BNB Chain constant-product AMM designed as a testnet-first project. It is inspired by the proven Factory/Pair/Router architecture used by major AMMs, but its contracts must still be independently audited before mainnet use.

## Stack

- Solidity 0.8.20
- OpenZeppelin
- Hardhat + Foundry configuration
- React + Vite
- Ethers v6
- BNB Smart Chain Testnet
- BscScan verification support

## Smart contracts

- `contracts/AMMFactory.sol` — validates tokens and creates unique pairs
- `contracts/AMMPair.sol` — constant-product pool, LP token, 0.30% swap fee, invariant checks and reentrancy lock
- `contracts/AMMRouter.sol` — liquidity, slippage limits, deadlines, multi-hop swaps and native BNB/WBNB flows
- `contracts/Token.sol` — test ERC20
- `contracts/WBNB.sol` — wrapped native BNB for the testnet

## Local verification

Install dependencies:

```bash
npm install
npm run compile
npm test
npm run frontend:install
npm run frontend:build
```

The test suite covers pool creation, both swap directions, reversed token ordering, slippage, expired deadlines, liquidity removal, multi-hop swaps, native BNB liquidity/swaps and invalid address checks.

## BNB Testnet deployment

Copy the example environment:

```bash
cp .env.example .env
```

Set the secrets in your local environment or Replit/GitHub Secrets. Never commit a real private key.

Required variables:

- `PRIVATE_KEY`
- `BNB_TESTNET_RPC_URL`
- `BSC_API_KEY`

Deploy only to BNB Testnet:

```bash
npm run deploy:bsc
```

The deployment script writes a generated `deployments/bnbTestnet.json` file locally. Deployment files are ignored by Git so no secret is committed.

For the frontend, copy `frontend/.env.example` to `frontend/.env` and fill the deployed contract addresses:

- `VITE_FACTORY_ADDRESS`
- `VITE_ROUTER_ADDRESS`
- `VITE_WBNB_ADDRESS`
- `VITE_KLOZO_ADDRESS`
- `VITE_RKT_ADDRESS`

Then run:

```bash
npm run frontend:install
npm run frontend:dev
```

The frontend connects an injected wallet, targets BNB Testnet, reads live balances/quotes, requests ERC20 approvals, executes swaps, and adds/removes liquidity.

## Verification

After a successful testnet deployment and with a BscScan API key, verify contracts with Hardhat using the BNB Testnet custom chain configuration.

Do not treat a successful compile as a security audit. Before mainnet:

1. Run the full test suite and fuzz/invariant testing.
2. Run static analysis such as Slither.
3. Review router/pair edge cases and economic assumptions.
4. Verify source code on BscScan.
5. Perform an independent smart-contract security review/audit.
6. Test with a dedicated deployment wallet and multisig/admin policy if protocol administration is introduced.

## Current scope

KINGLOZO v1 is intentionally testnet-first. No mainnet deployment is performed by this repository configuration.
