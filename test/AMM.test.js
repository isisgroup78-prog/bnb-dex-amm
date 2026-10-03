const { expect } = require('chai');

describe('Binora Swap AMM flow', function () {
  it('creates a pool, mints LP tokens, and allows a basic swap flow', async function () {
    const [owner] = await ethers.getSigners();

    const factory = await ethers.deployContract('AMMFactory');
    const router = await ethers.deployContract('AMMRouter', [await factory.getAddress()]);

    const tokenA = await ethers.deployContract('Token', ['Token A', 'TKA', ethers.parseEther('1000000')]);
    const tokenB = await ethers.deployContract('Token', ['Token B', 'TKB', ethers.parseEther('1000000')]);

    await tokenA.approve(await router.getAddress(), ethers.parseEther('10000'));
    await tokenB.approve(await router.getAddress(), ethers.parseEther('10000'));

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
    const lpBalance = await pair.balanceOf(owner.address);
    expect(lpBalance).to.be.gt(0n);

    const output = await router.getAmountOut(
      ethers.parseEther('10'),
      ethers.parseEther('100'),
      ethers.parseEther('100')
    );
    expect(output).to.be.gt(0n);

    await router.swapExactTokensForTokens(
      ethers.parseEther('10'),
      0,
      await tokenA.getAddress(),
      await tokenB.getAddress(),
      owner.address
    );

    const finalBalance = await tokenB.balanceOf(owner.address);
    expect(finalBalance).to.be.gt(0n);
  });
});
