const { expect } = require('chai');

describe('KINGLOZO AMM', function () {
  async function deployFixture() {
    const [owner] = await ethers.getSigners();

    const factory = await ethers.deployContract('AMMFactory');
    const router = await ethers.deployContract('AMMRouter', [await factory.getAddress()]);
    const tokenA = await ethers.deployContract('Token', ['Token A', 'TKA', ethers.parseEther('1000000')]);
    const tokenB = await ethers.deployContract('Token', ['Token B', 'TKB', ethers.parseEther('1000000')]);

    await tokenA.approve(await router.getAddress(), ethers.MaxUint256);
    await tokenB.approve(await router.getAddress(), ethers.MaxUint256);

    return { owner, factory, router, tokenA, tokenB };
  }

  it('creates a pool and mints LP tokens', async function () {
    const { owner, factory, router, tokenA, tokenB } = await deployFixture();

    await router.addLiquidity(
      await tokenA.getAddress(),
      await tokenB.getAddress(),
      ethers.parseEther('100'),
      ethers.parseEther('100'),
      0,
      0,
      owner.address
    );

    const pairAddress = await factory.getPair(await tokenA.getAddress(), await tokenB.getAddress());
    expect(pairAddress).to.not.equal(ethers.ZeroAddress);

    const pair = await ethers.getContractAt('AMMPair', pairAddress);
    expect(await pair.balanceOf(owner.address)).to.be.gt(0n);
  });

  it('swaps correctly in both token directions', async function () {
    const { owner, factory, router, tokenA, tokenB } = await deployFixture();

    await router.addLiquidity(
      await tokenA.getAddress(),
      await tokenB.getAddress(),
      ethers.parseEther('100'),
      ethers.parseEther('100'),
      0,
      0,
      owner.address
    );

    const pairAddress = await factory.getPair(await tokenA.getAddress(), await tokenB.getAddress());
    const pair = await ethers.getContractAt('AMMPair', pairAddress);

    const beforeB = await tokenB.balanceOf(owner.address);
    const expectedAtoB = await router.getAmountOut(ethers.parseEther('10'), ethers.parseEther('100'), ethers.parseEther('100'));

    await router.swapExactTokensForTokens(
      ethers.parseEther('10'),
      expectedAtoB,
      await tokenA.getAddress(),
      await tokenB.getAddress(),
      owner.address
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
      await tokenB.getAddress(),
      await tokenA.getAddress(),
      owner.address
    );

    expect(await tokenA.balanceOf(owner.address)).to.equal(beforeA + expectedBtoA);
  });

  it('handles liquidity added with reversed token order', async function () {
    const { owner, factory, router, tokenA, tokenB } = await deployFixture();

    await router.addLiquidity(
      await tokenA.getAddress(),
      await tokenB.getAddress(),
      ethers.parseEther('100'),
      ethers.parseEther('200'),
      0,
      0,
      owner.address
    );

    const pairAddress = await factory.getPair(await tokenA.getAddress(), await tokenB.getAddress());
    const pair = await ethers.getContractAt('AMMPair', pairAddress);
    const token0 = await pair.token0();
    const reserves = await pair.getReserves();

    const reserveA = (await tokenA.getAddress()) === token0 ? reserves[0] : reserves[1];
    const reserveB = (await tokenB.getAddress()) === token0 ? reserves[0] : reserves[1];

    expect(reserveA).to.equal(ethers.parseEther('100'));
    expect(reserveB).to.equal(ethers.parseEther('200'));

    await router.addLiquidity(
      await tokenB.getAddress(),
      await tokenA.getAddress(),
      ethers.parseEther('20'),
      ethers.parseEther('10'),
      0,
      0,
      owner.address
    );

    const reservesAfter = await pair.getReserves();
    const reserveAAfter = (await tokenA.getAddress()) === token0 ? reservesAfter[0] : reservesAfter[1];
    const reserveBAfter = (await tokenB.getAddress()) === token0 ? reservesAfter[0] : reservesAfter[1];

    expect(reserveAAfter).to.equal(ethers.parseEther('110'));
    expect(reserveBAfter).to.equal(ethers.parseEther('220'));
  });

  it('returns liquidity amounts in the requested token order', async function () {
    const { owner, factory, router, tokenA, tokenB } = await deployFixture();

    await router.addLiquidity(
      await tokenA.getAddress(),
      await tokenB.getAddress(),
      ethers.parseEther('100'),
      ethers.parseEther('100'),
      0,
      0,
      owner.address
    );

    const pairAddress = await factory.getPair(await tokenA.getAddress(), await tokenB.getAddress());
    const pair = await ethers.getContractAt('AMMPair', pairAddress);
    const liquidity = await pair.balanceOf(owner.address);

    const [amountA, amountB] = await router.removeLiquidity(
      await tokenB.getAddress(),
      await tokenA.getAddress(),
      liquidity,
      owner.address
    );

    expect(amountA).to.be.gt(0n);
    expect(amountB).to.be.gt(0n);
  });
});
