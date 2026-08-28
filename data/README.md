# Fast Fitdays data path

Historical scans through `2026-08-27T11:04:56` remain frozen in the legacy tracker source.

New scans are append-only in `data/scans.ndjson`, one JSON object per line, sorted by `measuredAt`.
The loader injects these records into `DATA` at runtime, so normal daily updates do not touch HTML/source pages or UI scripts.

## Normal update from a Fitdays screenshot

1. Read the screenshot and accept only `profileId: Jacky`.
2. Extract every readable Fitdays field; never guess unreadable values.
3. Check duplicates against legacy cutoff + `data/scans.ndjson` using both `measuredAt` and `sourceFile`.
4. Append exactly one JSON object line to `data/scans.ndjson`.
5. Do **not** edit `index.html`, `assets/source/**`, chart logic, layout logic, targets, or historical records for a normal scan update.
6. Commit to `main`; GitHub Pages deploys automatically.

The website derives the latest scan, THIS WEEK preview, Weekly Performance, monthly/long-range trends, Goal Progress, progress bars and ETA from `DATA` at runtime.

`LATEST_DATE` is derived from `DATA[DATA.length - 1]` at runtime.
