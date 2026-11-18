# Izmerjeni rezultati

Run: 2026-11-17T22-07-12-551Z-3f2aa2; UTC. Načrt SHA-256: 1d231cc271ca2d2d3030059caa8db668d095ac91c8b0febc364970d552ba27e2.

| Test/faza | VU | Čas s | req/s | Povp. ms | p95 ms | p99 ms | Napake % | Cikli | Napake ciklov |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| smoke/smoke | 1 | 3.254 | 14.753 | 37.003 | 107.403 | 126.043 | 0 | 8 | 0 |
| load/ramp-up-1 | 1 | 5.079 | 5.906 | 34.96 | 117.096 | 181.217 | 0 | 5 | 0 |
| load/ramp-up-3 | 3 | 5.131 | 17.539 | 35.499 | 92.353 | 120.01 | 0 | 15 | 0 |
| load/ramp-up-5 | 5 | 5.008 | 23.963 | 45.722 | 113.731 | 138.669 | 0 | 20 | 0 |
| load/steady | 5 | 60.042 | 23.55 | 44.594 | 95.752 | 145.244 | 0.212 | 238 | 3 |
| load/ramp-down-5 | 5 | 9.315 | 12.453 | 135.324 | 415.511 | 1939.313 | 0.862 | 20 | 1 |
| load/ramp-down-3 | 3 | 9.114 | 7.461 | 126.606 | 158.316 | 5003.939 | 1.471 | 12 | 1 |
| load/ramp-down-1 | 1 | 5.173 | 6.959 | 27.12 | 72.657 | 86.583 | 0 | 6 | 0 |
| stress/stress-5 | 5 | 20.299 | 122.421 | 40.505 | 91.613 | 138.959 | 0.161 | 417 | 4 |
| stress/stress-10 | 10 | 24.139 | 126.971 | 67.111 | 151.368 | 443.837 | 0.294 | 516 | 9 |
| stress/stress-20 | 20 | 24.064 | 130.567 | 133.718 | 373.523 | 1548.043 | 0.541 | 534 | 17 |
| stress/stress-40 | 40 | 25.058 | 116.053 | 287.026 | 1228.286 | 1704.59 | 0.516 | 492 | 15 |
| stress/stress-80 | 80 | 25.056 | 116.657 | 558.076 | 2987.006 | 3460.606 | 0.445 | 494 | 13 |
| stress/stress-160 | 160 | 24.14 | 122.91 | 1203.373 | 5001.408 | 5033.888 | 5.73 | 602 | 169 |
| stress/recovery | 5 | 30.195 | 23.514 | 45.936 | 102.323 | 138.512 | 0.282 | 120 | 2 |

```json
{
  "load": "FAIL",
  "stress": "FAIL",
  "firstStressSloBreachVus": 20,
  "plateauVus": 10,
  "firstStressJourneyErrorBreachVus": 10,
  "generatorValid": true,
  "memoryLeak": "NOT_ASSESSED",
  "targetResourceTelemetry": "UNAVAILABLE",
  "runningBuildMatchesSource": "UNVERIFIED",
  "stoppedBySafety": false
}
```
