#!/usr/bin/env node
import fs from 'node:fs';

const FILE = 'data/scans.ndjson';
const LEGACY_CUTOFF = '2026-08-27T11:04:56';
const LEGACY_SOURCE_FILE = '1000076357.png';

const raw = fs.existsSync(FILE) ? fs.readFileSync(FILE, 'utf8') : '';
const lines = raw.split(/\r?\n/).map(line => line.trim()).filter(Boolean);

const scans = [];
const seenTimes = new Set([LEGACY_CUTOFF]);
const seenFiles = new Set([LEGACY_SOURCE_FILE]);
let previousTime = LEGACY_CUTOFF;

for (let index = 0; index < lines.length; index += 1) {
  let scan;
  try {
    scan = JSON.parse(lines[index]);
  } catch (error) {
    throw new Error(`Invalid JSON at ${FILE}:${index + 1}: ${error.message}`);
  }

  const required = ['isoDate', 'measuredAt', 'time', 'profileId', 'sourceFile', 'weight', 'fat', 'bf', 'muscle', 'daysFromStart'];
  for (const key of required) {
    if (scan[key] === undefined || scan[key] === null || scan[key] === '') {
      throw new Error(`Missing ${key} at ${FILE}:${index + 1}`);
    }
  }

  if (scan.profileId !== 'Jacky') throw new Error(`Rejected profileId at line ${index + 1}: ${scan.profileId}`);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(scan.measuredAt)) {
    throw new Error(`Invalid measuredAt at line ${index + 1}`);
  }
  if (scan.isoDate !== scan.measuredAt.slice(0, 10)) throw new Error(`isoDate mismatch at line ${index + 1}`);
  if (scan.time !== scan.measuredAt.slice(11)) throw new Error(`time mismatch at line ${index + 1}`);

  for (const key of ['weight', 'fat', 'bf', 'muscle', 'daysFromStart']) {
    if (!Number.isFinite(Number(scan[key]))) throw new Error(`${key} must be numeric at line ${index + 1}`);
  }

  if (seenTimes.has(scan.measuredAt)) throw new Error(`Duplicate measuredAt: ${scan.measuredAt}`);
  if (seenFiles.has(scan.sourceFile)) throw new Error(`Duplicate sourceFile: ${scan.sourceFile}`);
  if (scan.measuredAt <= previousTime) {
    throw new Error(`Scans must be strictly increasing; ${scan.measuredAt} <= ${previousTime}`);
  }

  seenTimes.add(scan.measuredAt);
  seenFiles.add(scan.sourceFile);
  previousTime = scan.measuredAt;
  scans.push(scan);
}

console.log(`Fast scan validation OK`);
console.log(`Legacy cutoff: ${LEGACY_CUTOFF}`);
console.log(`Append scans: ${scans.length}`);
if (scans.length) console.log(`Latest append: ${scans.at(-1).measuredAt}`);
