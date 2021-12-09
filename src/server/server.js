import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';
require('babel-polyfill');

const GAS = 500000;
const ORACLE_COUNT = 20;

let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
let accounts = [];
let registrationFee = 0;
let oracles = [];
let registrations = [];

async function setup() {
    accounts = await web3.eth.getAccounts();
    web3.eth.defaultAccount = accounts[0];
}

 async function registerOracles() {
    await setup();
    for (let i = 0; i < ORACLE_COUNT; i++) {
        try {
            registrationFee = await flightSuretyApp.methods.REGISTRATION_FEE().call();
            let result = await flightSuretyApp.methods.registerOracle().send({ from: accounts[i], value: registrationFee, gas: GAS });
            oracles.push(accounts[i]);
            registrations.push(result);
        } catch (e) {
            console.log(e);
        }
    }
}

async function submitOracleResponse(airline, flight, time) {
    for (let i = 0; i < oracles.length; i++) {
        let indexes = await flightSuretyApp.methods.getMyIndexes().call({ from: oracles[i] });
        let status = getRandomStatus();
        for (let j = 0; j < indexes.length; j++) {
            try {
                await flightSuretyApp.methods.submitOracleResponse(
                    indexes[j], airline, flight, time, status
                ).send({from: oracles[i], gas: 999999999});
            } catch(e) {
                console.log(e);
            }
        }
    }
}

function listenOracleRequests() {
    flightSuretyApp.events.OracleRequest({}, async (error, event)  => {
        console.log("Event received");
        console.log(error);
        console.log(event.returnValues);
        if (!error) {
            await submitOracleResponse(event.returnValues[1], event.returnValues[2], event.returnValues[3])
        }
    });
}

registerOracles();
listenOracleRequests();

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: getRandomStatus()
    })
});

app.get('/accounts', (req, res) => {
    res.send({
        message: accounts
    })
});

app.get('/oracles', (req, res) => {
    res.send({
        message: oracles
    })
});

app.get('/fee', (req, res) => {
    res.send({
        message: {registrationFee: registrationFee}
    })
});

app.get('/registrations', (req, res) => {
    res.send({
        message: registrations
    })
});

const statusBase = 10;
const statusMaxMultiply = 5;

function getRandomStatus() {
    return Math.floor(Math.random() * statusMaxMultiply) * statusBase;
}

export default app;


