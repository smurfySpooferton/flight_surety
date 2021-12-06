
var Test = require('../config/testConfig.js');
const Web3 = require("web3");
//var BigNumber = require('bignumber.js');

contract('Oracles', async (accounts) => {
  const TEST_ORACLES_COUNT = 20;

  const STATUS_CODE_UNKNOWN = 0;
  const STATUS_CODE_ON_TIME = 10;
  const STATUS_CODE_LATE_AIRLINE = 20;
  const STATUS_CODE_LATE_WEATHER = 30;
  const STATUS_CODE_LATE_TECHNICAL = 40;
  const STATUS_CODE_LATE_OTHER = 50;

  async function registerOracles() {
    // ARRANGE
    let fee = await config.flightSuretyApp.REGISTRATION_FEE();
    assert(fee, 1, "Oracle price not correct");
    // ACT
    for(let a = 1; a < TEST_ORACLES_COUNT; a++) {
      let result;
      await config.flightSuretyApp.registerOracle({from: accounts[a], value: fee});
      try {
        result = await config.flightSuretyApp.getMyIndexes({from: accounts[a]});
        console.log(`Oracle Registered: ${result[0]}, ${result[1]}, ${result[2]}`);
      } catch (e) {
        console.log(e);
      }
    }
  }

  async function prepareAirlinesAndFlights() {
    let airline = config.firstAirline;
    let amount = web3.utils.toWei('10', 'ether');
    await config.flightSuretyApp.fundAirline(airline, {from: accounts[0], value: amount});
    let time = Math.floor(Date.now() / 1000);
    let flightNo = "LX1051";
    await config.flightSuretyApp.registerFlight(time, flightNo, {from: airline});
  }

  var config;
  beforeEach('should setup the contract instance', async () => {
    config = await Test.Config(accounts);
    web3 = new Web3(new Web3.providers.HttpProvider(config.url));
    web3.eth.defaultAccount = web3.eth.accounts[0];
    await config.flightSuretyData.setTrustedCaller(config.flightSuretyApp.address, { from: accounts[0] });
  });
  return;
  it('can register oracles and request flight status', async () => {
    await registerOracles();
    await prepareAirlinesAndFlights();
    // ARRANGE
    let flight = 'ND1309'; // Course number
    let timestamp = Math.floor(Date.now() / 1000);

    // Submit a request for oracles to get status information for a flight
    await config.flightSuretyApp.fetchFlightStatus(config.firstAirline, flight, timestamp);
    // ACT

    // Since the Index assigned to each test account is opaque by design
    // loop through all the accounts and for each account, all its Indexes (indices?)
    // and submit a response. The contract will reject a submission if it was
    // not requested so while sub-optimal, it's a good test of that feature
    for(let a=1; a<TEST_ORACLES_COUNT; a++) {

      // Get oracle information
      let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({ from: accounts[a]});
      for(let idx=0;idx<3;idx++) {

        try {
          // Submit a response...it will only be accepted if there is an Index match
          await config.flightSuretyApp.submitOracleResponse(oracleIndexes[idx], config.firstAirline, flight, timestamp, STATUS_CODE_ON_TIME, { from: accounts[a] });

        }
        catch(e) {
          // Enable this when debugging
           console.log('\nError', idx, oracleIndexes[idx].toNumber(), flight, timestamp);
        }

      }
    }


  });


 
});
