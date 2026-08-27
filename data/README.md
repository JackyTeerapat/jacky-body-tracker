# Fast Fitdays data path

Historical scans through `2026-08-27T11:04:56` remain frozen in the legacy tracker source.

New scans are append-only in `data/scans.ndjson`, one JSON object per line, sorted by `measuredAt`.
The loader injects these records into `DATA` at runtime, so normal daily updates do not touch HTML/source pages.

Daily update path:
1. Read only `data/scans.ndjson`.
2. Reject duplicate `measuredAt` or `sourceFile`.
3. Append one JSON line.
4. Commit to `main`.
5. GitHub Pages deploys automatically.

`LATEST_DATE` is derived from `DATA[DATA.length - 1]` at runtime.
