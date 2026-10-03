const { ethers } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log('Deploying contracts with account:', deployer.address);

  const factory = await ethers.deployContract('AMMFactory');
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log('AMMFactory deployed to:', factoryAddress);

  const router = await ethers.deployContract('AMMRouter', [factoryAddress]);
  await router.waitForDeployment();
  console.log('AMMRouter deployed to:', await router.getAddress());

  const wbnb = await ethers.deployContract('WBNB');
  await wbnb.waitForDeployment();
  console.log('WBNB deployed to:', await wbnb.getAddress());

  const tokenA = await ethers.deployContract('Token', ['Binora Token', 'BNT', ethers.parseEther('1000000')]);
  await tokenA.waitForDeployment();
  console.log('TokenA deployed to:', await tokenA.getAddress());

  const tokenB = await ethers.deployContract('Token', ['Rocket Token', 'RKT', ethers.parseEther('1000000')]);
  await tokenB.waitForDeployment();
  console.log('TokenB deployed to:', await tokenB.getAddress());

  console.log('---');
  console.log('Factory:', factoryAddress);
  console.log('Router:', await router.getAddress());
  console.log('WBNB:', await wbnb.getAddress());
  console.log('BNT:', await tokenA.getAddress());
  console.log('RKT:', await tokenB.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
