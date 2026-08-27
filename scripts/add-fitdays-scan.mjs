#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const DATA_FILE = path.resolve('data/scans.ndjson');
const LEGACY_CUTOFF = '2026-08-27T11:04:56';
const LEGACY_SOURCE_FILE = '1000076357.png';

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node scripts/add-fitdays-scan.mjs path/to/scan.json');
  process.exit(64);
}

const scan = JSON.parse(fs.readFileSync(path.resolve(inputPath), 'utf8'));
const required = ['isoDate', 'measuredAt', 'time', 'profileId', 'sourceFile', 'weight', 'fat', 'bf', 'muscle', 'daysFromStart'];
for (const key of required) {
  if (scan[key] === undefined || scan[key] === null || scan[key] === '') throw new Error(`Missing required field: ${key}`);
}
if (scan.profileId !== 'Jacky') throw new Error(`Rejected profileId: ${scan.profileId}`);
if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(scan.measuredAt)) throw new Error('measuredAt must be YYYY-MM-DDTHH:mm:ss');
if (scan.isoDate !== scan.measuredAt.slice(0, 10)) throw new Error('isoDate must match measuredAt date');
if (scan.time !== scan.measuredAt.slice(11)) throw new Error('time must match measuredAt time');

const raw = fs.existsSync(DATA_FILE) ? fs.readFileSync(DATA_FILE, 'utf8') : '';
const existing = raw.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(JSON.parse);
const latest = existing.at(-1);

if (scan.measuredAt <= (latest?.measuredAt || LEGACY_CUTOFF)) {
  throw new Error(`Scan must be newer than ${latest?.measuredAt || LEGACY_CUTOFF}`);
}
if (scan.measuredAt === LEGACY_CUTOFF || existing.some(item => item.measuredAt === scan.measuredAt)) {
  throw new Error(`Duplicate measuredAt: ${scan.measuredAt}`);
}
if (scan.sourceFile === LEGACY_SOURCE_FILE || existing.some(item => item.sourceFile === scan.sourceFile)) {
  throw new Error(`Duplicate sourceFile: ${scan.sourceFile}`);
}

fs.mkdirSync(path.dirname(DATA_FILE), {recursive: true});
fs.appendFileSync(DATA_FILE, JSON.stringify(scan) + '\n', 'utf8');
console.log(`Appended ${scan.measuredAt} / ${scan.sourceFile} to data/scans.ndjson`);
