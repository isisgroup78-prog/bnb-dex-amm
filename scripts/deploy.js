const fs = require('fs');
const path = require('path');
const { ethers, network } = require('hardhat');

async function deployContract(name, args = []) {
  const contract = await ethers.deployContract(name, args);
  await contract.waitForDeployment();
  return contract;
}

async function main() {
  if (network.name !== 'bnbTestnet') {
    console.warn('WARNING: this script is intended for BNB Testnet. Current network:', network.name);
  }

  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error('No deployer configured. Set PRIVATE_KEY in the environment.');

  console.log('KINGLOZO DEX v1 deployment');
  console.log('Network:', network.name);
  console.log('Deployer:', deployer.address);

  const factory = await deployContract('AMMFactory');
  const factoryAddress = await factory.getAddress();

  const wbnb = await deployContract('WBNB');
  const wbnbAddress = await wbnb.getAddress();

  const router = await deployContract('AMMRouter', [factoryAddress, wbnbAddress]);
  const routerAddress = await router.getAddress();

  const tokenA = await deployContract('Token', [
    'KINGLOZO Token',
    'KLOZO',
    ethers.parseEther('1000000')
  ]);
  const tokenAAddress = await tokenA.getAddress();

  const tokenB = await deployContract('Rocket Token', [
    'Rocket Token',
    'RKT',
    ethers.parseEther('1000000')
  ]);
  const tokenBAddress = await tokenB.getAddress();

  const deployment = {
    project: 'KINGLOZO DEX v1',
    network: network.name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployer: deployer.address,
    contracts: {
      factory: factoryAddress,
      router: routerAddress,
      wbnb: wbnbAddress,
      klozo: tokenAAddress,
      rkt: tokenBAddress
    },
    deployedAt: new Date().toISOString()
  };

  const outputDir = path.join(__dirname, '..', 'deployments');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, `${network.name}.json`),
    JSON.stringify(deployment, null, 2) + '\n'
  );

  console.log(JSON.stringify(deployment, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
