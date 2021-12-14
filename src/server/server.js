import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';
require('babel-polyfill');

const GAS = 4999999;
const ORACLE_COUNT = 20;

let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
let flightSuretyData = new web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
let accounts = [];
let oracleRegistrationFee = 0;
let airlineRegistrationFee = 0;
let oracles = [];
let registrations = [];
let isOperating = false;
let airlines = [];
let firstAirline;
let flights = [];

async function setup() {
    try {
        accounts = await web3.eth.getAccounts();
        web3.eth.defaultAccount = accounts[0];
        firstAirline = accounts[1];
        await flightSuretyData.methods.setTrustedCaller(config.appAddress).send({ from: accounts[0], gas: GAS });
        oracleRegistrationFee = await flightSuretyApp.methods.REGISTRATION_FEE().call();
        airlineRegistrationFee = await flightSuretyApp.methods.AIRLINE_FEE_IN_ETH().call();
        isOperating = await flightSuretyApp.methods.isOperational().call();
        await rampUp();
    } catch (e){
        console.log(e);
    }
}

async function toggleOperational(isOperational) {
    flightSuretyData.methods.setOperatingStatus(isOperational).send({from: accounts[0], gas: GAS});
}

async function fundAirlineZero() {
    if (airlines[0] === firstAirline) {
        return;
    }
    let isFunded =  await flightSuretyData.methods.isFunded(firstAirline).call();
    if (!isFunded) {
        try {
            await fundAirline(firstAirline);
        } catch (e) {
            console.log(e);
        }
    } else {
        airlines.push(firstAirline);
    }
}

async function rampUp() {
    await fundAirlineZero();
    let airlineCandidates = accounts.slice(40, 44);
    for (let i = 0; i < airlineCandidates.length; i++) {
        let airline = airlineCandidates[i];
        let isRegistered = await flightSuretyData.methods.isRegistered(airline).call();
        if (!isRegistered) {
            await flightSuretyApp.methods.registerAirline(airline).send({ from: firstAirline, gas: GAS });
        }
        isRegistered = await flightSuretyData.methods.isRegistered(airline).call();
        if (!isRegistered) {
            await performConsensus(airline);
        }
        isRegistered = await flightSuretyData.methods.isRegistered(airline).call();
        if (!isRegistered) {
            continue;
        }
        let isFunded = await flightSuretyData.methods.isFunded(airline).call();
        if (!isFunded) {
            await fundAirline(airline);
            isFunded = await flightSuretyData.methods.isFunded(airline).call();
        } else {
            airlines.push(airline);
        }
    }
    await registerFlights();
}

async function performConsensus(candidate) {
    for (let i = 1; i < airlines.length; i++) { // first airline is proposer
        try {
            let isRegistered = await flightSuretyData.methods.isRegistered(candidate).call();
            if (isRegistered) {
                return;
            } else {
                await flightSuretyApp.methods.vote(candidate).send({ from: airlines[i], gas: GAS });
            }
        } catch (e) {
            continue;
        }
    }
}

async function fundAirline(airline) {
    try {
        await flightSuretyApp.methods.fundAirline(airline).send({ from: airline, value: airlineRegistrationFee, gas: GAS });
    } catch (e) {
    }
    let isFunded = await flightSuretyData.methods.isFunded(airline).call();
    if (isFunded) {
        airlines.push(airline);
    }
}

async function registerFlights() {
    let time = Math.floor(Date.parse('14 Dec 2021 00:00:00 GMT') / 1000);
    let flightsPerAirline = 10;
    for (let i = 0; i< airlines.length; i++) {
        for (let j = 0; j < flightsPerAirline; j++) {
            let flightNo = "ETH1" + i + "0" + j;
            try {
                await flightSuretyApp.methods.registerFlight(time, flightNo).send({ from: airlines[i], gas: GAS });
            } catch (e) {
            }
            flights.push({ flightNo: flightNo, time: time, airline: airlines[i] });
            time += 3600;
        }
    }
}

 async function registerOracles() {
    await setup();
    for (let i = 0; i < ORACLE_COUNT; i++) {
        try {
            let result = await flightSuretyApp.methods.registerOracle().send({ from: accounts[i], value: oracleRegistrationFee, gas: GAS });
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
                ).send({from: oracles[i], gas: GAS});
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
    });
});

app.get('/accounts', (req, res) => {
    res.send({
        message: accounts
    });
});

app.get('/oracles', (req, res) => {
    res.send({
        message: oracles
    });
});

app.get('/oraclefee', (req, res) => {
    res.send({
        message: {
            registrationFee: {
                ether: web3.utils.fromWei('' + oracleRegistrationFee, 'ether'),
                wei: oracleRegistrationFee + ""
            }
        }
    });
});

app.get('/airlinefee', (req, res) => {
    res.send({
        message: {
            registrationFee: {
                ether: web3.utils.fromWei('' + airlineRegistrationFee, 'ether'),
                wei: airlineRegistrationFee + ""
            }
        }
    });
});

app.get('/registrations', (req, res) => {
    res.send({
        message: registrations
    });
});

app.get('/operational', (req, res) => {
    res.send({
        message: { isOperating: isOperating }
    });
});

app.get('/airlines', (req, res) => {
    res.send({
        message: airlines
    });
});

app.get('/flights', (req, res) => {
    res.send({
        message: flights
    });
});

const statusBase = 10;
const statusMaxMultiply = 5;

function getRandomStatus() {
    return Math.floor(Math.random() * statusMaxMultiply) * statusBase;
}

export default app;


