const { expect } = require('chai');

describe('AMM tests', function () {
  it('adds liquidity and performs a swap', async function () {
    const [owner] = await ethers.getSigners();

    const factory = await ethers.deployContract('AMMFactory');
    const router = await ethers.deployContract('AMMRouter', [await factory.getAddress()]);

    const tokenA = await ethers.deployContract('Token', ['Token A', 'TKA', ethers.parseEther('1000000')]);
    const tokenB = await ethers.deployContract('Token', ['Token B', 'TKB', ethers.parseEther('1000000')]);

    await tokenA.approve(await router.getAddress(), ethers.parseEther('10000'));
    await tokenB.approve(await router.getAddress(), ethers.parseEther('10000'));

    const tx = await router.addLiquidity(
      await tokenA.getAddress(),
      await tokenB.getAddress(),
      ethers.parseEther('100'),
      ethers.parseEther('100'),
      0,
      0,
      owner.address
    );
    await tx.wait();

    const pairAddress = await factory.getPair(await tokenA.getAddress(), await tokenB.getAddress());
    const pair = await ethers.getContractAt('AMMPair', pairAddress);

    const lpBalance = await pair.balanceOf(owner.address);
    expect(lpBalance).to.be.gt(0n);

    const amountOut = await router.getAmountOut(ethers.parseEther('10'), ethers.parseEther('100'), ethers.parseEther('100'));
    expect(amountOut).to.be.gt(0n);

    await tokenA.approve(await router.getAddress(), ethers.parseEther('1000'));
    await router.swapExactTokensForTokens(
      ethers.parseEther('10'),
      0,
      await tokenA.getAddress(),
      await tokenB.getAddress(),
      owner.address
    );

    const balanceB = await tokenB.balanceOf(owner.address);
    expect(balanceB).to.be.gt(0n);
  });
});
