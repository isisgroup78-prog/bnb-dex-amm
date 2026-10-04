import { useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';

const CHAIN_ID = 97;
const ZERO = ethers.ZeroAddress;
const DEADLINE_SECONDS = 20 * 60;

const FACTORY_ABI = [
  'function getPair(address,address) view returns (address)'
];

const ROUTER_ABI = [
  'function WBNB_TOKEN() view returns (address)',
  'function getAmountsOut(uint256,address[]) view returns (uint256[])',
  'function addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256) returns (uint256,uint256,uint256)',
  'function addLiquidityETH(address,uint256,uint256,uint256,address,uint256) payable returns (uint256,uint256,uint256)',
  'function removeLiquidity(address,address,uint256,uint256,uint256,address,uint256) returns (uint256,uint256)',
  'function removeLiquidityETH(address,uint256,uint256,uint256,address,uint256) returns (uint256,uint256)',
  'function swapExactTokensForTokens(uint256,uint256,address[],address,uint256) returns (uint256)',
  'function swapExactETHForTokens(uint256,address[],address,uint256) payable returns (uint256)',
  'function swapExactTokensForETH(uint256,uint256,address[],address,uint256) returns (uint256)'
];

const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address,address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)'
];

const PAIR_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address,address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)'
];

const tokenList = [
  { symbol: 'BNB', address: ZERO, native: true },
  { symbol: 'KLOZO', address: import.meta.env.VITE_KLOZO_ADDRESS || '', native: false },
  { symbol: 'RKT', address: import.meta.env.VITE_RKT_ADDRESS || '', native: false },
  { symbol: 'WBNB', address: import.meta.env.VITE_WBNB_ADDRESS || '', native: false }
];

