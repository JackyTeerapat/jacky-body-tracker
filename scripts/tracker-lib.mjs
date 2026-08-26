import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

export const ROOT = path.resolve(process.cwd());
export const INDEX_PATH = path.join(ROOT, 'index.html');
export const MAX_SOURCE_BYTES = 48_000;

export function readUtf8(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

export function parseLoaderFiles(indexText = readUtf8(INDEX_PATH)) {
  const match = indexText.match(/\bconst\s+files\s*=\s*(\[[\s\S]*?\])\s*;/);
  if (!match) throw new Error('Cannot find loader files[] in index.html');
  const files = JSON.parse(match[1]);
  if (!Array.isArray(files) || files.length === 0) throw new Error('Loader files[] is empty');
  return files;
}

export function loadSource(files = parseLoaderFiles()) {
  const parts = files.map((rel) => {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) throw new Error(`Loader references missing file: ${rel}`);
    return { rel, abs, text: readUtf8(abs) };
  });
  return { parts, source: parts.map((p) => p.text).join('') };
}

export function evaluateTracker(source) {
  const start = source.indexOf('const DATA');
  const sentinel = source.indexOf('/* ❌ ห้ามแก้ใต้นี้ */', start);
  if (start < 0 || sentinel < 0) throw new Error('Cannot locate DATA block/sentinel');

  let prelude = source.slice(start, sentinel);
  prelude = prelude
    .replace(/\bconst\s+DATA\s*=/, 'globalThis.DATA =')
    .replace(/\bconst\s+TARGET\s*=/, 'globalThis.TARGET =')
    .replace(/\bconst\s+MUSCLE_TARGET\s*=/, 'globalThis.MUSCLE_TARGET =')
    .replace(/\bconst\s+TOTAL_DAYS\s*=/, 'globalThis.TOTAL_DAYS =')
    .replace(/\bconst\s+LATEST_DATE\s*=/, 'globalThis.LATEST_DATE =')
    .replace(/window\.__JACKY_TRACKER__\s*=/, 'globalThis.__JACKY_TRACKER__ =');

  const context = {};
  vm.runInNewContext(prelude, context, { timeout: 1500 });
  if (!Array.isArray(context.DATA)) throw new Error('DATA did not evaluate to an array');
  return context;
}

export function assertNewScan(scan, existingData = []) {
  if (!scan || typeof scan !== 'object' || Array.isArray(scan)) throw new Error('Scan must be one JSON object');
  const required = ['isoDate', 'measuredAt', 'time', 'profileId', 'sourceFile', 'weight', 'fat', 'bf', 'muscle'];
  for (const key of required) {
    if (scan[key] === undefined || scan[key] === null || scan[key] === '') throw new Error(`Missing required field: ${key}`);
  }
  if (scan.profileId !== 'Jacky') throw new Error(`Rejected profileId: ${scan.profileId}`);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(scan.measuredAt)) throw new Error('measuredAt must be YYYY-MM-DDTHH:mm:ss');
  if (scan.isoDate !== scan.measuredAt.slice(0, 10)) throw new Error('isoDate must match measuredAt date');
  if (scan.time !== scan.measuredAt.slice(11)) throw new Error('time must match measuredAt time');

  const numeric = ['weight', 'fat', 'bf', 'muscle'];
  for (const key of numeric) if (!Number.isFinite(Number(scan[key]))) throw new Error(`${key} must be numeric`);

  const duplicateTime = existingData.find((d) => d?.measuredAt === scan.measuredAt);
  if (duplicateTime) throw new Error(`Duplicate measuredAt: ${scan.measuredAt}`);
  const duplicateFile = existingData.find((d) => d?.sourceFile && d.sourceFile === scan.sourceFile);
  if (duplicateFile) throw new Error(`Duplicate sourceFile: ${scan.sourceFile}`);

  const last = existingData.at(-1);
  if (last?.measuredAt && scan.measuredAt <= last.measuredAt) {
    throw new Error(`Scan must be newer than latest measuredAt (${last.measuredAt})`);
  }
}

