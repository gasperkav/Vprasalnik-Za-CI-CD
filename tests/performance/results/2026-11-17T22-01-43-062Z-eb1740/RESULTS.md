# Izmerjeni rezultati

Run: 2026-11-17T22-01-43-062Z-eb1740; UTC. Načrt SHA-256: 1d231cc271ca2d2d3030059caa8db668d095ac91c8b0febc364970d552ba27e2.

| Test/faza | VU | Čas s | req/s | Povp. ms | p95 ms | p99 ms | Napake % | Cikli | Napake ciklov |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| smoke/smoke | 1 | 3.001 | 15.995 | 30.683 | 73.905 | 112.185 | 0 | 8 | 0 |
| load/ramp-up-1 | 1 | 5.003 | 5.996 | 28.992 | 80.093 | 83.059 | 0 | 5 | 0 |
| load/ramp-up-3 | 3 | 5.267 | 17.086 | 40.023 | 117.032 | 175.613 | 0 | 15 | 0 |
| load/ramp-up-5 | 5 | 5.233 | 28.664 | 39.507 | 114.534 | 144.587 | 0 | 25 | 0 |
| load/steady | 5 | 60.002 | 25.099 | 33.843 | 94.321 | 128.876 | 0 | 251 | 0 |
| load/ramp-down-5 | 5 | 5.147 | 29.142 | 35.762 | 94.807 | 129.929 | 0 | 25 | 0 |
| load/ramp-down-3 | 3 | 5.006 | 14.384 | 44.472 | 121.761 | 270.991 | 0 | 12 | 0 |
| load/ramp-down-1 | 1 | 5.012 | 5.985 | 29.912 | 71.349 | 77.951 | 0 | 5 | 0 |
| stress/stress-5 | 5 | 24.945 | 88.595 | 48.533 | 104.847 | 161.147 | 0.226 | 372 | 5 |
| stress/stress-10 | 10 | 24.937 | 111.119 | 76.034 | 138.793 | 225.562 | 0.577 | 471 | 16 |
| stress/stress-20 | 20 | 24.022 | 131.882 | 130.911 | 342.843 | 684.259 | 0.758 | 541 | 24 |
| stress/stress-40 | 40 | 22.53 | 114.69 | 313.821 | 1438.922 | 1745.497 | 0.348 | 435 | 9 |
| stress/stress-80 | 80 | 23.796 | 114.346 | 678.199 | 3673.158 | 4567.281 | 0.331 | 460 | 9 |
| stress/stress-160 | 160 | 24.04 | 106.863 | 1374.64 | 5004.76 | 5052.617 | 9.809 | 600 | 249 |
| stress/recovery | 5 | 31.493 | 22.862 | 51.592 | 126.149 | 414.506 | 0 | 120 | 0 |

```json
{
  "load": "PASS",
  "stress": "PASS",
  "firstStressSloBreachVus": 20,
  "plateauVus": 20,
  "generatorValid": true,
  "memoryLeak": "NOT_ASSESSED",
  "targetResourceTelemetry": "UNAVAILABLE",
  "runningBuildMatchesSource": "UNVERIFIED",
  "stoppedBySafety": false
}
```
