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
  'assets/trend-rebuild.js',
  'assets/detail-range-sync.js',
  'assets/weekly-history-v23.js'
];

for (const file of uiScripts) {
  const code = fs.readFileSync(file, 'utf8');
  new vm.Script(code, { filename: file });
}

// Smoke-test actual weekly review decisions with synthetic, completed weeks.
const weeklySource = fs.readFileSync('assets/weekly-history-v23.js', 'utf8');
const yesKeys = new Set(['2025-06-09','2025-06-16'].map(k => 'jacky-trainer-adherence-v2:' + k));
const noKeys = new Set();
const session = {
  window: {},
  document: { readyState: 'loading', addEventListener() {} },
  localStorage: { getItem(key) { return yesKeys.has(key) ? '{"status":"yes","missed":[]}' : noKeys.has(key) ? '{"status":"no","missed":["cardio"]}' : null; } },
};
new vm.Script(weeklySource, { filename: 'assets/weekly-history-v23.js' }).runInNewContext(session);
const weekly = session.window.JackyWeeklyResponse;
if (!weekly || typeof weekly.assess !== 'function') throw new Error('Weekly response API missing');
const sample = [];
for (const [start, weight] of [['2025-06-02', 80], ['2025-06-09', 79.9], ['2025-06-16', 79.8]]) {
  const epoch = Date.parse(start + 'T00:00:00Z');
  for (let n = 0; n < 4; n++) {
    const isoDate = new Date(epoch + n * 86400000).toISOString().slice(0, 10);
    sample.push({ isoDate, measuredAt: isoDate + 'T08:00:00', height: 178, weight, fat: 16.0, muscle: 59.0, bf: 20, waterWeight: 46.5 });
  }
}
const threeWeeks = weekly.weeks(sample);
const reviewed = weekly.assess(threeWeeks, 2);
if (reviewed.label?.startsWith('ปรับ Cardio') !== true || !reviewed.action.includes('10 นาที')) {
  throw new Error('Weekly response should suggest a small cardio change after confirmed, repeated stalls');
}
yesKeys.clear();
// One verified under-target week is sufficient for a SMALL conditional adjustment.
yesKeys.add('jacky-trainer-adherence-v2:2025-06-16');
const firstSlowWeek = weekly.assess(threeWeeks, 2);
if (firstSlowWeek.label?.startsWith('ปรับ Cardio') !== true || !firstSlowWeek.action.includes('10 นาที')) {
  throw new Error('A confirmed slow week must trigger a small Cardio adjustment without waiting for 2 bad weeks');
}
yesKeys.clear();
const conditional = weekly.assess(threeWeeks, 2);
if (conditional.label?.startsWith('ปรับ Cardio') === true) {
  throw new Error('Weekly response must not auto-adjust without adherence confirmation');
}
if (!conditional.action.includes('เพิ่ม Zone 2')) {
  throw new Error('Unknown adherence must provide actionable conditional advice, not only keep plan');
}
noKeys.add('jacky-trainer-adherence-v2:2025-06-16');
const missed = weekly.assess(threeWeeks, 2);
if (missed.label !== 'กลับมาทำแผนให้ครบ') throw new Error('Missed weekly plan must be corrected before increasing activity');
noKeys.clear();
yesKeys.add('jacky-trainer-adherence-v2:2025-06-16');
const waterChanged = sample.map(x => x.isoDate >= '2025-06-16' ? { ...x, waterWeight: 47.2 } : x);
if (weekly.assess(weekly.weeks(waterChanged), 2).label?.startsWith('ปรับ Cardio') === true) {
  throw new Error('Do not increase Cardio on a large water shift');
}
const muscleDropped = sample.map(x => x.isoDate >= '2025-06-16' ? { ...x, muscle: 58.3 } : x);
if (weekly.assess(weekly.weeks(muscleDropped), 2).label?.startsWith('ปรับ Cardio') === true) {
  throw new Error('Do not increase Cardio when BIA muscle sharply falls');
}
const heightChanged = sample.map(x => x.isoDate < '2025-06-16' ? { ...x, height: 176 } : x);
if (weekly.assess(weekly.weeks(heightChanged), 2).label?.startsWith('ปรับ Cardio') === true) {
  throw new Error('Weekly response must not compare BIA across height calibration changes');
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
if (indexText.indexOf('assets/detail-range-sync.js') < indexText.indexOf('assets/trend-rebuild.js')) {
  throw new Error('detail-range-sync.js must load after trend-rebuild.js');
}

const chartBase = fs.readFileSync('assets/chart-display-fix.js', 'utf8');
const layout = fs.readFileSync('assets/layout-hierarchy.js', 'utf8');
const goal = fs.readFileSync('assets/goal-progress-v2.js', 'utf8');
const ranges = fs.readFileSync('assets/range-controls.js', 'utf8');
const trend = fs.readFileSync('assets/trend-rebuild.js', 'utf8');
const details = fs.readFileSync('assets/detail-range-sync.js', 'utf8');

if (chartBase.includes('Chart.getChart') || chartBase.includes('.s-range-controls')) {
  throw new Error('chart-display-fix.js must not own trend chart/range logic');
}
if (layout.includes('Chart.getChart')) {
  throw new Error('layout-hierarchy.js must not own Chart.js rendering');
}
for (const token of ['เป้า','ลดแล้ว','เพิ่มแล้ว','kg/สัปดาห์','weeklySeries','latestClosedWeek']) {
  if (!goal.includes(token)) throw new Error(`goal-progress-v2.js missing ${token}`);
}
for (const token of ['รายวัน','รายสัปดาห์','รายเดือน','removeAttribute(\'disabled\')']) {
  if (!ranges.includes(token)) throw new Error(`range-controls.js missing ${token}`);
}
for (const token of ['dailyBuckets','weeklyBuckets','monthlyBuckets','bucketSeries']) {
  if (!trend.includes(token)) throw new Error(`trend-rebuild.js missing ${token}`);
}
for (const token of ['zoomState','data-zoom','scroll หรือ +/− เพื่อ zoom']) {
  if (!trend.includes(token)) throw new Error(`trend-rebuild.js missing zoom support: ${token}`);
}
for (const token of ['FORECAST_SHARE = 0.30','forecastSeries','borderDash','กันพื้นที่ขวา 30% สำหรับคาดการณ์','เส้นประ = แนวโน้มเชิงเส้น']) {
  if (!trend.includes(token)) throw new Error(`trend-rebuild.js missing forecast support: ${token}`);
}
if (!trend.includes('render(1)')) {
  throw new Error('trend-rebuild.js must default to daily view');
}
for (const token of ['reference = D.length >= 2','เทียบผลวัดก่อนหน้า','updateMetricDiffs']) {
  if (!details.includes(token)) throw new Error(`detail-range-sync.js missing ${token}`);
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
console.log('Trend controls: daily / weekly / monthly resolution');
console.log('Trend graph: all available data with pan + zoom + 30% forecast space');
console.log('Latest-scan detail diffs: always compared with previous scan');
