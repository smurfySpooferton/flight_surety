pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    event DidRegisterAirline(address airline);
    event DidFundAirline(address airline);
    event DidRegisterFlight(address airline, string flightNo, uint256 time);
    event DidRegisterInsurance(address insuree, bytes32 key);

    address private contractOwner;                                      // Account used to deploy contract
    address private trustedCaller;
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false

    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;
        address airline;
    }

    // Airlines
    struct Airline {
        bool isRegistered;
        bool isFunded;
        uint256 funds;
    }

    struct Insurance {
        bool isRegistered;
        bool isPayedOut;
    }

    uint256 private registeredAirlineCount = 0;
    uint256 private fundedAirlineCount = 0;

    mapping(address => Airline) private allAirlines;
    mapping(bytes32 => Flight) private flights;
    mapping(bytes32 => mapping(address => Insurance)) private insurances;

    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor(address _firstAirline) public payable {
        contractOwner = msg.sender;
        allAirlines[_firstAirline] = Airline(true, false, 0);
        registeredAirlineCount = 1;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireIsRegistered(address needle) {
        require(isRegistered(needle), "Airline not registered");
        _;
    }

    modifier requireIsFunded(address needle) {
        require(isFunded(needle), "Airline not funded");
        _;
    }

    modifier requireCalledFromAppContract() {
        require(msg.sender == trustedCaller, "Not called from trusted App");
        _;
    }

/********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */
    function isOperational() public view returns(bool) {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */
    function setOperatingStatus(bool mode) external requireContractOwner {
        operational = mode;
    }

    function setTrustedCaller(address _trustedCaller) external requireContractOwner {
        trustedCaller = _trustedCaller;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
    * @dev Return registeredAirlineCount
    *
    */
    function getRegisteredAirlineCount() external view requireIsOperational returns(uint256) {
        return registeredAirlineCount;
    }

    /**
    * @dev Return fundedCount
    *
    */
    function getFundedAirlineCount() external view requireIsOperational returns(uint256) {
        return fundedAirlineCount;
    }


    /**
    * @dev Return is airlined funded
    *
    */
    function isFunded(address needle) public view requireIsOperational returns(bool) {
        return allAirlines[needle].isFunded;
    }

    /**
    * @dev Return is airline registered
    *
    */
    function isRegistered(address needle) public view requireIsOperational returns(bool) {
        return allAirlines[needle].isRegistered;
    }

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */
    function registerAirline(address applicant) external requireIsOperational requireCalledFromAppContract {
        registeredAirlineCount = registeredAirlineCount.add(1);
        allAirlines[applicant].isRegistered = true;
        emit DidRegisterAirline(applicant);
    }

    /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */
    function fundAirline(address airline, uint256 funds) external requireIsOperational requireCalledFromAppContract {
        allAirlines[airline].isFunded = true;
        allAirlines[airline].funds = allAirlines[airline].funds.add(funds);
        fundedAirlineCount = fundedAirlineCount.add(1);
        emit DidFundAirline(airline);
    }

    function registerFlight(uint256 time, string flightNo, address airline, uint8 status) external requireIsOperational requireCalledFromAppContract requireIsRegistered(airline) requireIsFunded(airline) {
        bytes32 key = getFlightKey(airline, flightNo, time);
        flights[key] = Flight(true, status, time, airline);
        emit DidRegisterFlight(airline, flightNo, time);
    }

    function getFlightStatus(address airline, string flightNo, uint256 time) external returns (uint8) {
        bytes32 key = getFlightKey(airline, flightNo, time);
        require(flights[key].isRegistered, "Flight not registered");
        return flights[key].statusCode;
    }

    /**
     * @dev Buy insurance for a flight
     *
     */

    function buy(address insuree, bytes32 key) external requireIsOperational requireCalledFromAppContract {
        require(!insurances[key][insuree].isRegistered, "Insurance already purchased");
        insurances[key][insuree] = Insurance(true, false);
        emit DidRegisterInsurance(insuree, key);
    }

    function isAlreadyInsured(address insuree, bytes32 key) requireIsOperational requireCalledFromAppContract external view returns(bool) {
        return insurances[key][insuree].isRegistered;
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function claim(bytes32 key, uint256 amount) requireIsOperational requireCalledFromAppContract external {

    }

    function getFlightKey(address airline, string memory flight, uint256 timestamp) pure internal returns(bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() external payable {
    }
}

