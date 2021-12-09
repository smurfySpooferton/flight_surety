pragma solidity ^0.4.25;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)
    using SafeMath for uint8;
    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    uint256 private constant AIRLINE_NO_CONSENT_THRESHOLD = 4; // 5th airline will need consensus
    uint256 private constant AIRLINE_FEE_IN_ETH = 10 ether;
    uint256 private constant INSURANCE_FEE = 1 ether;
    uint256 private constant INSURANCE_PAYOUT_MULTIPLY = 3;
    uint256 private constant INSURANCE_PAYOUT_DIVISOR = 2;

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    address private contractOwner;          // Account used to deploy contract

    struct Consensus {
        uint256 votes;
        mapping (address => bool) voters;
    }

    mapping(address => Consensus) private applications;

    uint256 private pendingApplicationsCount = 0;
    IFlightSuretyData private flightSuretyData;

    event DidRegisterOracle(address oracle, uint8[3] indexes);

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
         // Modify to call data contract's status
        require(isOperational(), "Contract is currently not operational");
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

    modifier requireIsFirstVoteOnApplicant(address needle) {
        require(!applications[needle].voters[msg.sender], "Multiple votes are not permitted");
        _;
    }

    modifier requireIsRegistered(address needle) {
        require(flightSuretyData.isRegistered(needle), "Airline not registered");
        _;
    }

    modifier requireNotRegistered(address needle) {
        require(!flightSuretyData.isRegistered(needle), "Airline is registered");
        _;
    }

    modifier requireIsFunded(address needle) {
        require(flightSuretyData.isFunded(needle), "Airline not funded");
        _;
    }

    modifier requireIsApplicant(address needle) {
        require(applications[needle].votes > 0, "Airline not an applicant");
        _;
    }

    modifier requireConsensusNeccessary() {
        require(flightSuretyData.getRegisteredAirlineCount() >= AIRLINE_NO_CONSENT_THRESHOLD, "Consensus not neccessary; Invalid state.");
        _;
    }

    modifier requireNotYetFunded(address needle) {
        require(!flightSuretyData.isFunded(needle), "Airline already funded");
        _;
    }

    modifier refund(uint256 price) {
        require(msg.value >= price, "Insufficient Funds.");
        _;
        uint256 rest = msg.value - price;
        msg.sender.transfer(rest);
    }

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
    * @dev Contract constructor
    *
    */
    constructor(address dataAddress) public payable {
        contractOwner = msg.sender;
        flightSuretyData = IFlightSuretyData(dataAddress);
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational() public view returns(bool) {
        return flightSuretyData.isOperational();  // Modify to call data contract's status
    }

    function isValidFlightStatus(uint8 status) private returns(bool) {
        return (status == STATUS_CODE_UNKNOWN || status == STATUS_CODE_ON_TIME || status == STATUS_CODE_LATE_OTHER || status == STATUS_CODE_LATE_AIRLINE || status == STATUS_CODE_LATE_WEATHER || status == STATUS_CODE_LATE_TECHNICAL);
    }

    function creditableStatus(uint8 status) private returns(bool) {
        return status == STATUS_CODE_LATE_AIRLINE;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    function fundAirline(address airline) requireIsOperational requireIsRegistered(airline) requireNotYetFunded(airline) refund(AIRLINE_FEE_IN_ETH) external payable {
        address(flightSuretyData).transfer(AIRLINE_FEE_IN_ETH);
        flightSuretyData.fundAirline(airline, AIRLINE_FEE_IN_ETH);
    }

   /**
    * @dev Add an airline to the registration queue
    *
    */   
    function registerAirline(address applicant) external requireIsOperational requireNotRegistered(applicant) requireIsFunded(msg.sender) requireIsRegistered(msg.sender) {
        if (flightSuretyData.getRegisteredAirlineCount() < AIRLINE_NO_CONSENT_THRESHOLD) {
            flightSuretyData.registerAirline(applicant);
        } else {
            proposeAirline(applicant);
        }
    }

    function proposeAirline(address applicant) private requireIsOperational requireNotRegistered(applicant) requireIsFunded(msg.sender) {
        uint256 votes = 1;
        applications[applicant] = Consensus(votes);
        applications[applicant].voters[msg.sender] = true;
        pendingApplicationsCount = pendingApplicationsCount.add(1);
    }

    function vote(address applicant) external requireIsOperational requireConsensusNeccessary requireIsApplicant(applicant) requireIsRegistered(msg.sender) requireIsFunded(msg.sender) requireIsFirstVoteOnApplicant(applicant) {
        applications[applicant].votes = applications[applicant].votes.add(1);
        applications[applicant].voters[msg.sender] = true;
        uint256 requiredVotes = (flightSuretyData.getFundedAirlineCount() / 2) + 1;
        if (applications[applicant].votes >= requiredVotes) {
            flightSuretyData.registerAirline(applicant);
        }
    }

   /**
    * @dev Register a future flight for insuring.
    *
    */  
    function registerFlight(uint256 time, string flightNo) external requireIsRegistered(msg.sender) requireIsFunded(msg.sender) {
        flightSuretyData.registerFlight(time, flightNo, msg.sender, STATUS_CODE_ON_TIME);
    }

    function getFlightStatus(address airline, string flightNo, uint256 time) external returns (uint8) {
        uint8 status = flightSuretyData.getFlightStatus(airline, flightNo, time);
        require(isValidFlightStatus(status), "Invalid flight status");
        return status;
    }

    function buy(address airline, string flight, uint256 time) requireIsOperational refund(INSURANCE_FEE) external payable {
        bytes32 key = getFlightKey(airline, flight, time);
        require(!flightSuretyData.isAlreadyInsured(msg.sender, key));
        address(flightSuretyData).transfer(INSURANCE_FEE);
        flightSuretyData.buy(msg.sender, key);
    }

    function claim() external {
        flightSuretyData.claim(msg.sender);
    }

    function isAlreadyInsured(address insuree, address airline, string flight, uint256 time) requireIsOperational external view returns(bool) {
        bytes32 key = getFlightKey(airline, flight, time);
        return flightSuretyData.isAlreadyInsured(insuree, key);
    }

    /**
     * @dev Called after oracle has updated flight status
    *
    */  
    function processFlightStatus(address airline, string memory flight, uint256 timestamp, uint8 statusCode) requireIsOperational private {
        require(isValidFlightStatus(statusCode), "Invalid flight status");
        flightSuretyData.updateFlightStatus(airline, flight, timestamp, statusCode);
        if (creditableStatus(statusCode)) {
            uint256 credit = (INSURANCE_FEE * INSURANCE_PAYOUT_MULTIPLY) / INSURANCE_PAYOUT_DIVISOR;
            flightSuretyData.credit(airline, flight, timestamp, credit);
        }
    }

    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus(address airline, string flight, uint256 timestamp) external {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        oracleResponses[key] = ResponseInfo({ requester: msg.sender, isOpen: true });

        emit OracleRequest(index, airline, flight, timestamp);
    }


// region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;    

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;


    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;        
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester;                              // Account that requested status
        bool isOpen;                                    // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses;          // Mapping key is the status code reported
                                                        // This lets us group responses and identify
                                                        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(address airline, string flight, uint256 timestamp, uint8 status);

    event OracleReport(address airline, string flight, uint256 timestamp, uint8 status);

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(uint8 index, address airline, string flight, uint256 timestamp);


    // Register an oracle with the contract
    function registerOracle() refund(REGISTRATION_FEE) external payable {
        // Require registration fee
        uint8[3] memory indexes = generateIndexes(msg.sender);
        Oracle memory oracle = Oracle(true, indexes);
        address(this).transfer(REGISTRATION_FEE);
        oracles[msg.sender] = oracle;
        emit DidRegisterOracle(msg.sender, indexes);
    }

    function getMyIndexes() view external returns(uint8[3]) {
        require(oracles[msg.sender].isRegistered, "Not registered as an oracle");
        return oracles[msg.sender].indexes;
    }

    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse(uint8 index, address airline, string flight, uint256 timestamp, uint8 statusCode) external {
        require((oracles[msg.sender].indexes[0] == index) || (oracles[msg.sender].indexes[1] == index) || (oracles[msg.sender].indexes[2] == index), "Index does not match oracle request");


        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp)); 
        require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request");

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) {

            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }

    function getFlightKey(address airline, string flight, uint256 timestamp) pure internal returns(bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes(address account) internal returns(uint8[3]) {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);
        indexes[1] = indexes[0];
        while(indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }
        indexes[2] = indexes[1];
        while((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }
        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex(address account) internal returns (uint8) {
        uint8 maxValue = 10;
        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(uint256(keccak256(abi.encodePacked(blockhash(block.number - nonce++), account))) % maxValue);
        if (nonce > 250) {
            nonce = 0;  // Can only fetch blockhashes for last 256 blocks so we adapt
        }
        return random;
    }

// endregion

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() external payable {
    }
}

interface IFlightSuretyData {
    function isOperational() public view returns(bool);
    function isFunded(address needle) public view returns(bool);
    function isRegistered(address needle) public view returns(bool);
    function getRegisteredAirlineCount() external view returns(uint256);
    function getFundedAirlineCount() external view returns(uint256);
    function registerAirline(address applicant) external;
    function fundAirline(address airline, uint256 funds) external;
    function registerFlight(uint256 time, string flightNo, address airline, uint8 status) external;
    function getFlightStatus(address airline, string flightNo, uint256 time) external returns (uint8);
    function buy(address insuree, bytes32 key) external;
    function isAlreadyInsured(address insuree, bytes32 key) external view returns(bool);
    function updateFlightStatus(address airline, string flightNo, uint256 time, uint8 statusCode) external;
    function credit(address airline, string flight, uint256 timestamp, uint256 credit) external;
    function claim(address insuree) external;
}
