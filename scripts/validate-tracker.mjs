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
  'assets/layout-hierarchy.js',
  'assets/goal-progress-v2.js',
  'assets/range-controls.js',
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
if (indexText.includes('assets/calendar-performance.js')) {
  throw new Error('index.html must not load legacy calendar-performance.js');
}
if (indexText.includes('assets/runtime-overrides.js')) {
  throw new Error('index.html must not load legacy runtime-overrides.js');
}
if (indexText.includes('const assetVersion = Date.now()')) {
  throw new Error('UI assets must use a stable cache version; daily scan updates should not bust JS cache');
}
if (!indexText.includes("readText('data/scans.ndjson', 'no-cache')")) {
  throw new Error('data/scans.ndjson must always be fetched fresh');
}
if (indexText.indexOf('assets/range-controls.js') > indexText.indexOf('assets/trend-rebuild.js')) {
  throw new Error('range-controls.js must load before trend-rebuild.js');
}
if (indexText.indexOf('assets/trend-rebuild.js') < indexText.indexOf('assets/layout-hierarchy.js')) {
  throw new Error('trend-rebuild.js must load after layout-hierarchy.js');
}
if (indexText.indexOf('assets/goal-progress-v2.js') < indexText.indexOf('assets/layout-hierarchy.js')) {
  throw new Error('goal-progress-v2.js must load after layout-hierarchy.js');
}

const chartBase = fs.readFileSync('assets/chart-display-fix.js', 'utf8');
const layout = fs.readFileSync('assets/layout-hierarchy.js', 'utf8');
const goal = fs.readFileSync('assets/goal-progress-v2.js', 'utf8');
const ranges = fs.readFileSync('assets/range-controls.js', 'utf8');
const trend = fs.readFileSync('assets/trend-rebuild.js', 'utf8');

if (chartBase.includes('Chart.getChart') || chartBase.includes('.s-range-controls')) {
  throw new Error('chart-display-fix.js must not own trend chart/range logic');
}
if (layout.includes('Chart.getChart')) {
  throw new Error('layout-hierarchy.js must not own Chart.js rendering');
}
for (const token of ['เป้า','ลดแล้ว','เพิ่มแล้ว','kg/สัปดาห์','weeklySeries','latestClosedWeek']) {
  if (!goal.includes(token)) throw new Error(`goal-progress-v2.js missing ${token}`);
}
for (const token of ['ครั้งก่อน','สัปดาห์','เดือนนี้','6 เดือน','ปีนี้','ตั้งแต่เริ่ม','10000','removeAttribute(\'disabled\')']) {
  if (!ranges.includes(token)) throw new Error(`range-controls.js missing ${token}`);
}
if (!trend.includes('dailySeries') || !trend.includes('weeklySeries') || !trend.includes('monthlySeries')) {
  throw new Error('trend-rebuild.js must support daily, weekly and monthly aggregation');
}
if (!trend.includes("graphMode:'daily'") || !trend.includes("graphMode:'weekly'") || !trend.includes("graphMode:'monthly'")) {
  throw new Error('trend-rebuild.js must map ranges to scaled graph granularity');
}
if (!trend.includes("render(1)")) {
  throw new Error('trend-rebuild.js must default to previous-scan view');
}
if (trend.includes('forecast') || trend.includes('borderDash')) {
  throw new Error('trend-rebuild.js must not draw forecast lines');
}

console.log('Tracker validation OK');
console.log(`Source pages: ${files.length}`);
console.log(`Legacy scans: ${tracker.DATA.length}`);
console.log(`NDJSON scans: ${extraScans.length}`);
console.log(`Total scans: ${combined.length}`);
console.log(`Latest: ${combined.at(-1).measuredAt}`);
console.log(`Runtime latest date: ${combined.at(-1).isoDate}`);
console.log('Goal progress: target + achieved + latest weekly rate + ETA');
console.log('Fast update path: static UI cached; only scans.ndjson is fresh per scan');
console.log('Trend controls: all 6 canonical ranges enabled, including since-start');
console.log('Trend granularity: week/month=daily, 6M/year=weekly, since-start=monthly');
