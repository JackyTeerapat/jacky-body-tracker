#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';
import { assertNewScan, evaluateTracker, loadSource, parseLoaderFiles, validateData } from './tracker-lib.mjs';

const files = parseLoaderFiles();
const duplicates = files.filter((f, i) => files.indexOf(f) !== i);
if (duplicates.length) throw new Error(`Duplicate loader entries: ${[...new Set(duplicates)].join(', ')}`);

const { source } = loadSource(files);
const tracker = evaluateTracker(source);
validateData(tracker.DATA, tracker.LATEST_DATE);

const ndjsonPath = 'data/scans.ndjson';
const extraScans = fs.existsSync(ndjsonPath)
  ? fs.readFileSync(ndjsonPath, 'utf8')
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .map((line, i) => {
        try {
          return JSON.parse(line);
        } catch (error) {
          throw new Error(`Invalid JSON in ${ndjsonPath} line ${i + 1}: ${error.message}`);
        }
      })
  : [];

const combined = tracker.DATA.slice();
for (const scan of extraScans) {
  assertNewScan(scan, combined);
  combined.push(scan);
}
validateData(combined, combined.at(-1).isoDate);

const uiScripts = [
  'assets/chart-display-fix.js',
  'assets/calendar-performance.js',
  'assets/layout-hierarchy.js',
  'assets/trend-rebuild.js'
];

for (const file of uiScripts) {
  const code = fs.readFileSync(file, 'utf8');
  new vm.Script(code, { filename: file });
}

const indexText = fs.readFileSync('index.html', 'utf8');
for (const file of uiScripts) {
  const count = indexText.split(file).length - 1;
  if (count !== 1) throw new Error(`index.html must load ${file} exactly once; found ${count}`);
}
if (indexText.includes('assets/runtime-overrides.js')) {
  throw new Error('index.html must not load legacy assets/runtime-overrides.js');
}
if (indexText.indexOf('assets/trend-rebuild.js') < indexText.indexOf('assets/layout-hierarchy.js')) {
  throw new Error('trend-rebuild.js must load after layout-hierarchy.js');
}

const chartBase = fs.readFileSync('assets/chart-display-fix.js', 'utf8');
const layout = fs.readFileSync('assets/layout-hierarchy.js', 'utf8');
const trend = fs.readFileSync('assets/trend-rebuild.js', 'utf8');

if (chartBase.includes('Chart.getChart') || chartBase.includes('.s-range-controls')) {
  throw new Error('chart-display-fix.js must not own trend chart/range logic');
}
if (layout.includes('Chart.getChart')) {
  throw new Error('layout-hierarchy.js must not own Chart.js rendering');
}
if (!trend.includes('new Chart') || !trend.includes('tr-fat') || !trend.includes('tr-muscle')) {
  throw new Error('trend-rebuild.js must create isolated Fat/Muscle charts');
}

console.log('Tracker validation OK');
console.log(`Source pages: ${files.length}`);
console.log(`Legacy scans: ${tracker.DATA.length}`);
console.log(`NDJSON scans: ${extraScans.length}`);
console.log(`Total scans: ${combined.length}`);
console.log(`Latest: ${combined.at(-1).measuredAt}`);
console.log(`Runtime latest date: ${combined.at(-1).isoDate}`);
console.log('UI scripts: syntax OK / rebuilt trend charts loaded last');