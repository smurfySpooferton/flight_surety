pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    event DidRegisterAirline(address airline);

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    // Airlines
    struct Airline {
        bool isRegistered;
        bool isFunded;
        uint256 funds;
    }

    uint256 private registeredAirlineCount = 0;
    uint256 private fundedAirlineCount = 0;

    mapping(address => Airline) private allAirlines;

    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor(address _firstAirline) public payable {
        contractOwner = msg.sender;
        allAirlines[_firstAirline] = Airline(false, false, 0);
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
        require(allAirlines[needle].isRegistered, "Airline not registered");
        _;
    }

    modifier requireIsFunded(address needle) {
        require(allAirlines[needle].isFunded, "Airline not funded");
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
    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            ) 
                            external
                            requireContractOwner 
    {
        operational = mode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
    * @dev Return registeredAirlineCount
    *
    */
    function getRegisteredAirlineCount() external view requireIsOperational returns(uint) {
        return registeredAirlineCount;
    }

    /**
    * @dev Return fundedCount
    *
    */
    function getFundedAirlineCount() external view requireIsOperational returns(uint) {
        return fundedAirlineCount;
    }


    /**
    * @dev Return is airlined funded
    *
    */
    function isFunded(address needle) public view requireIsOperational requireIsFunded(needle) returns(bool) {
        return true;
    }

    /**
    * @dev Return is airline registered
    *
    */
    function isRegistered(address needle) public view requireIsOperational requireIsRegistered(needle) returns(bool) {
        return true;
    }

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */
    function registerAirline(address applicant) external requireIsOperational requireIsRegistered(msg.sender) requireIsFunded(msg.sender) {
        registeredAirlineCount = registeredAirlineCount.add(1);
        allAirlines[applicant].isRegistered = true;
        emit DidRegisterAirline(applicant);
    }

   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy
                            (                             
                            )
                            external
                            payable
    {

    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
                                )
                                external
                                pure
    {
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
                            (
                            )
                            external
                            pure
    {
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund
                            (   
                            )
                            public
                            payable
    {
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() 
                            external 
                            payable 
    {
        fund();
    }


}

