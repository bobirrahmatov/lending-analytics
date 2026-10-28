// Synthetic workloads exercise identity, top-ten selection and additive priority stacks.
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<div id="credit-hub"><div id="ch-content"></div></div>', { runScripts: 'outside-only' });
const w = dom.window, root = w.document.querySelector('#credit-hub'), charts = [];
w.eval(fs.readFileSync(path.join(__dirname, '../attachments/credit-monitoring.js'), 'utf8'));
w.CreditIcons = { icon: () => '', metric: () => '' };
w.CreditCovenantRisk = { delta: () => ({ ready: false }), facilities: rows => ({ records: rows }) };
w.CreditDonut = () => {};
let prior = [], registerRows, registerColumns, opened;
w.CreditSnapshots = { compare: () => ({ ready: true, prior, label: 'Previous weekday' }) };
w.Highcharts = { chart(el, options) { charts.push({ id: el.id, options }); return { destroy() {}, setSize() {} }; } };
const monitor = w.CreditMonitoring({
  root, esc: value => String(value ?? ''), num: String, data: () => ({}), filters: () => ({}), addChart() {}, methodology() {},
  register(title, rows, columns) { registerRows = rows; registerColumns = columns; return '<section id="ch-register"><div class="ch-toolbar"></div></section>'; },
  openChart(id, rows, label) { opened = { id, rows, label }; }
});
const areas = ['CA', 'FACILITY', 'CCM', 'INSURANCE', 'APPRAISALS', 'COVENANTS'];
const labels = { CA: 'CA expiration', FACILITY: 'Facility maturity', CCM: 'CCM', INSURANCE: 'Insurance', APPRAISALS: 'Appraisals', COVENANTS: 'Covenants' };
const key = row => row.owner_id || null;
const sourceSpecs = [
  ['U13', 'Last', 1], ['U12', 'Last', 2], ['U11', 'Zulu', 9], ['U10', 'Alpha at cutoff', 9], ['U09', 'Alpha at cutoff', 9],
  ['U08', 'Foxtrot', 10], ['U07', 'Echo', 11], ['U06', 'Delta', 12], ['U05', 'Cedar', 13],
  ['U04', 'Same name', 14], ['U03', 'Same name', 14], ['U02', 'Beta', 15], ['U01', 'Alpha', 15], [null, null, 16]
];
const rows = sourceSpecs.flatMap(([owner_id, owner_name, count], index) => Array.from({ length: count }, (_, i) => ({
  item_id: `action-${index}-${i}`, owner_id, owner_name, category: areas[(index + i) % areas.length],
  action_required: true, critical: i % 3 === 0, days_past_due: i + 1, team_lead: 'Team', region: 'NAM',
  relationship_id: 'R' + index, facility_id: 'F' + index, as_of_date: '2026-10-27'
})));
rows.push({ ...rows[0], item_id: 'closed-critical', action_required: false, critical: true },
  { ...rows[0], item_id: 'coming-due', action_required: false, critical: false, coming_due: true });
