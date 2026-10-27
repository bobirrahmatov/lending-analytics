/* Build fixed-name runtime workbooks from the prepared comparison release.
 * Run with the Codex bundled Node executable and CREDIT_ARTIFACT_DEPENDENCIES
 * pointing to its node_modules. No project-local package is used for authoring.
 * Example: CREDIT_ARTIFACT_DEPENDENCIES=/path/to/bundled/node_modules node tools/create_excel_samples.mjs
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const historyOnly = process.argv.includes('--history-only');
const positional = process.argv.slice(2).filter(value => value !== '--history-only');
const inputDir = path.resolve(positional[0] || path.join(root, 'demo-comparison'));
const outputDir = path.resolve(positional[1] || path.join(root, 'excel/runtime'));
function buildCovenantHistory() {
  // Reuse the existing reconciliation function, including same-date portfolio
  // controls. This adapter does not duplicate the business join/history rules.
  const python = process.env.CREDIT_PYTHON || path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3');
  const code = `import json,sys
from pathlib import Path
sys.path.insert(0,sys.argv[1])
from build_covenant_history import snapshot
source=Path(sys.argv[2]);out=Path(sys.argv[3])
m=json.loads((source/'credit-manifest.json').read_text())
assert m['schema_version']==2 and m['is_demo'] is True
data={k:json.loads((source/v['filename']).read_text()) for k,v in m['files'].items()}
assert all(v['bundle_id']==m['bundle_id'] for v in data.values())
history_rows=[];portfolio_rows=[];controls=[]
for dataset in [data['previous']['datasets'],{k:v['rows'] for k,v in data.items() if k not in ('previous','covenant_history')}]:
 control,rows=snapshot({k:{'rows':v} for k,v in dataset.items()})
 portfolio_rows.extend(control.pop('_portfolio_rows',[]));history_rows.extend(rows);controls.append(control)
assert len({s['as_of_date'] for s in controls})==len(controls)
envelope={'schema_version':2,'bundle_id':m['bundle_id'],'is_demo':True,'rows':history_rows,'snapshots':controls,'portfolio_rows':portfolio_rows}
text=json.dumps(envelope,ensure_ascii=False,separators=(',',':')).replace('Illustrative relationship ','Relationship ').replace('Illustrative banker ','Banker ').replace('Demo source owner','Data owner')
assert len(text.encode('utf-8'))<10000000
filename='credit-covenant-history.json';(out/filename).write_text(text,encoding='utf-8')
manifest=json.loads((out/'credit-manifest.json').read_text());assert manifest['bundle_id']==m['bundle_id'] and manifest['is_demo'] is True
manifest['files']['covenant_history']={'filename':filename,'rows':len(history_rows)}
(out/'credit-manifest.json').write_text(json.dumps(manifest,indent=2)+'\\n')
print(filename+': '+str(len(history_rows))+' associations, '+str(len(portfolio_rows))+' facility snapshots, '+str(len(controls))+' reporting dates')
`;
  process.stdout.write(execFileSync(python, ['-c', code, path.join(root, 'tools'), inputDir, outputDir], {encoding: 'utf8'}));
}
if (historyOnly) {
  buildCovenantHistory();
  process.exit(0);
}
const dependencyRoot = process.env.CREDIT_ARTIFACT_DEPENDENCIES || path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lending-analytics-workbooks-'));
await fs.symlink(dependencyRoot, path.join(workDir, 'node_modules'), 'dir');
const requireArtifact = createRequire(path.join(workDir, 'author.cjs'));
const {Workbook, SpreadsheetFile} = await import(pathToFileURL(requireArtifact.resolve('@oai/artifact-tool')).href);
const schema = JSON.parse(await fs.readFile(path.join(root, 'tools/schema.json'), 'utf8'));
const sourceManifest = JSON.parse(await fs.readFile(path.join(inputDir, 'credit-manifest.json'), 'utf8'));
assert.equal(sourceManifest.schema_version, 2);
assert.equal(sourceManifest.is_demo, true, 'This builder only authors sample workbooks');
const names = ['Sources', 'Monitoring', 'Portfolio', 'Activity', 'History', 'Documents'];
const datasets = {};
const manifest = {...sourceManifest, files: {}};
const verification = {bundle_id: sourceManifest.bundle_id, is_demo: true, files: {}, sourceControls: {}};

function neutralLabel(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/Illustrative relationship /g, 'Relationship ').replace(/Illustrative banker /g, 'Banker ').replace(/Demo source owner/g, 'Data owner');
}
function colName(index) {
  let result = '';
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) result = String.fromCharCode(65 + (value - 1) % 26) + result;
  return result;
}
function cleanRow(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, neutralLabel(value)]));
}
await fs.mkdir(outputDir, {recursive: true});
await fs.mkdir(path.join(workDir, 'previews'), {recursive: true});
for (const name of names) {
  const dataset = name.toLowerCase();
  const envelope = JSON.parse(await fs.readFile(path.join(inputDir, sourceManifest.files[dataset].filename), 'utf8'));
  assert.equal(envelope.bundle_id, sourceManifest.bundle_id);
  assert.equal(envelope.rows.length, sourceManifest.files[dataset].rows);
  datasets[dataset] = envelope.rows.map(cleanRow);
}
datasets.documents = [{
  document_id: 'LENDING_ANALYTICS_HOME', category: 'PORTFOLIO', title: 'Lending Analytics',
  url: '/confluence/pages/viewpage.action?pageId=3782729579', as_of_date: null
}];
for (const source of datasets.sources) {
  const count = ['monitoring', 'portfolio', 'activity'].reduce((sum, dataset) => sum + datasets[dataset].filter(row => row.source_id === source.source_id).length, 0);
  assert.equal(count, source.record_count, 'Source control count: ' + source.source_id);
  verification.sourceControls[source.source_id] = count;
}

for (const name of names) {
  const dataset = name.toLowerCase(), rows = datasets[dataset], fields = schema[name];
  const canonical = fields.map(field => field.field);
  const extra = [...new Set(rows.flatMap(row => Object.keys(row)))].filter(field => !canonical.includes(field)).sort();
  const headers = [...canonical, ...extra], lastColumn = colName(headers.length - 1), lastRow = rows.length + 1;
  const matrix = [headers, ...rows.map(row => headers.map(header => row[header] == null ? null : row[header]))];
  const workbook = Workbook.create();
  const data = workbook.worksheets.add('Data');
  const metadata = workbook.worksheets.add('Metadata');
  data.showGridLines = false;
  metadata.showGridLines = false;
  const used = data.getRange('A1:' + lastColumn + lastRow);
  used.values = matrix;
  used.format.font = {name: 'Arial', size: 10, color: '#203754'};
  used.format.rowHeight = 22;
  used.format.verticalAlignment = 'center';
  const header = data.getRange('A1:' + lastColumn + '1');
  header.format = {fill: '#17365D', font: {name: 'Arial', size: 10, bold: true, color: '#FFFFFF'}, horizontalAlignment: 'center', verticalAlignment: 'center', wrapText: true, rowHeight: 36};
  header.format.borders = {insideVertical: {style: 'thin', color: '#FFFFFF'}};
  for (let index = 0; index < headers.length; index++) {
    const column = colName(index), field = fields.find(item => item.field === headers[index]);
    const values = matrix.slice(1).map(row => row[index]);
    const longest = Math.max(headers[index].length, ...values.filter(value => typeof value === 'string').map(value => value.length));
    const width = Math.max(15, Math.min(44, longest + 2));
    const body = data.getRange(column + '2:' + column + lastRow);
    data.getRange(column + '1:' + column + lastRow).format.columnWidth = width;
    body.format.horizontalAlignment = field && ['number', 'integer'].includes(field.type) ? 'right' : 'left';
    // ISO date text is the runtime contract. Do not let Excel retype identifiers
    // or dates, so the canonical value round-trips without a locale/timezone.
    if (field && ['text', 'date'].includes(field.type)) body.setNumberFormat('@');
    else if (field && field.type === 'integer') body.setNumberFormat('#,##0');
    else if (field && field.type === 'number') body.setNumberFormat(headers[index] === 'rotce' ? '0.0%' : '#,##0.00;(#,##0.00);0.00');
    if (longest > 44) body.format.wrapText = true;
  }
  data.freezePanes.freezeRows(1);
  data.freezePanes.freezeColumns(1);
  const table = data.tables.add('A1:' + lastColumn + lastRow, true, name + 'Records');
  table.showFilterButton = true;
  table.showBandedColumns = false;
  // Fitted heights only for populated rows preserve long source descriptions.
  data.getRange('A2:' + lastColumn + lastRow).format.autofitRows();

  const metadataRows = [
    ['key', 'value'], ['schema_version', 2], ['bundle_id', sourceManifest.bundle_id],
    ['dataset', dataset], ['rows', rows.length], ['is_demo', true]
  ];
  metadata.getRange('A1:B6').values = metadataRows;
  metadata.getRange('A1:B6').format = {font: {name: 'Arial', size: 10, color: '#203754'}, rowHeight: 24, verticalAlignment: 'center'};
  metadata.getRange('A1:B1').format = {fill: '#17365D', font: {name: 'Arial', size: 10, bold: true, color: '#FFFFFF'}, horizontalAlignment: 'center'};
  metadata.getRange('A1:A6').format.columnWidth = 24;
  metadata.getRange('B1:B6').format.columnWidth = 44;
  metadata.getRange('B3:B4').setNumberFormat('@');
  workbook.recalculate();
  assert.deepEqual(data.getRange('A1:' + lastColumn + lastRow).values, matrix, 'Data value parity: ' + name);
  assert.deepEqual(metadata.getRange('A1:B6').values, metadataRows, 'Metadata value parity: ' + name);
  const inspect = await workbook.inspect({kind: 'table', range: 'Data!A1:' + colName(Math.min(headers.length - 1, 6)) + Math.min(lastRow, 5), include: 'values,formulas', tableMaxRows: 5, tableMaxCols: 7, maxChars: 2500});
  await fs.writeFile(path.join(workDir, name + '.inspect.ndjson'), inspect.ndjson);
  const errors = await workbook.inspect({kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!', options: {useRegex: true, maxResults: 20}, summary: 'Final formula error scan'});
  await fs.writeFile(path.join(workDir, name + '.errors.ndjson'), errors.ndjson);
  for (const [sheetName, range] of [['Data', 'A1:' + colName(Math.min(headers.length - 1, 5)) + Math.min(lastRow, 7)], ['Metadata', 'A1:B6']]) {
    const preview = await workbook.render({sheetName, range, scale: 1.5, format: 'png'});
    await fs.writeFile(path.join(workDir, 'previews', name + '-' + sheetName + '.png'), new Uint8Array(await preview.arrayBuffer()));
  }
  const target = path.join(outputDir, name + '.xlsx');
  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(target);
  await fs.rm(target + '.inspect.ndjson', {force: true});
  const {size} = await fs.stat(target);
  assert.ok(size < 10000000, 'Attachment limit: ' + name);
  manifest.files[dataset] = {filename: name + '.xlsx', rows: rows.length, format: 'xlsx'};
  verification.files[name + '.xlsx'] = {dataset, rows: rows.length, canonical_columns: canonical.length, extra_columns: extra.length, bytes: size};
  console.log(name + '.xlsx: ' + rows.length + ' rows, ' + headers.length + ' fields, ' + size + ' bytes');
}
// Keep optional comparisons as published JSON, with stable filenames. Each is
// still checked against the same release by the shared dashboard loader.
for (const [dataset, descriptor] of Object.entries(sourceManifest.files)) {
  if (names.some(name => name.toLowerCase() === dataset)) continue;
  assert.ok(descriptor.filename && !descriptor.parts, 'Optional envelope must be one JSON attachment');
  const contents = await fs.readFile(path.join(inputDir, descriptor.filename), 'utf8');
  const envelope = JSON.parse(contents);
  assert.equal(envelope.bundle_id, sourceManifest.bundle_id);
  const filename = 'credit-' + dataset + '.json';
  // Neutral display labels remain consistent with the current workbook records.
  await fs.writeFile(path.join(outputDir, filename), neutralLabel(contents));
  manifest.files[dataset] = {...descriptor, filename};
}
await fs.writeFile(path.join(outputDir, 'credit-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
buildCovenantHistory();
await fs.writeFile(path.join(outputDir, 'Verification.json'), JSON.stringify(verification, null, 2) + '\n');
console.log('Workbook previews and inspection: ' + workDir);
