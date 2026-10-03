import { useMemo, useState } from 'react';
import { ethers } from 'ethers';

const tokenList = [
  { symbol: 'BNB', address: '0x0000000000000000000000000000000000000000', logo: 'Ξ' },
  { symbol: 'USDT', address: '0x0000000000000000000000000000000000000000', logo: '₮' },
  { symbol: 'BNT', address: '0x0000000000000000000000000000000000000000', logo: 'B' },
  { symbol: 'RKT', address: '0x0000000000000000000000000000000000000000', logo: 'R' }
];

const formatAddress = (address) => {
  if (!address) return '—';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

function App() {
  const [wallet, setWallet] = useState('');
  const [network, setNetwork] = useState('BNB Testnet');
  const [status, setStatus] = useState('Wallet not connected');
  const [tokenFrom, setTokenFrom] = useState('BNB');
  const [tokenTo, setTokenTo] = useState('USDT');
  const [fromAmount, setFromAmount] = useState('1');
  const [price, setPrice] = useState('1.98');

  const pairLabel = useMemo(() => `${tokenFrom}/${tokenTo}`, [tokenFrom, tokenTo]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setStatus('MetaMask not installed');
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const net = await provider.getNetwork();
      setWallet(accounts[0]);
      setNetwork(net.name || 'BNB Testnet');
      setStatus('Wallet connected');
    } catch (error) {
      console.error(error);
      setStatus('Connection failed');
    }
  };

  const handleSwap = () => {
    if (!wallet) {
      setStatus('Connect wallet first');
      return;
    }

    setStatus(`Swap ready: ${fromAmount} ${tokenFrom} to ${tokenTo}`);
  };

  const handleAddLiquidity = () => {
    if (!wallet) {
      setStatus('Connect wallet first');
      return;
    }

    setStatus(`Liquidity prepared for ${pairLabel}`);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">BNB Chain DEX</p>
          <h1>Binora Swap</h1>
        </div>
        <button className="primary-button" onClick={connectWallet}>
          {wallet ? formatAddress(wallet) : 'Connect Wallet'}
        </button>
      </header>

      <section className="summary-grid">
        <div className="summary-card">
          <span className="label">Network</span>
          <strong>{network}</strong>
        </div>
        <div className="summary-card">
          <span className="label">Status</span>
          <strong>{status}</strong>
        </div>
        <div className="summary-card">
          <span className="label">Fees</span>
          <strong>0.3%</strong>
        </div>
      </section>

      <main className="content-grid">
        <section className="panel trade-panel">
          <div className="panel-header">
            <h2>Trade</h2>
            <span className="badge">AMM</span>
          </div>

          <div className="field">
            <label>From</label>
            <div className="field-row">
              <select value={tokenFrom} onChange={(e) => setTokenFrom(e.target.value)}>
                {tokenList.map((token) => (
                  <option key={token.symbol} value={token.symbol}>{token.symbol}</option>
                ))}
              </select>
              <input type="number" value={fromAmount} onChange={(e) => setFromAmount(e.target.value)} />
            </div>
          </div>

          <div className="swap-arrow">⇅</div>

          <div className="field">
            <label>To</label>
            <div className="field-row">
              <select value={tokenTo} onChange={(e) => setTokenTo(e.target.value)}>
                {tokenList
                  .filter((token) => token.symbol !== tokenFrom)
                  .map((token) => (
                    <option key={token.symbol} value={token.symbol}>{token.symbol}</option>
                  ))}
              </select>
              <input type="text" value={price} readOnly />
            </div>
          </div>

          <button className="primary-button full" onClick={handleSwap}>Swap Now</button>
        </section>

        <aside className="panel side-panel">
          <div className="panel-header">
            <h2>Pool Overview</h2>
          </div>

          <ul className="stats-list">
            <li><span>Pair</span><strong>{pairLabel}</strong></li>
            <li><span>Liquidity</span><strong>$12.4M</strong></li>
            <li><span>Volume 24h</span><strong>$6.9M</strong></li>
            <li><span>APR</span><strong>18.5%</strong></li>
          </ul>

          <button className="secondary-button full" onClick={handleAddLiquidity}>Add Liquidity</button>
        </aside>
      </main>

      <section className="bottom-grid">
        <div className="panel">
          <div className="panel-header"><h2>Top Pools</h2></div>
          <div className="pool-list">
            <div className="pool-item"><span>BNB / USDT</span><strong>High liquidity</strong></div>
            <div className="pool-item"><span>BNT / BNB</span><strong>Low fee</strong></div>
            <div className="pool-item"><span>RKT / USDT</span><strong>Growing</strong></div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header"><h2>Wallet Info</h2></div>
          <div className="wallet-box">
            <span>Address</span>
            <strong>{wallet ? formatAddress(wallet) : 'Not connected'}</strong>
            <span>Balance</span>
            <strong>2.84 BNB</strong>
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;
