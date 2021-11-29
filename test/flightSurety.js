
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
let Web3 = require('web3');

contract('Flight Surety Tests', async (accounts) => {

  var config;
    beforeEach('should setup the contract instance', async () => {
        config = await Test.Config(accounts);
        web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        web3.eth.defaultAccount = web3.eth.accounts[0];
        await config.flightSuretyData.setTrustedCaller(config.flightSuretyApp.address, { from: accounts[0] });
    });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

    it(`contract interaction works`, async function () {

        // Get operating status
        let status = false;
        try {
            status = await config.flightSuretyApp.isOperational.call();
        } catch (e) {
            console.log(e);
        }
        assert.equal(status, true, "Incorrect initial operating status value");

    });

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
        await config.flightSuretyApp.fundAirline(airline, {from: accounts[5], value: amount});
        let isFundedPost = await config.flightSuretyData.isFunded.call(airline);
        assert.equal(isFundedPost, true, "Airline should be funded");

    });

    it('Register airline', async () => {
        // ARRANGE
        let airline = config.firstAirline;
        let amount = web3.utils.toWei('10', 'ether');
        let isRegistered = await config.flightSuretyData.isRegistered.call(airline);

        //assure account is valid for being funded
        let isFundedPre = await config.flightSuretyData.isFunded.call(airline);
        assert.equal(isRegistered, true, "Airline should be registered.");
        assert.equal(isFundedPre, false, "Airline should not be funded");
        await config.flightSuretyApp.fundAirline(airline, {from: accounts[5], value: amount});
        let isFundedPost = await config.flightSuretyData.isFunded.call(airline);
        assert.equal(isFundedPost, true, "Airline should be funded");
        let newAirline = accounts[9];
        await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
        let isRegisteredNewAirline = await config.flightSuretyData.isRegistered.call(newAirline);
        assert.equal(isRegisteredNewAirline, true, "New airline should be registered");
    });

    it('Register airlines and perform consensus', async () => {
        let testAddresses = config.testAddresses;
        let amount = web3.utils.toWei('10', 'ether');
        let consensusPerformed = false;
        let register1 = false;
        let register2 = false;
        let register3 = true; // we expect false
        try {
            await config.flightSuretyApp.fundAirline(config.firstAirline, {from: accounts[9], value: amount});
            let isFundedFirst = await config.flightSuretyData.isFunded.call(config.firstAirline);
            assert.equal(isFundedFirst, true, "Airline should be funded");
            await config.flightSuretyApp.registerAirline(accounts[9], {from: config.firstAirline});
            await config.flightSuretyApp.registerAirline(accounts[8], {from: config.firstAirline});
            await config.flightSuretyApp.registerAirline(testAddresses[0], {from: config.firstAirline});
            register1 = await config.flightSuretyData.isRegistered(accounts[9]);
            register2 = await config.flightSuretyData.isRegistered(accounts[8]);
            register3 = await config.flightSuretyData.isRegistered(testAddresses[2]);
            await config.flightSuretyApp.fundAirline(accounts[9], {from: accounts[9], value: amount});
            await config.flightSuretyApp.fundAirline(accounts[8], {from: accounts[9], value: amount});
            await config.flightSuretyApp.vote(testAddresses[0], {from: accounts[9]});
            consensusPerformed = await config.flightSuretyData.isRegistered(testAddresses[0]);
        } catch (e) {
            console.log(e);
        }
        assert.equal(register1, true, "Airline should be registered");
        assert.equal(register2, true, "Airline should be registered");
        assert.equal(register3, false, "Airline should not be registered");
        assert.equal(consensusPerformed, true, "Airline should be registered now");
    });
});
