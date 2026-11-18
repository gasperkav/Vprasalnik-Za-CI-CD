# Izmerjeni rezultati

Run: 2026-11-18T09-11-11-736Z-d52349; UTC. Načrt SHA-256: 1d231cc271ca2d2d3030059caa8db668d095ac91c8b0febc364970d552ba27e2.

| Test/faza | VU | Čas s | req/s | Povp. ms | p95 ms | p99 ms | Napake % | Cikli | Napake ciklov |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| smoke/smoke | 1 | 3.179 | 18.871 | 22.157 | 59.977 | 67.753 | 0 | 10 | 0 |
| load/ramp-up-1 | 1 | 5.006 | 5.993 | 20.469 | 56.295 | 57.192 | 0 | 5 | 0 |
| load/ramp-up-3 | 3 | 5 | 18 | 23.749 | 66.952 | 72.378 | 0 | 15 | 0 |
| load/ramp-up-5 | 5 | 5.14 | 31.515 | 24.037 | 67.663 | 72.854 | 0 | 27 | 0 |
| load/steady | 5 | 60.068 | 26.67 | 21.064 | 61.522 | 70.777 | 0 | 267 | 0 |
| load/ramp-down-5 | 5 | 5.004 | 29.975 | 22.578 | 63.317 | 68.104 | 0 | 25 | 0 |
| load/ramp-down-3 | 3 | 5.024 | 17.912 | 21.22 | 60.345 | 63.456 | 0 | 15 | 0 |
| load/ramp-down-1 | 1 | 5.013 | 5.984 | 19.844 | 57.211 | 60.208 | 0 | 5 | 0 |
| stress/stress-5 | 5 | 20.12 | 295.828 | 16.736 | 61.265 | 66.709 | 0 | 992 | 0 |
| stress/stress-10 | 10 | 20.092 | 409.124 | 24.266 | 67.168 | 76.668 | 0 | 1370 | 0 |
| stress/stress-20 | 20 | 20.193 | 392.207 | 50.649 | 201.433 | 242.042 | 0 | 1320 | 0 |
| stress/stress-40 | 40 | 20.578 | 354.843 | 111.336 | 535.49 | 606.505 | 0 | 1217 | 0 |
| stress/stress-80 | 80 | 20.995 | 301.498 | 258.492 | 1374.895 | 1585.723 | 0 | 1055 | 0 |
| stress/stress-160 | 160 | 23.706 | 239.179 | 658.782 | 3791.307 | 4920.497 | 0.106 | 945 | 6 |
| stress/recovery | 5 | 30.013 | 26.988 | 22.248 | 63.935 | 68.155 | 0 | 135 | 0 |

```json
{
  "load": "PASS",
  "stress": "FAIL",
  "firstStressSloBreachVus": 20,
  "plateauVus": 20,
  "firstStressJourneyErrorBreachVus": null,
  "generatorValid": true,
  "memoryLeak": "NOT_ASSESSED",
  "targetResourceTelemetry": "UNAVAILABLE",
  "runningBuildMatchesSource": "UNVERIFIED",
  "stoppedBySafety": false
}
```
