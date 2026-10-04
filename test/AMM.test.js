const { expect } = require('chai');

describe('KINGLOZO DEX v1 AMM', function () {
  async function deployFixture() {
    const [owner, trader] = await ethers.getSigners();

    const factory = await ethers.deployContract('AMMFactory');
    const wbnb = await ethers.deployContract('WBNB');
    const router = await ethers.deployContract('AMMRouter', [
      await factory.getAddress(),
      await wbnb.getAddress()
    ]);

    const tokenA = await ethers.deployContract('Token', ['Token A', 'TKA', ethers.parseEther('1000000')]);
    const tokenB = await ethers.deployContract('Token', ['Token B', 'TKB', ethers.parseEther('1000000')]);
    const tokenC = await ethers.deployContract('Token', ['Token C', 'TKC', ethers.parseEther('1000000')]);

    await tokenA.transfer(trader.address, ethers.parseEther('1000'));
    await tokenB.transfer(trader.address, ethers.parseEther('1000'));
    await tokenC.transfer(trader.address, ethers.parseEther('1000'));

    await tokenA.approve(await router.getAddress(), ethers.MaxUint256);
    await tokenB.approve(await router.getAddress(), ethers.MaxUint256);
    await tokenC.approve(await router.getAddress(), ethers.MaxUint256);

    await tokenA.connect(trader).approve(await router.getAddress(), ethers.MaxUint256);
    await tokenB.connect(trader).approve(await router.getAddress(), ethers.MaxUint256);
    await tokenC.connect(trader).approve(await router.getAddress(), ethers.MaxUint256);

    return { owner, trader, factory, router, wbnb, tokenA, tokenB, tokenC };
  }

  function deadline() {
    return Math.floor(Date.now() / 1000) + 3600;
  }

  async function addPairLiquidity(router, tokenA, tokenB, amountA, amountB, signer) {
    await router.connect(signer).addLiquidity(
      await tokenA.getAddress(),
      await tokenB.getAddress(),
      amountA,
      amountB,
      0,
      0,
      signer.address,
      deadline()
    );
  }

  it('creates a pool and mints LP tokens', async function () {
    const { owner, factory, router, tokenA, tokenB } = await deployFixture();

    await addPairLiquidity(router, tokenA, tokenB, ethers.parseEther('100'), ethers.parseEther('100'), owner);

    const pairAddress = await factory.getPair(await tokenA.getAddress(), await tokenB.getAddress());
    expect(pairAddress).to.not.equal(ethers.ZeroAddress);

    const pair = await ethers.getContractAt('AMMPair', pairAddress);
    expect(await pair.balanceOf(owner.address)).to.be.gt(0n);
    expect(await factory.allPairsLength()).to.equal(1n);
  });

  it('swaps correctly in both token directions', async function () {
    const { owner, factory, router, tokenA, tokenB } = await deployFixture();

    await addPairLiquidity(router, tokenA, tokenB, ethers.parseEther('100'), ethers.parseEther('100'), owner);

    const pairAddress = await factory.getPair(await tokenA.getAddress(), await tokenB.getAddress());
    const pair = await ethers.getContractAt('AMMPair', pairAddress);

    const beforeB = await tokenB.balanceOf(owner.address);
    const expectedAtoB = await router.getAmountOut(
      ethers.parseEther('10'),
      ethers.parseEther('100'),
      ethers.parseEther('100')
    );

    await router.swapExactTokensForTokens(
      ethers.parseEther('10'),
      expectedAtoB,
      [await tokenA.getAddress(), await tokenB.getAddress()],
      owner.address,
      deadline()
    );

    expect(await tokenB.balanceOf(owner.address)).to.equal(beforeB + expectedAtoB);

    const beforeA = await tokenA.balanceOf(owner.address);
    const reserves = await pair.getReserves();
    const token0 = await pair.token0();
    const reserveIn = (await tokenB.getAddress()) === token0 ? reserves[0] : reserves[1];
    const reserveOut = (await tokenA.getAddress()) === token0 ? reserves[0] : reserves[1];
    const expectedBtoA = await router.getAmountOut(ethers.parseEther('10'), reserveIn, reserveOut);

    await router.swapExactTokensForTokens(
      ethers.parseEther('10'),
      expectedBtoA,
      [await tokenB.getAddress(), await tokenA.getAddress()],
      owner.address,
      deadline()
    );

    expect(await tokenA.balanceOf(owner.address)).to.equal(beforeA + expectedBtoA);
  });

  it('handles reversed token order and slippage protection', async function () {
    const { owner, factory, router, tokenA, tokenB } = await deployFixture();

    await addPairLiquidity(router, tokenA, tokenB, ethers.parseEther('100'), ethers.parseEther('200'), owner);

    await addPairLiquidity(router, tokenB, tokenA, ethers.parseEther('20'), ethers.parseEther('10'), owner);

    const pairAddress = await factory.getPair(await tokenA.getAddress(), await tokenB.getAddress());
    const pair = await ethers.getContractAt('AMMPair', pairAddress);
    const token0 = await pair.token0();
    const reserves = await pair.getReserves();

    const reserveA = (await tokenA.getAddress()) === token0 ? reserves[0] : reserves[1];
    const reserveB = (await tokenB.getAddress()) === token0 ? reserves[0] : reserves[1];

    expect(reserveA).to.equal(ethers.parseEther('110'));
    expect(reserveB).to.equal(ethers.parseEther('220'));

    await expect(
      router.swapExactTokensForTokens(
        ethers.parseEther('1'),
        ethers.parseEther('1000'),
        [await tokenA.getAddress(), await tokenB.getAddress()],
        owner.address,
        deadline()
      )
    ).to.be.revertedWith('INSUFFICIENT_OUTPUT_AMOUNT');
  });

  it('rejects expired transactions', async function () {
    const { owner, router, tokenA, tokenB } = await deployFixture();

    await expect(
      router.addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        ethers.parseEther('10'),
        ethers.parseEther('10'),
        0,
        0,
        owner.address,
        Math.floor(Date.now() / 1000) - 1
      )
    ).to.be.revertedWith('EXPIRED');
  });

  it('removes liquidity in requested token order with minimums', async function () {
    const { owner, factory, router, tokenA, tokenB } = await deployFixture();

    await addPairLiquidity(router, tokenA, tokenB, ethers.parseEther('100'), ethers.parseEther('100'), owner);

    const pairAddress = await factory.getPair(await tokenA.getAddress(), await tokenB.getAddress());
    const pair = await ethers.getContractAt('AMMPair', pairAddress);
    const liquidity = await pair.balanceOf(owner.address);

    const [amountB, amountA] = await router.removeLiquidity(
      await tokenB.getAddress(),
      await tokenA.getAddress(),
      liquidity,
      1,
      1,
      owner.address,
      deadline()
    );

    expect(amountB).to.be.gt(0n);
    expect(amountA).to.be.gt(0n);
  });

  it('supports multi-hop swaps', async function () {
    const { owner, router, tokenA, tokenB, tokenC } = await deployFixture();

    await addPairLiquidity(router, tokenA, tokenB, ethers.parseEther('100'), ethers.parseEther('100'), owner);
    await addPairLiquidity(router, tokenB, tokenC, ethers.parseEther('100'), ethers.parseEther('100'), owner);

    const amounts = await router.getAmountsOut(
      ethers.parseEther('10'),
      [await tokenA.getAddress(), await tokenB.getAddress(), await tokenC.getAddress()]
    );

    const beforeC = await tokenC.balanceOf(owner.address);

    await router.swapExactTokensForTokens(
      ethers.parseEther('10'),
      amounts[2],
      [await tokenA.getAddress(), await tokenB.getAddress(), await tokenC.getAddress()],
      owner.address,
      deadline()
    );

    expect(await tokenC.balanceOf(owner.address)).to.equal(beforeC + amounts[2]);
  });

  it('supports native BNB liquidity and BNB swaps', async function () {
    const { owner, router, wbnb, tokenA } = await deployFixture();

    await router.addLiquidityETH(
      await tokenA.getAddress(),
      ethers.parseEther('10'),
      0,
      0,
      owner.address,
      deadline(),
      { value: ethers.parseEther('10') }
    );

    const path = [await wbnb.getAddress(), await tokenA.getAddress()];
    const amounts = await router.getAmountsOut(ethers.parseEther('1'), path);
    const beforeA = await tokenA.balanceOf(owner.address);

    await router.swapExactETHForTokens(
      amounts[1],
      path,
      owner.address,
      deadline(),
      { value: ethers.parseEther('1') }
    );

    expect(await tokenA.balanceOf(owner.address)).to.equal(beforeA + amounts[1]);
  });

  it('rejects invalid factory token addresses', async function () {
    const { factory, owner } = await deployFixture();

    await expect(
      factory.createPair(owner.address, owner.address)
    ).to.be.revertedWith('IDENTICAL_ADDRESSES');

    await expect(
      factory.createPair(ethers.ZeroAddress, owner.address)
    ).to.be.revertedWith('ZERO_ADDRESS');
  });
});
