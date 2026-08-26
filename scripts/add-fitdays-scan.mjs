#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  INDEX_PATH,
  MAX_SOURCE_BYTES,
  assertNewScan,
  evaluateTracker,
  findTailPart,
  formatScan,
  insertIntoTail,
  loadSource,
  nextSourceName,
  parseLoaderFiles,
  readUtf8,
  updateLoaderIndex,
  validateData,
} from './tracker-lib.mjs';

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node scripts/add-fitdays-scan.mjs path/to/scan.json');
  process.exit(64);
}

const scan = JSON.parse(fs.readFileSync(path.resolve(inputPath), 'utf8'));
const loaderFiles = parseLoaderFiles();
const { parts, source } = loadSource(loaderFiles);
const tracker = evaluateTracker(source);
assertNewScan(scan, tracker.DATA);

const tail = findTailPart(parts);
const nextTailText = insertIntoTail(tail.text, scan);

if (Buffer.byteLength(nextTailText, 'utf8') <= MAX_SOURCE_BYTES) {
  fs.writeFileSync(tail.abs, nextTailText, 'utf8');
  console.log(`Updated ${tail.rel}`);
} else {
  // Only when the current data-tail page is full: keep DATA open in the old page,
  // create a new source page for the new record + constants, and update loader order.
  const targetPos = tail.text.search(/\bconst\s+TARGET\s*=/);
  const closePos = tail.text.lastIndexOf('];', targetPos);
  const prefix = tail.text.slice(0, closePos).replace(/\s*$/, '');
  let suffix = tail.text.slice(closePos);
  suffix = suffix.replace(/(\bconst\s+LATEST_DATE\s*=\s*)'[^']*'/, `$1'${scan.isoDate}'`);

  const newRel = nextSourceName(loaderFiles);
  const newAbs = path.resolve(newRel);
  fs.mkdirSync(path.dirname(newAbs), { recursive: true });
  fs.writeFileSync(tail.abs, `${prefix},\n`, 'utf8');
  fs.writeFileSync(newAbs, `${formatScan(scan)}\n${suffix}`, 'utf8');

  const indexText = readUtf8(INDEX_PATH);
  fs.writeFileSync(INDEX_PATH, updateLoaderIndex(indexText, tail.rel, newRel), 'utf8');
  console.log(`Split full tail: ${tail.rel} -> ${newRel}`);
}

// Re-read everything after mutation and fail immediately if the generated repo is invalid.
const finalFiles = parseLoaderFiles();
const finalSource = loadSource(finalFiles).source;
const finalTracker = evaluateTracker(finalSource);
validateData(finalTracker.DATA, finalTracker.LATEST_DATE);
console.log(`OK: ${scan.measuredAt} / ${scan.sourceFile}`);
