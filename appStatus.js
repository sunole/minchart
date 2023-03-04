// extract now for easy testing on different dates
const now = () => d3.timeMinute.offset(d3.timeHour.offset(d3.timeDay.offset(Date.now(), 0), 0), 0);

function getClosestWorkDay(d) {
  if (!dateFns.isWeekend(d)) {
    return d;
  }
  const daysToNextWorkday = dateFns.differenceInDays(dateFns.endOfWeek(d, { weekStartsOn: 2 }), d);
  return dateFns.addDays(d, daysToNextWorkday);
}

function timeDistance(to) {
  return dateFns.distanceInWords(now(), to, { addSuffix: true })
    .replace('about ', '');
}

const marketOpenHours = ['08:30', '15:00']
  .map(h => `${d3.timeFormat('%Y-%m-%d')(getClosestWorkDay(now()))} ${h}`) // only workdays
  .map(d => `${d} -0500`) // EST -05:00 time zone
  .map(d3.timeParse('%Y-%m-%d %H:%M %Z'));

console.info('Open hours', marketOpenHours.map(d3.timeFormat('%Y-%m-%d %H:%M')))

export function isMarketOpen() {
  return false || (marketOpenHours[0] < now() && now() < marketOpenHours[1]);
}

export function renderStatus(selection, props) {
  const { isSimulationMode } = props;

  // TODO: move one by one UI handling from here into Vue app
  //
  const titleMessage = `${isSimulationMode ? 'simulation' : 'live'} mode`;
  selection.select('.topbar')
    // .classed('simulation', isSimulationMode)
    // .classed('live', !isSimulationMode)
    .classed('closed', !isMarketOpen())
    // .call(s => s.select('.status .title')
    // .html(titleMessage))
    .call(s => s.select('.status .closed-message')
      .classed('hidden', isMarketOpen()))

  d3.select('head title').html(`${_.startCase(titleMessage)} • mchart`);

  const hoursMessage = now() < marketOpenHours[0] ?
    `opens ${timeDistance(marketOpenHours[0])}` :
    isMarketOpen() ? `closes ${timeDistance(marketOpenHours[1])}` :
      `opens ${timeDistance(getClosestWorkDay(dateFns.addDays(marketOpenHours[0], 1)))}`;

  selection.select('.market .hours')
    .html(hoursMessage)
}

