require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

const privateKey = process.env.PRIVATE_KEY
  ? (process.env.PRIVATE_KEY.startsWith('0x') ? process.env.PRIVATE_KEY : `0x${process.env.PRIVATE_KEY}`)
  : null;

module.exports = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    bnbTestnet: {
      url: process.env.BNB_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545/',
      chainId: 97,
      accounts: privateKey ? [privateKey] : []
    },
    localhost: {
      url: 'http://127.0.0.1:8545/'
    }
  },
  etherscan: {
    apiKey: {
      bnbTestnet: process.env.BSC_API_KEY || ''
    },
    customChains: [
      {
        network: 'bnbTestnet',
        chainId: 97,
        urls: {
          apiURL: 'https://api-testnet.bscscan.com/api',
          browserURL: 'https://testnet.bscscan.com'
        }
      }
    ]
  }
};
