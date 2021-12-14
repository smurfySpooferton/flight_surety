
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {
    let flights = [];
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

    let contract = new Contract('localhost', () => {
        contract.listenForStatusUpdates((result) => {
            console.log(result);
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
        DOM.elid('airlines-ddown').addEventListener('change', () => {
            fetchFlights();
        });
        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flightIndex = DOM.elid('flights-ddown').value;
            let flight = flights[flightIndex];
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        })
    });
})();

function getCurrentAirline() {
    return document.getElementById('airlines-ddown').value;
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