prior = rows.filter(row => row.action_required).map(row => ({ ...row, item_id: 'previous-' + row.item_id, as_of_date: '2026-10-26' }));
// A huge prior-only queue must not control today's top-ten ranking.
prior.push(...Array.from({ length: 200 }, (_, i) => ({ ...prior[0], item_id: 'prior-only-' + i, owner_id: 'PRIOR_ONLY', owner_name: 'Prior only' })));
const expectedKeys = [null, 'U01', 'U02', 'U03', 'U04', 'U05', 'U06', 'U07', 'U08', 'U09'];
const selected = rows.filter(row => row.action_required && expectedKeys.includes(key(row)));
const render = records => { charts.length = 0; monitor.main('workload', records); };
const chart = id => charts.find(value => value.id === id).options;
const pointsAt = (options, index) => options.series.flatMap(series => series.data[index].custom.rows);
const pointKeys = options => Array.from(options.xAxis.categories, (_, index) => {
  const keys = new Set(pointsAt(options, index).map(key));
  assert.equal(keys.size, 1, 'Each displayed underwriter remains one exact identifier');
  return [...keys][0];
});
function drill(options, series, point, index, expectedId) {
  options.plotOptions.series.point.events.click.call({ options: point, index, series: { name: series.name } });
  assert.equal(opened.id, expectedId);
  assert.equal(opened.rows, point.custom.rows, 'A segment drills its exact source cohort, without name joins');
}
render(rows);
const workloadId = 'mon-workload-chart-0', priorityId = 'mon-workload-chart-4';
let workload = chart(workloadId);
assert.equal(monitor.getDefinition(workloadId).title, 'Workload by Underwriter');
assert.equal(workload.xAxis.categories.length, 10);
assert.deepEqual(pointKeys(workload), expectedKeys, 'Rank by current count, display name, then exact identifier');
assert.equal(new Set(workload.xAxis.categories).size, 10, 'Duplicate display names are visibly distinguishable');
assert.equal(monitor.getRows(workloadId).length, selected.length);
assert.ok(monitor.getRows(workloadId).every(row => selected.includes(row)));
assert.equal(monitor.getDefinition(workloadId).prior.length, prior.filter(row => expectedKeys.includes(key(row))).length);
assert.ok(monitor.getDefinition(workloadId).prior.every(row => expectedKeys.includes(key(row))), 'Prior cohort uses current top-ten identifiers');
assert.equal(registerRows, rows, 'Top-ten chart never truncates the source register');
assert.equal(registerColumns.find(column => column[0] === 'owner_name')[1], 'Underwriter');
assert.doesNotMatch(root.textContent, /\bowners?\b/i, 'Workload visible terminology consistently uses Underwriter');
assert.match(monitor.getMethod(workloadId)[0], /top (?:ten|10)|ten largest/i);
function assertUnderwriterStacks(options, records, expectedId) {
  assert.equal(options.chart.type, 'bar', 'Long underwriter labels retain readable horizontal bars');
  assert.equal(options.plotOptions.series.stacking, 'normal', 'One additive bar per underwriter');
  assert.equal(options.yAxis.reversedStacks, false, 'Other actions precede the critical segment');
  assert.equal(options.yAxis.stackLabels.enabled, true, 'Each underwriter total remains visible at the end');
  assert.equal(options.plotOptions.bar.dataLabels.enabled, true);
  assert.equal(options.plotOptions.bar.dataLabels.inside, true, 'Counts sit inside their own segments');
  assert.equal(options.plotOptions.bar.dataLabels.style.color, '#fff');
  assert.equal(options.plotOptions.bar.dataLabels.formatter.call({ y: 4 }), '4');
  assert.equal(options.plotOptions.bar.dataLabels.formatter.call({ y: 0 }), null, 'Zero segments do not show phantom labels');
  assert.deepEqual(Array.from(options.series, series => series.name), ['Other actions', 'Critical']);
  assert.deepEqual(Array.from(options.series, series => series.color), ['#255BE3', '#D64545']);
  const allRows = options.series.flatMap(series => series.data.flatMap(point => point.custom.rows));
  assert.equal(allRows.length, records.length, 'Displayed totals reconcile with selected underwriter records');
  assert.equal(new Set(allRows).size, records.length, 'Stack partitions never count an obligation twice');
  assert.ok(allRows.every(row => records.includes(row)));
  options.xAxis.categories.forEach((label, index) => {
    const displayed = pointsAt(options, index), identifier = key(displayed[0]);
    const expected = records.filter(row => key(row) === identifier);
    assert.equal(options.series.reduce((sum, series) => sum + series.data[index].y, 0), expected.length, label + ' reconciles to its total');
    for (const series of options.series) {
      const point = series.data[index], expectedSegment = expected.filter(row => series.name === 'Critical' ? row.critical : !row.critical);
      assert.equal(point.y, expectedSegment.length);
      assert.equal(point.custom.rows.length, expectedSegment.length);
      assert.ok(point.custom.rows.every(row => expectedSegment.includes(row)));
      drill(options, series, point, index, expectedId);
    }
  });
}
assertUnderwriterStacks(workload, selected, workloadId);
assert.match(monitor.getMethod(workloadId)[0], /one stacked bar/i);
const firstOrder = pointKeys(workload);
render([...rows].reverse());
assert.deepEqual(pointKeys(chart(workloadId)), firstOrder, 'Input row order cannot change tied top-ten membership');

