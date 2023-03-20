import { renderStatus, isMarketOpen } from './appStatus.js';

const disableTimers = false;
const debugMode = false;

const refetchDelay = 1000 * 60 / 30 ;
const refetchSimulationDelay = refetchDelay * 2;
 

console.log("Thomas changes 123 feature")
console.log("Thomas changes")
console.log("Thomas changes 123")

const urlPrefix = './chartdata/';
const group = new URL(window.location.href).searchParams.get('group') || 'dnas';
const dates = new URL(window.location.href).searchParams.get('dates') || '';
const loadPeriod = new URL(window.location.href).searchParams.get('loadPeriod') || 'daily';
const simPeriod = new URL(window.location.href).searchParams.get('simPeriod') || '5min';
const nasUrl = `${urlPrefix}${group}.csv`;
const tickerDataUrl = `${urlPrefix}${dates}${group}${loadPeriod}.csv`;
const simulationDataUrl = `${urlPrefix}${dates}${group}${simPeriod}.csv`;
//const tickerDataUrl = "http://127.0.0.1:3000/tickersQuotesMatrix.csv"; //mean123.asuscomm.com
document.title = "mc" + group;
console.log("tickerDataUrl:!!!", tickerDataUrl, nasUrl);

const parseTickerData = (text) => d3.csvParseRows(text)
  .map((row, rowIndex) => rowIndex === 0 ?
    row.map(cell => new Date(cell)) :
    row.map(cell => +cell)
  )
  .map(row => row.reverse());

const getSymbolInfo = nas => index => _.get(nas, index);

let highlightedSymbol = null;
let isDragging = false;

// Zooming
//
// const chartWidth = d3.select('.chart-wrapper').node().clientWidth;
// const timelineWidth = chartWidth - 2 * timelineMargin;
// let zoomRange = [0, timelineWidth];
// const zoomScale = d3.scaleLinear().domain(zoomRange).range(zoomRange);
// since timleline and chart widths are different, this scale is introduced
// it maps positions on timeline to positions on the chart
// const timelineToChartScale = zoomScale.copy().range([0, chartWidth]);

// var beep6 = document.getElementById("beep6");
// var beep7 = document.getElementById("beep7");
// var beep8 = document.getElementById("beep8");
document.getElementById("w3review").innerHTML = "111111111111111";


