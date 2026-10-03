const { ethers } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();

  const factory = await ethers.deployContract('AMMFactory');
  await factory.waitForDeployment();

  const router = await ethers.deployContract('AMMRouter', [await factory.getAddress()]);
  await router.waitForDeployment();

  const wbnb = await ethers.deployContract('WBNB');
  await wbnb.waitForDeployment();

  const tokenA = await ethers.deployContract('Token', ['Token A', 'TKA', ethers.parseEther('1000000')]);
  await tokenA.waitForDeployment();

  const tokenB = await ethers.deployContract('Token', ['Token B', 'TKB', ethers.parseEther('1000000')]);
  await tokenB.waitForDeployment();

  console.log('Deployer:', deployer.address);
  console.log('Factory:', await factory.getAddress());
  console.log('Router:', await router.getAddress());
  console.log('WBNB:', await wbnb.getAddress());
  console.log('TokenA:', await tokenA.getAddress());
  console.log('TokenB:', await tokenB.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
