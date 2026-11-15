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

// Smoke-test concise weekly coach decisions, independent of manual adherence prompts.
const weeklySource = fs.readFileSync('assets/weekly-history-v23.js', 'utf8');
const session = {window:{}, document:{readyState:'loading',addEventListener(){}}};
new vm.Script(weeklySource,{filename:'assets/weekly-history-v23.js'}).runInNewContext(session);
const weekly=session.window.JackyWeeklyResponse;
if(!weekly||typeof weekly.assess!=='function')throw new Error('Weekly response API missing');
const makeWeek=(start,weight,days=4,extra={})=>{
 const epoch=Date.parse(start+'T00:00:00Z');
 return Array.from({length:days},(_,i)=>{
  const isoDate=new Date(epoch+i*86400000).toISOString().slice(0,10);
  return {isoDate,measuredAt:isoDate+'T08:00:00',height:178,weight,fat:16,muscle:59,bf:20,waterWeight:46.5,...extra};
 });
};
const first=makeWeek('2025-06-02',80);
const second=makeWeek('2025-06-09',79.9);
const third=makeWeek('2025-06-16',79.8);
const data=weekly.weeks([...first,...second,...third]);
const slow=weekly.assess(data,2);
if(slow.label!=='ลดช้ากว่าเป้า'||!slow.action.includes('10 นาที/ครั้ง'))throw new Error('Slow response must explicitly suggest 10 extra cardio minutes');
// A completed week with exactly three real weigh-ins must be a final review, not "waiting for 4 days".
const threeScanWeek=weekly.assess(weekly.weeks([...first,...second,...third.slice(0,3)]),2);
if(threeScanWeek.label!=='ลดช้ากว่าเป้า'||!threeScanWeek.valid)
 throw new Error('Three measured days must close a completed week with a valid weekly assessment');
const twoScanWeek=weekly.assess(weekly.weeks([...first,...second,...third.slice(0,2)]),2);
if(twoScanWeek.label!=='รอผลค่าเฉลี่ย')
 throw new Error('Two measured days still need a cautious assessment');
const sundayCloseSample=weekly.weeks([
 ...makeWeek('2026-11-02',79.4,4),
 ...['2026-11-13','2026-11-14','2026-11-15'].map((isoDate,i)=>({
  isoDate,measuredAt:isoDate+'T12:00:00',height:178,weight:[79.4,79.7,80.2][i],
  fat:[16.1,16.2,16.0][i],muscle:[58.9,59.2,59.9][i],bf:20,waterWeight:[46.3,46.5,47.1][i]
 }))
]);
if(!sundayCloseSample.at(-1).closed||sundayCloseSample.at(-1).count!==3)
 throw new Error('Sunday scan must close November 9-15 with exactly three scans');
const confirmedWeek=weekly.assess(sundayCloseSample,sundayCloseSample.length-1);
if(confirmedWeek.label==='รอผลค่าเฉลี่ย'||confirmedWeek.label==='สัปดาห์ยังไม่สิ้นสุด')
 throw new Error('November 9-15 must display a completed weekly review');
const sparse=weekly.assess(weekly.weeks([...first,...second.slice(0,3),...third]),2);
if(sparse.label!=='ลดช้ากว่าเป้า'||!sparse.valid)throw new Error('Three previous readings should allow a complete weekly comparison');
const missing=weekly.assess(weekly.weeks([...first,...second.slice(0,1),...third]),2);
if(missing.label==='ลดช้ากว่าเป้า')throw new Error('One prior scan is not sufficient to increase cardio');
const hydrated=weekly.assess(weekly.weeks([...first,...second,...makeWeek('2025-06-16',79.8,4,{waterWeight:47.2})]),2);
if(hydrated.label==='ลดช้ากว่าเป้า')throw new Error('Do not increase cardio amid large water shifts');
const muscleLoss=weekly.assess(weekly.weeks([...first,...second,...makeWeek('2025-06-16',79.8,4,{muscle:58.3})]),2);
if(muscleLoss.label==='ลดช้ากว่าเป้า')throw new Error('Protect recovery when muscle BIA sharply drops');
const good=weekly.assess(weekly.weeks([...first,...second,...makeWeek('2025-06-16',79.5)]),2);
if(good.label!=='ลดตามเป้า')throw new Error('Target-range weight loss must keep the plan');
const changedHeight=weekly.assess(weekly.weeks([...first,...second,...makeWeek('2025-06-16',79.8,4,{height:176})]),2);
if(changedHeight.d.fat!==null||changedHeight.d.muscle!==null)throw new Error('BIA must not be compared across height changes');
if(weeklySource.includes('ทำตามแผนสัปดาห์นี้ครบไหม?'))throw new Error('Weekly review still contains unwanted adherence question');

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