export function validateData(data, latestDate) {
  if (!Array.isArray(data) || data.length === 0) throw new Error('DATA is empty');

  const seenTimes = new Set();
  const seenFiles = new Set();
  let previousTime = '';
  for (let i = 0; i < data.length; i += 1) {
    const d = data[i];
    if (!d || typeof d !== 'object') throw new Error(`DATA[${i}] is not an object`);
    if (d.profileId != null && d.profileId !== 'Jacky') throw new Error(`DATA[${i}] has non-Jacky profileId`);

    if (d.measuredAt) {
      if (seenTimes.has(d.measuredAt)) throw new Error(`Duplicate measuredAt in DATA: ${d.measuredAt}`);
      seenTimes.add(d.measuredAt);
      if (previousTime && d.measuredAt <= previousTime) throw new Error(`measuredAt is not strictly increasing at DATA[${i}]`);
      previousTime = d.measuredAt;
    }
    if (d.sourceFile) {
      if (seenFiles.has(d.sourceFile)) throw new Error(`Duplicate sourceFile in DATA: ${d.sourceFile}`);
      seenFiles.add(d.sourceFile);
    }
  }

  const latest = data.at(-1);
  assertNewScanShapeOnly(latest);
  if (latestDate !== latest.isoDate) throw new Error(`LATEST_DATE=${latestDate} but latest isoDate=${latest.isoDate}`);
}

function assertNewScanShapeOnly(scan) {
  const required = ['isoDate', 'measuredAt', 'time', 'profileId', 'sourceFile', 'weight', 'fat', 'bf', 'muscle'];
  for (const key of required) {
    if (scan?.[key] === undefined || scan?.[key] === null || scan?.[key] === '') throw new Error(`Latest scan missing required field: ${key}`);
  }
  if (scan.profileId !== 'Jacky') throw new Error(`Latest scan profileId must be Jacky`);
  if (scan.isoDate !== String(scan.measuredAt).slice(0, 10)) throw new Error('Latest isoDate does not match measuredAt');
  if (scan.time !== String(scan.measuredAt).slice(11)) throw new Error('Latest time does not match measuredAt');
}

export function findTailPart(parts) {
  const matches = parts.filter((p) => /\bconst\s+TARGET\s*=/.test(p.text) && /\bconst\s+LATEST_DATE\s*=/.test(p.text));
  if (matches.length !== 1) throw new Error(`Expected exactly one DATA tail file, found ${matches.length}`);
  return matches[0];
}

export function formatScan(scan) {
  return JSON.stringify(scan, null, 2)
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');
}

export function insertIntoTail(tailText, scan) {
  const targetPos = tailText.search(/\bconst\s+TARGET\s*=/);
  if (targetPos < 0) throw new Error('Tail file has no TARGET constant');
  const closePos = tailText.lastIndexOf('];', targetPos);
  if (closePos < 0) throw new Error('Tail file has no DATA closing ]; before TARGET');

  const before = tailText.slice(0, closePos).replace(/\s*$/, '');
  const after = tailText.slice(closePos);
  const withRecord = `${before},\n${formatScan(scan)}\n${after}`;
  return withRecord.replace(/(\bconst\s+LATEST_DATE\s*=\s*)'[^']*'/, `$1'${scan.isoDate}'`);
}

export function nextSourceName(files) {
  const nums = files
    .map((f) => f.match(/^assets\/source\/page-(\d+)\.html$/))
    .filter(Boolean)
    .map((m) => Number(m[1]));
  const next = Math.max(...nums) + 1;
  return `assets/source/page-${String(next).padStart(3, '0')}.html`;
}

export function updateLoaderIndex(indexText, afterFile, newFile) {
  const files = parseLoaderFiles(indexText);
  const at = files.indexOf(afterFile);
  if (at < 0) throw new Error(`Tail file not present in loader: ${afterFile}`);
  files.splice(at + 1, 0, newFile);
  const replacement = `const files=${JSON.stringify(files)};`;
  return indexText.replace(/\bconst\s+files\s*=\s*\[[\s\S]*?\]\s*;/, replacement);
}
