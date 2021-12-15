
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {
    let flights = [];

    function getCurrentFlight() {
        let flightIndex = DOM.elid('flights-ddown').value;
        return flights[flightIndex];
    }

    function fetchFlights() {
        contract.fetchFlights(getCurrentAirline(),(result) => {
            let selection = document.getElementById('flights-ddown');
            flights = result;
            let data = flights.map((flight, index) => {
                return { display: flight.flightNo, value: index }
            });
            makeOptions(selection, data);
        });
    }

    function updateBalance() {
        contract.updateBalance(getCurrentAccount(), (eth) => {
            let selection = document.getElementById('value-balance');
            selection.innerHTML = eth;
        });
    }

    let contract = new Contract('localhost', () => {
        contract.fetchAccounts(result => {
            let selection = document.getElementById('accounts-ddown');
            makeOptions(selection, result.map(result => { return { display: result, value: result }}));
            updateBalance();
        });
        contract.listenForStatusUpdates((result) => {
            alert("fu");
        });
        // Read transaction
        contract.isOperational((error, result) => {
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });
        contract.fetchAirlines((error, result) => {
            let selection = document.getElementById('airlines-ddown');
            makeOptions(selection, result.map(airline => {
                return { display: airline, value: airline }
            }));
            fetchFlights();
        });
        DOM.elid('accounts-ddown').addEventListener('change', () => {
            updateBalance();
        });
        DOM.elid('airlines-ddown').addEventListener('change', () => {
            fetchFlights();
        });
        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = getCurrentFlight();
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                let value = "Airline: " + result.airline + " Flightno.: " + result.flightNo + " Time: " + Date(result.time * 1000);
                display('Oracles', 'Trigger oracles', [ { label: 'Fetching status for', error: error, value: value } ]);
            });
        });
        DOM.elid('submit-insurance').addEventListener('click', () => {
            let account = getCurrentAccount();
            let flight = getCurrentFlight();
            contract.purchaseInsurance(account, flight, (purchased) => {
                let value = "Account: " + account + " Airline: " + flight.airline + " Flightno.: " + flight.flightNo + " Time: " + Date(flight.time * 1000);
                let label = "Purchase was " + (purchased ? "" : "not") + "  successful";
                display('Insurance', "", [ { label: label, error: null, value: value } ]);
                updateBalance();
            });
        });
        DOM.elid('submit-claim').addEventListener('click', () => {
            let account = getCurrentAccount();
            contract.claim(account, (claimed) => {
                let value = claimed ? "Claim successful" : "Nothing to claim";
                let label = "";
                display('Claim', "Claiming insurance credits", [ { label: label, error: null, value: value } ]);
                updateBalance();
            })
        });
    });
})();

function getCurrentAirline() {
    return document.getElementById('airlines-ddown').value;
}

function getCurrentAccount() {
    return document.getElementById('accounts-ddown').value;
}

function makeOptions(selection, array) {
    selection.innerHTML = "";
    for (let i = 0; i < array.length; i++) {
        let opt = document.createElement('option');
        opt.value = array[i].value;
        opt.innerHTML = array[i].display;
        selection.appendChild(opt);
    }
    selection.value = array[0].value;
}

function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    displayDiv.innerHTML = "";
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}







