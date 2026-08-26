#!/usr/bin/env node
import { evaluateTracker, loadSource, parseLoaderFiles, validateData } from './tracker-lib.mjs';

const files = parseLoaderFiles();
const duplicates = files.filter((f, i) => files.indexOf(f) !== i);
if (duplicates.length) throw new Error(`Duplicate loader entries: ${[...new Set(duplicates)].join(', ')}`);

const { source } = loadSource(files);
const tracker = evaluateTracker(source);
validateData(tracker.DATA, tracker.LATEST_DATE);

console.log(`Tracker validation OK`);
console.log(`Source pages: ${files.length}`);
console.log(`Scans: ${tracker.DATA.length}`);
console.log(`Latest: ${tracker.DATA.at(-1).measuredAt}`);
console.log(`LATEST_DATE: ${tracker.LATEST_DATE}`);
