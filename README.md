# FlightSurety

FlightSurety is a sample application project for Udacity's Blockchain course.

## Install

This repository contains Smart Contract code in Solidity (using Truffle), tests (also using Truffle), dApp scaffolding (using HTML, CSS and JS) and server app scaffolding.

To install, download or clone the repo, then:

- `npm install`
- `truffle compile`

## Develop Client

To start the testnet and deploy the contracts
- `ganache-cli -p 8545 --mnemonic "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat" --defaultBalanceEther 10000000 --accounts=100`
- `truffle migrate --reset`


To run truffle tests:
- Start the testnet and deploy the contracts (see above)
- `truffle test`

To use the dapp:
- Start the testnet and deploy the contracts (see above)
- `npm run server` (required to ramp up contract and use oracles)
- `npm run dapp`

To view dapp:

`http://localhost:8000`

## Develop Server
- Start the testnet (see above)
- Deploy contracts
`npm run server`
`truffle test ./test/oracles.js`

## Deploy

To build dapp for prod:
`npm run dapp:prod`

Deploy the contents of the ./dapp folder


## Resources

* [How does Ethereum work anyway?](https://medium.com/@preethikasireddy/how-does-ethereum-work-anyway-22d1df506369)
* [BIP39 Mnemonic Generator](https://iancoleman.io/bip39/)
* [Truffle Framework](http://truffleframework.com/)
* [Ganache Local Blockchain](http://truffleframework.com/ganache/)
* [Remix Solidity IDE](https://remix.ethereum.org/)
* [Solidity Language Reference](http://solidity.readthedocs.io/en/v0.4.24/)
* [Ethereum Blockchain Explorer](https://etherscan.io/)
* [Web3Js Reference](https://github.com/ethereum/wiki/wiki/JavaScript-API)