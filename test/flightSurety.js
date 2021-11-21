
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
let Web3 = require('web3');

contract('Flight Surety Tests', async (accounts) => {

  var config;
    beforeEach('should setup the contract instance', async () => {
        config = await Test.Config(accounts);
        web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        web3.eth.defaultAccount = web3.eth.accounts[0];
    });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try 
      {
          await config.flightSurety.setTestingMode(true);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    
    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
    }
    catch(e) {
    }
    let isRegistered = await config.flightSuretyData.isRegistered.call(newAirline);
    let isFunded = await config.flightSuretyData.isFunded.call(config.firstAirline);
    // ASSERT
    assert.equal(isRegistered, false, "Airline should not be registered.");
    assert.equal(isFunded, false, "Airline should not be able to register another airline if it hasn't provided funding");
  });

    it('Fund airline', async () => {
        // ARRANGE
        let airline = config.firstAirline;
        let amount = web3.utils.toWei('10', 'ether');
        let isRegistered = await config.flightSuretyData.isRegistered.call(airline);

        //assure account is valid for being funded
        let isFundedPre = await config.flightSuretyData.isFunded.call(airline);
        assert.equal(isRegistered, true, "Airline should be registered.");
        assert.equal(isFundedPre, false, "Airline should not be funded");
        await config.flightSuretyData.fundAirline(airline, {from: accounts[5], value: amount});
        let isFundedPost = await config.flightSuretyData.isFunded.call(airline);
        assert.equal(isFundedPost, true, "Airline should be funded");
    });
});