function assertPriorities(records) {
  const options = chart(priorityId), actions = records.filter(row => row.action_required === true);
  assert.equal(options.chart.type, 'column');
  assert.equal(options.plotOptions.series.stacking, 'normal');
  assert.equal(options.yAxis.reversedStacks, false, 'Other actions form the base; critical actions remain at the top');
  assert.equal(options.yAxis.stackLabels.enabled, true, 'Totals remain visible above each monitoring area');
  assert.deepEqual(Array.from(options.series, series => series.name), ['Other actions', 'Critical']);
  assert.deepEqual(Array.from(options.series, series => series.color), ['#255BE3', '#D64545']);
  assert.equal(root.querySelector('#' + priorityId).closest('section').dataset.bentoSpan, '12');
  const stats = root.querySelector('#' + priorityId).closest('section').querySelector('[aria-label="Action priority totals"]');
  const criticalCount = actions.filter(row => row.critical).length;
  assert.deepEqual(Array.from(stats.querySelectorAll('dd'), el => Number(el.textContent)),
    [actions.length, criticalCount, actions.length - criticalCount, new Set(actions.map(row => row.category)).size],
    'The summary strip and plotted source cohorts reconcile');
  const allDrillRows = options.series.flatMap(series => series.data.flatMap(point => point.custom.rows));
  assert.equal(allDrillRows.length, actions.length, 'Stack totals count each actionable source obligation once');
  assert.equal(new Set(allDrillRows).size, actions.length, 'Critical is a subset partition, never double-counted');
  assert.ok(allDrillRows.every(row => actions.includes(row)), 'Non-actionable critical flags do not enter the chart');
  options.xAxis.categories.forEach((label, index) => {
    const expected = actions.filter(row => labels[row.category] === label);
    assert.equal(options.series.reduce((sum, series) => sum + series.data[index].y, 0), expected.length, label + ' reconciles to its area total');
    for (const series of options.series) {
      const point = series.data[index];
      const expectedSegment = expected.filter(row => series.name === 'Critical' ? row.critical : !row.critical);
      assert.equal(point.y, expectedSegment.length);
      assert.equal(point.custom.rows.length, expectedSegment.length);
      assert.ok(point.custom.rows.every(row => expectedSegment.includes(row)));
      drill(options, series, point, index, priorityId);
    }
  });
}
assertPriorities(rows);

// The main expanded analysis retains all source rows; its underwriter view is still bounded.
const panel = w.document.createElement('div');
panel.innerHTML = '<div class="cd-chart-slot"></div><div class="cd-analysis-kpis"></div><div class="cd-analysis-grid"></div>';
root.append(panel);
const analysis = { id: priorityId, panel };
assert.equal(monitor.expanded(analysis), true);
const expanded = chart(priorityId + '-detail-0');
assert.equal(expanded.xAxis.categories.length, 10);
assert.deepEqual(pointKeys(expanded), expectedKeys);
assertUnderwriterStacks(expanded, [...selected].reverse(), priorityId);
assert.equal(analysis.allRecords.length, rows.filter(row => row.action_required).length, 'Expanded source records retain underwriters beyond the chart top ten');
assert.ok(analysis.allRecords.some(row => row.owner_id === 'U13'));
panel.remove();

for (const critical of [true, false]) {
  const homogeneous = rows.filter(row => row.action_required).slice(0, 20).map(row => ({ ...row, critical }));
  render(homogeneous);
  assertPriorities(homogeneous);
  assertUnderwriterStacks(chart(workloadId), homogeneous, workloadId);
  assert.ok(chart(workloadId).xAxis.categories.length <= 10, 'A smaller filtered scope is not padded with empty underwriters');
}
render([]);
assert.equal(monitor.getRows(workloadId).length, 0);
assert.equal(monitor.getRows(priorityId).length, 0);
assert.equal(charts.length, 0, 'Empty selections do not invent zero-valued records or chart categories');
assert.match(root.querySelector('#' + priorityId).textContent, /No records/);
console.log('PASS workload exact-ID top ten, deterministic ties/missing IDs, full register and expansion records; additive critical/other underwriter and priority stacks, in-bar counts, totals and exact drills.');
dom.window.close();