const formatAddress = (address) => address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '—';
const nowDeadline = () => Math.floor(Date.now() / 1000) + DEADLINE_SECONDS;

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [wallet, setWallet] = useState('');
  const [chainId, setChainId] = useState(null);
  const [bnbBalance, setBnbBalance] = useState('0');
  const [status, setStatus] = useState('Connect your wallet');
  const [busy, setBusy] = useState(false);

  const [tokenFrom, setTokenFrom] = useState('BNB');
  const [tokenTo, setTokenTo] = useState('KLOZO');
  const [fromAmount, setFromAmount] = useState('');
  const [quote, setQuote] = useState('');

  const [liquidityA, setLiquidityA] = useState('BNB');
  const [liquidityB, setLiquidityB] = useState('KLOZO');
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [lpBalance, setLpBalance] = useState('0');

  const factoryAddress = import.meta.env.VITE_FACTORY_ADDRESS || '';
  const routerAddress = import.meta.env.VITE_ROUTER_ADDRESS || '';
  const wbnbAddress = import.meta.env.VITE_WBNB_ADDRESS || '';

  const availableTokens = useMemo(
    () => tokenList.filter((t) => t.native || ethers.isAddress(t.address)),
    []
  );

  const getToken = (symbol) => availableTokens.find((t) => t.symbol === symbol);

  const requireConfig = () => {
    if (!factoryAddress || !routerAddress || !wbnbAddress) {
      throw new Error('Contract addresses are not configured. Set the VITE_* deployment variables.');
    }
  };

  const switchToBnbTestnet = async () => {
    if (!window.ethereum) throw new Error('No compatible wallet found.');
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x61' }]
      });
    } catch (error) {
      if (error.code !== 4902) throw error;
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x61',
          chainName: 'BNB Smart Chain Testnet',
          nativeCurrency: { name: 'tBNB', symbol: 'tBNB', decimals: 18 },
          rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
          blockExplorerUrls: ['https://testnet.bscscan.com']
        }]
      });
    }
  };

  const refreshWallet = async (p = provider, address = wallet) => {
    if (!p || !address) return;
    const network = await p.getNetwork();
    setChainId(Number(network.chainId));
    setBnbBalance(ethers.formatEther(await p.getBalance(address)));
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      setStatus('Install MetaMask or another injected wallet.');
      return;
    }

    try {
      requireConfig();
      await switchToBnbTestnet();
      const p = new ethers.BrowserProvider(window.ethereum);
      await p.send('eth_requestAccounts', []);
      const s = await p.getSigner();
      const address = await s.getAddress();
      setProvider(p);
      setSigner(s);
      setWallet(address);
      await refreshWallet(p, address);
      setStatus('Wallet connected to BNB Testnet');
    } catch (error) {
      console.error(error);
      setStatus(error.shortMessage || error.message || 'Connection failed');
    }
  };

  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccounts = async (accounts) => {
      if (!accounts.length) {
        setWallet('');
        setSigner(null);
        return;
      }
      const p = new ethers.BrowserProvider(window.ethereum);
      const s = await p.getSigner();
      setProvider(p);
      setSigner(s);
      setWallet(accounts[0]);
      refreshWallet(p, accounts[0]).catch(console.error);
    };
    const handleChain = () => window.location.reload();
    window.ethereum.on('accountsChanged', handleAccounts);
    window.ethereum.on('chainChanged', handleChain);
    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccounts);
      window.ethereum.removeListener('chainChanged', handleChain);
    };
  }, []);

  const quoteSwap = async () => {
    if (!signer || !fromAmount) return;
    try {
      requireConfig();
      const from = getToken(tokenFrom);
      const to = getToken(tokenTo);
      if (!from || !to || tokenFrom === tokenTo) return;
      const router = new ethers.Contract(routerAddress, ROUTER_ABI, provider);
      const path = [
        from.native ? wbnbAddress : from.address,
        to.native ? wbnbAddress : to.address
      ];
      const amounts = await router.getAmountsOut(ethers.parseEther(fromAmount), path);
      setQuote(ethers.formatEther(amounts[amounts.length - 1]));
    } catch {
      setQuote('');
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => quoteSwap(), 300);
    return () => clearTimeout(timer);
  }, [fromAmount, tokenFrom, tokenTo, signer]);

  const ensureAllowance = async (tokenAddress, amount) => {
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    const current = await token.allowance(wallet, routerAddress);
    if (current < amount) {
      setStatus(`Approving ${tokenFrom}...`);
      const tx = await token.approve(routerAddress, ethers.MaxUint256);
      await tx.wait();
    }
  };

  const executeSwap = async () => {
    if (!signer || !fromAmount) {
      setStatus('Connect wallet and enter an amount.');
      return;
    }

    try {
      setBusy(true);
      requireConfig();
      const from = getToken(tokenFrom);
      const to = getToken(tokenTo);
      const router = new ethers.Contract(routerAddress, ROUTER_ABI, signer);
      const path = [
        from.native ? wbnbAddress : from.address,
        to.native ? wbnbAddress : to.address
      ];
      const amountIn = ethers.parseEther(fromAmount);
      const amounts = await router.getAmountsOut(amountIn, path);
      const amountOutMin = amounts[amounts.length - 1] * 995n / 1000n;

      let tx;
      if (from.native && !to.native) {
        tx = await router.swapExactETHForTokens(amountOutMin, path, wallet, nowDeadline(), { value: amountIn });
      } else if (!from.native && to.native) {
        await ensureAllowance(from.address, amountIn);
        tx = await router.swapExactTokensForETH(amountIn, amountOutMin, path, wallet, nowDeadline());
      } else {
        await ensureAllowance(from.address, amountIn);
        tx = await router.swapExactTokensForTokens(amountIn, amountOutMin, path, wallet, nowDeadline());
      }

      setStatus(`Swap submitted: ${formatAddress(tx.hash)}`);
      await tx.wait();
      setStatus('Swap confirmed');
      await refreshWallet();
      await quoteSwap();
    } catch (error) {
      console.error(error);
      setStatus(error.shortMessage || error.message || 'Swap failed');
    } finally {
      setBusy(false);
    }
  };

  const executeAddLiquidity = async () => {
    if (!signer || !amountA || !amountB) {
      setStatus('Connect wallet and enter both liquidity amounts.');
      return;
    }

    try {
      setBusy(true);
      requireConfig();
      const a = getToken(liquidityA);
      const b = getToken(liquidityB);
      if (!a || !b || liquidityA === liquidityB) throw new Error('Choose two different tokens.');

      const router = new ethers.Contract(routerAddress, ROUTER_ABI, signer);
      let tx;

      if (a.native || b.native) {
        const token = a.native ? b : a;
        const tokenAmount = ethers.parseEther(a.native ? amountB : amountA);
        const nativeAmount = ethers.parseEther(a.native ? amountA : amountB);
        await ensureAllowance(token.address, tokenAmount);
        tx = await router.addLiquidityETH(
          token.address,
          tokenAmount,
          0,
          0,
          wallet,
          nowDeadline(),
          { value: nativeAmount }
        );
      } else {
        const valueA = ethers.parseEther(amountA);
        const valueB = ethers.parseEther(amountB);
        await ensureAllowance(a.address, valueA);
        await ensureAllowance(b.address, valueB);
        tx = await router.addLiquidity(
          a.address, b.address, valueA, valueB, 0, 0, wallet, nowDeadline()
        );
      }

      setStatus(`Liquidity submitted: ${formatAddress(tx.hash)}`);
      await tx.wait();
      setStatus('Liquidity added');
      await refreshWallet();
    } catch (error) {
      console.error(error);
      setStatus(error.shortMessage || error.message || 'Liquidity transaction failed');
    } finally {
      setBusy(false);
    }
  };

  const loadLpBalance = async () => {
    if (!signer) return;
    try {
      const a = getToken(liquidityA);
      const b = getToken(liquidityB);
      const tokenA = a.native ? wbnbAddress : a.address;
      const tokenB = b.native ? wbnbAddress : b.address;
      const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, provider);
      const pairAddress = await factory.getPair(tokenA, tokenB);
      if (pairAddress === ZERO) {
        setLpBalance('0');
        return;
      }
      const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
      setLpBalance(ethers.formatEther(await pair.balanceOf(wallet)));
    } catch {
      setLpBalance('0');
    }
  };

  const executeRemoveLiquidity = async () => {
    if (!signer || !lpBalance || lpBalance === '0') {
      setStatus('No LP balance found for this pair.');
      return;
    }

    try {
      setBusy(true);
      const a = getToken(liquidityA);
      const b = getToken(liquidityB);
      const tokenA = a.native ? wbnbAddress : a.address;
      const tokenB = b.native ? wbnbAddress : b.address;
      const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, provider);
      const pairAddress = await factory.getPair(tokenA, tokenB);
      if (pairAddress === ZERO) throw new Error('Pool not found.');

      const pair = new ethers.Contract(pairAddress, PAIR_ABI, signer);
      const liquidity = ethers.parseEther(lpBalance);
      const allowance = await pair.allowance?.(wallet, routerAddress);
      if (allowance === undefined || allowance < liquidity) {
        const txApprove = await pair.approve(routerAddress, ethers.MaxUint256);
        await txApprove.wait();
      }

      const router = new ethers.Contract(routerAddress, ROUTER_ABI, signer);
      let tx;
      if (a.native || b.native) {
        const token = a.native ? b : a;
        tx = await router.removeLiquidityETH(
          token.address, liquidity, 0, 0, wallet, nowDeadline()
        );
      } else {
        tx = await router.removeLiquidity(
          a.address, b.address, liquidity, 0, 0, wallet, nowDeadline()
        );
      }

      setStatus(`Liquidity removal submitted: ${formatAddress(tx.hash)}`);
      await tx.wait();
      setStatus('Liquidity removed');
      await loadLpBalance();
    } catch (error) {
      console.error(error);
      setStatus(error.shortMessage || error.message || 'Liquidity removal failed');
    } finally {
      setBusy(false);
    }
  };

  const networkLabel = chainId === CHAIN_ID ? 'BNB Testnet' : chainId ? `Wrong network (${chainId})` : 'Not connected';

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">BNB Chain • AMM DEX</p>
          <h1>KINGLOZO DEX v1</h1>
        </div>
        <button className="primary-button" onClick={connectWallet} disabled={busy}>
          {wallet ? formatAddress(wallet) : 'Connect Wallet'}
        </button>
      </header>

      <section className="summary-grid">
        <div className="summary-card"><span className="label">Network</span><strong>{networkLabel}</strong></div>
        <div className="summary-card"><span className="label">Wallet</span><strong>{wallet ? formatAddress(wallet) : 'Not connected'}</strong></div>
        <div className="summary-card"><span className="label">tBNB balance</span><strong>{Number(bnbBalance).toFixed(4)}</strong></div>
        <div className="summary-card"><span className="label">Status</span><strong>{status}</strong></div>
      </section>

      <main className="content-grid">
        <section className="panel trade-panel">
          <div className="panel-header"><h2>Swap</h2><span className="badge">0.30% AMM fee</span></div>

          <div className="field">
            <label>From</label>
            <div className="field-row">
              <select value={tokenFrom} onChange={(e) => setTokenFrom(e.target.value)}>
                {availableTokens.map((t) => <option key={t.symbol}>{t.symbol}</option>)}
              </select>
              <input type="number" min="0" value={fromAmount} onChange={(e) => setFromAmount(e.target.value)} placeholder="0.0" />
            </div>
          </div>

          <div className="swap-arrow">⇅</div>

          <div className="field">
            <label>Estimated output</label>
            <div className="field-row">
              <select value={tokenTo} onChange={(e) => setTokenTo(e.target.value)}>
                {availableTokens.filter((t) => t.symbol !== tokenFrom).map((t) => <option key={t.symbol}>{t.symbol}</option>)}
              </select>
              <input readOnly value={quote} placeholder="0.0" />
            </div>
          </div>

          <button className="primary-button full" onClick={executeSwap} disabled={busy || !wallet}>
            {busy ? 'Processing…' : 'Swap'}
          </button>
        </section>

        <aside className="panel side-panel">
          <div className="panel-header"><h2>Liquidity</h2><span className="badge">LP</span></div>

          <div className="field-row">
            <select value={liquidityA} onChange={(e) => setLiquidityA(e.target.value)}>
              {availableTokens.map((t) => <option key={t.symbol}>{t.symbol}</option>)}
            </select>
            <input type="number" min="0" value={amountA} onChange={(e) => setAmountA(e.target.value)} placeholder="Amount" />
          </div>

          <div className="swap-arrow">+</div>

          <div className="field-row">
            <select value={liquidityB} onChange={(e) => setLiquidityB(e.target.value)}>
              {availableTokens.filter((t) => t.symbol !== liquidityA).map((t) => <option key={t.symbol}>{t.symbol}</option>)}
            </select>
            <input type="number" min="0" value={amountB} onChange={(e) => setAmountB(e.target.value)} placeholder="Amount" />
          </div>

          <button className="primary-button full" onClick={executeAddLiquidity} disabled={busy || !wallet}>Add liquidity</button>
          <button className="secondary-button full" onClick={async () => { await loadLpBalance(); setStatus(`LP balance: ${lpBalance}`); }} disabled={!wallet}>Check LP balance</button>
          <button className="secondary-button full" onClick={executeRemoveLiquidity} disabled={busy || !wallet || lpBalance === '0'}>Remove LP</button>
        </aside>
      </main>

      <section className="bottom-grid">
        <div className="panel">
          <div className="panel-header"><h2>Deployment</h2></div>
          <ul className="stats-list">
            <li><span>Factory</span><strong>{formatAddress(factoryAddress)}</strong></li>
            <li><span>Router</span><strong>{formatAddress(routerAddress)}</strong></li>
            <li><span>WBNB</span><strong>{formatAddress(wbnbAddress)}</strong></li>
          </ul>
        </div>
        <div className="panel">
          <div className="panel-header"><h2>Safety</h2></div>
          <p>Slippage is protected by a 0.5% default tolerance in the UI. Transactions use a deadline and are intended for BNB Testnet until the contracts are independently audited.</p>
        </div>
      </section>
    </div>
  );
}

export default App;