Promise.all([
  d3.csv(nasUrl),
  d3.text(tickerDataUrl).then(parseTickerData),
]).then(([nas, tickerData]) => {
  const timeRow = tickerData.shift();

  // Insert DOLR symbol
  //
  nas.unshift({
    Tick: 'DOLR',
    'Company Name': 'US Dollar',
  });
  tickerData.unshift(_.fill(Array(tickerData[0].length), 1));

  console.info('Loaded:', { [nasUrl]: nas, timeRow, [tickerDataUrl]: tickerData });
  if (debugMode) {
    tickerData = tickerData.slice(0, 5).map(row => row.slice(0, 30));
  }

  // refs calculated dynamically to make sure that main ref marker is
  // always aligned with the right edge of the zoom range
  const getRefs = () => {
    const columns = tickerData[0].length - 1;
    const pixelScale = zoomScale.copy().rangeRound([0, columns]);
    let refs = store.getRefs().map(ref => ({
      ...ref,
      ref: ref.isMain ?
        pixelScale(zoomRange[1]) : // align main ref marker to zoom handler
        getClosestRef(ref.timestamp) // adjust ref position depending on timestamp
    }));
    return refs;
  }
  const getClosestRef = t => {
    const date = new Date(t);
    const distances = timeRow.map((d, i) => ({ ref: i, d: date - d }));
    const sorted = _.sortBy(distances, d => Math.abs(d.d))
    const closestRef = _.first(sorted).ref;
    return closestRef;
  };
  document.getElementById("w3review").innerHTML = tickerData;

  //   let ranked, totalcount;
  //   const recalc = () => {
  //     // const updated = middleware.calc(tickerData, getRefs());
  //     ranked = updated.ranked;
  //     totalcount = updated.totalcount;
  //   }
  //   recalc();

  // runTests(ranked, totalcount, getRefs());

  // Render loop


  const render = () => {

    document.getElementById("w3review").innerHTML = "From Render" + tickerData;

  };

  render();


  // Run data update timer
  //
  !disableTimers && setInterval(() => {
    if (!isMarketOpen()) {
      return;
    }

    fetchData(nas)
      // Just a quick test to make sure that `tickers` order match `nas` order
      .then(tickers => { console.log( "fgsdf", tickers)
        // Insert DOLR symbol to API response
        tickers.unshift({
          price: '1',
          symbol: 'DOLR',
          timestamp: d3.timeFormat('%Y-%m-%d %H:%M:%S')(Date.now())
        });
        const missingSymbols = _.reject(nas, n => _.some(tickers, t => t.symbol === n.Tick));
        if (missingSymbols.length) {
          console.warn({ missingSymbols });
        } else {
          tickers.forEach((t, i) => {
            if (t.symbol !== nas[i].Tick) {
              console.warn(`incorrect pair "${t.symbol}" != "${nas[i].Tick}"`, i, t, nas[i]);
            }
          });
        }
        return tickers;
      })
      // convert to flat array of prices
      .then(tickers => tickers.map(t => +t.price))
      // add new column to the tickerData
      .then(prices => tickerData.map((row, rowIndex) => [...row, prices[rowIndex]]))
      .then(newTickerData => {
        tickerData = newTickerData;
        document.getElementById("w3review").innerHTML = tickerData;
        // recalc();
        // // add new column to the times row
        // timeRow.push(new Date());
        // render();
      });
  }, refetchDelay);

  // Run sumulation update timer
  //
  let simulationTimeIndex = 0;
  !disableTimers && setInterval(() => {
    // if (!app.isSimulationMode) {
    //   return;
    // }
    fetchSimulationData()
      // get a column form the simulation data
      .then(data => data.map(row => row[simulationTimeIndex % row.length]))
      // cut off the date row
      .then(column => {
        timeRow.push(column.shift());
        return column;
      })
      // add new column to the tickerData
      .then(prices => tickerData.map((row, rowIndex) => [...row, prices[rowIndex]]))
      .then(newTickerData => {
        tickerData = newTickerData;
       // recalc();
        render();
      })
      .then(() => simulationTimeIndex += 1)
  }, refetchSimulationDelay);
});


// function initTickFunction(selection, { delay, onTickCallback }) {
//   let highlightedPositionIndex = 0;

//   const tickFunction = () => {
//     const positions = store.get('positions');
//     const count = _.keys(positions).length;
//     if (count === 0) {
//       return;
//     }

//     const sortedPositions = _.map(positions, p => p)
//       .sort((a, b) => a.symbol.localeCompare(b.symbol));

//     highlightedSymbol = sortedPositions[highlightedPositionIndex % count].symbolIndex;
//     highlightedPositionIndex += 1;
//     onTickCallback();
//   };

//   let tickInterval = setInterval(tickFunction, delay);

//   // Track user activity and run tick function
//   selection
//     .on('mousemove', () => {
//       clearInterval(tickInterval);
//     })
//     .on('mouseleave', () => {
//       tickInterval = setInterval(tickFunction, delay);
//     });
// }

const apiKey = 'N5843PTGMJ54EDDI';
const dataUrl = `http://192.168.50.118:3003/query?function=BATCH_STOCK_QUOTES&apikey=${apiKey}&datatype=csv&symbols=`;
const symbolsPerRequestMax = 150;

function fetchData(nas) {

  console.log(" fetch datat!!!!!!!")
  // The API has limit of 100 symbols per request
  // Split the data into minimum necessary requests and wait all of them to finish
  const requestsCount = Math.ceil(nas.length / symbolsPerRequestMax);
  const symbolsPerRequest = Math.ceil(nas.length / requestsCount);
  const requests = _.chunk(nas, symbolsPerRequest).map(nasPerRequest => {
    const symbols = nasPerRequest.map(n => n.Tick).join(',');
    return d3.csv(dataUrl + symbols);
  });
  return Promise.all(requests)
    .then(responses => _.concat(...responses));
}

let simulationData;

function fetchSimulationData() {
  if (!simulationData) {
    return d3.text(simulationDataUrl)
      .then(parseTickerData)
      .then(data => simulationData = data)
  }
  return Promise.resolve(simulationData);
}
