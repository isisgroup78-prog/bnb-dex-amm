import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

const factoryAddress = '0x0000000000000000000000000000000000000000';
const routerAddress = '0x0000000000000000000000000000000000000000';

const tokenList = [
  { symbol: 'BNB', address: '0x0000000000000000000000000000000000000000' },
  { symbol: 'USDT', address: '0x0000000000000000000000000000000000000000' },
  { symbol: 'TKA', address: '0x0000000000000000000000000000000000000000' },
  { symbol: 'TKB', address: '0x0000000000000000000000000000000000000000' }
];

const formatAddress = (address) =>
  address && address.length > 10 ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : address;

function App() {
  const [account, setAccount] = useState('');
  const [networkName, setNetworkName] = useState('BNB Chain');
  const [tokenIn, setTokenIn] = useState('BNB');
  const [tokenOut, setTokenOut] = useState('USDT');
  const [amount, setAmount] = useState('1');
  const [price, setPrice] = useState('0.00');
  const [status, setStatus] = useState('Not connected');

  const connectWallet = async () => {
    if (!window.ethereum) {
      setStatus('MetaMask not detected');
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const network = await provider.getNetwork();
      setAccount(accounts[0]);
      setNetworkName(network.name || 'BNB Chain');
      setStatus('Wallet connected');
    } catch (error) {
      setStatus('Wallet connection failed');
      console.error(error);
    }
  };

  useEffect(() => {
    const estimate = Number(amount || 0) * 1.98;
    setPrice(estimate.toFixed(2));
  }, [amount]);

  const handleSwap = async () => {
    if (!account) {
      setStatus('Connect a wallet first');
      return;
    }

    setStatus(`Swap prepared: ${amount} ${tokenIn} → ${tokenOut}`);
  };

  return (
    <div className="app-shell">
      <div className="header">
        <div>
          <p className="eyebrow">BNB Chain DEX</p>
          <h1>Binora Swap</h1>
        </div>
        <button className="connect-button" onClick={connectWallet}>
          {account ? formatAddress(account) : 'Connect Wallet'}
        </button>
      </div>

      <div className="topbar">
        <div>
          <span className="label">Network</span>
          <strong>{networkName}</strong>
        </div>
        <div>
          <span className="label">Status</span>
          <strong>{status}</strong>
        </div>
      </div>

      <main className="panel">
        <div className="swap-card">
          <div className="row">
            <label>From</label>
            <select value={tokenIn} onChange={(e) => setTokenIn(e.target.value)}>
              {tokenList.map((token) => (
                <option key={token.symbol} value={token.symbol}>
                  {token.symbol}
                </option>
              ))}
            </select>
          </div>

          <div className="amount-row">
            <input
              type="number"
              value={amount}
              min="0"
              step="0.01"
              onChange={(e) => setAmount(e.target.value)}
            />
            <span>{tokenIn}</span>
          </div>

          <div className="swap-arrow">⇅</div>

          <div className="row">
            <label>To</label>
            <select value={tokenOut} onChange={(e) => setTokenOut(e.target.value)}>
              {tokenList
                .filter((token) => token.symbol !== tokenIn)
                .map((token) => (
                  <option key={token.symbol} value={token.symbol}>
                    {token.symbol}
                  </option>
                ))}
            </select>
          </div>

          <div className="amount-row muted">
            <input type="text" value={price} readOnly />
            <span>{tokenOut}</span>
          </div>

          <button className="swap-button" onClick={handleSwap}>
            Swap now
          </button>
        </div>

        <div className="info-card">
          <h2>Pool Information</h2>
          <ul>
            <li>Factory: {formatAddress(factoryAddress)}</li>
            <li>Router: {formatAddress(routerAddress)}</li>
            <li>Fee: 0.3%</li>
            <li>Mode: AMM</li>
          </ul>

          <h3>Add liquidity</h3>
          <p>Set token balances, approve them, then add liquidity to the pool.</p>

          <button className="secondary-button">Add Liquidity</button>
        </div>
      </main>
    </div>
  );
}

export default App;
