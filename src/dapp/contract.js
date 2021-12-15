import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
const http = require('http');

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {
           
            this.owner = accts[0];

            let counter = 1;
            while(this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }
            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }
            callback();
        });
    }

    fetchAirlines(callback) {
        let self = this;
        self.flightSuretyApp.methods
            .getAllFundedAirlines()
            .call({ from: self.owner}, callback);
    }

    fetchFlights(airline, callback) {
        http.get('http://localhost:3000/flights?airline=' + airline, (resp) => {
            let data = "";
            resp.on('data', (chunk) => {
                data += chunk;
            });
            resp.on('end', function () {
                callback(JSON.parse(data));
            });
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    fetchFlightStatus(flight, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .fetchFlightStatus(flight.airline, flight.flightNo, flight.time)
            .send({ from: self.owner}, (error, result) => {
                callback(error, flight);
            });
    }

    listenForStatusUpdates(callback) {
        let self = this;
        self.flightSuretyApp.events.FlightStatusInfo({}, async (error, event)  => {
            if (!error) {
                callback(event);
            }
        });
    }

    updateBalance(account, callback) {
        let self = this;
        self.web3.eth.getBalance(account).then(balance => { callback(self.web3.utils.fromWei(balance + "", 'ether')) });
    }

    async purchaseInsurance(account, flight, callback) {
        let self = this;
        let amount = await self.flightSuretyApp.methods.INSURANCE_FEE().call();
        await self.flightSuretyApp.methods.buy(flight.airline, flight.flightNo, flight.time).send({from: account, value: amount + "", gas: 4999999});
        let success = await self.flightSuretyApp.methods.isAlreadyInsured(account, flight.airline, flight.flightNo, flight.time).call();
        callback(success);
    }

    async claim(account, callback) {
        let self = this;
        try {
            await self.flightSuretyApp.methods.claim().send({ from: account, gas: 4999999 });
            callback(true);
        } catch (e) {
            callback(false);
        }
    }

    fetchAccounts(callback) {
        let self = this;
        self.web3.eth.getAccounts().then(callback);
    }
}