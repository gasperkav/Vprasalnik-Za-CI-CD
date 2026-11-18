# Izmerjeni rezultati

Run: 2026-11-18T07-05-44-345Z-42f9d6; UTC. Načrt SHA-256: 1d231cc271ca2d2d3030059caa8db668d095ac91c8b0febc364970d552ba27e2.

| Test/faza | VU | Čas s | req/s | Povp. ms | p95 ms | p99 ms | Napake % | Cikli | Napake ciklov |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| smoke/smoke | 1 | 3.05 | 17.705 | 25.443 | 63.646 | 83.477 | 0 | 9 | 0 |
| load/ramp-up-1 | 1 | 5.006 | 5.993 | 21.085 | 64.016 | 67.948 | 0 | 5 | 0 |
| load/ramp-up-3 | 3 | 5.001 | 17.997 | 22.281 | 63.905 | 78.65 | 0 | 15 | 0 |
| load/ramp-up-5 | 5 | 5.015 | 29.911 | 26.014 | 82.919 | 107.054 | 0 | 25 | 0 |
| load/steady | 5 | 60.005 | 25.498 | 30.783 | 89.881 | 155.581 | 0 | 255 | 0 |
| load/ramp-down-5 | 5 | 5.005 | 29.972 | 27.031 | 71.71 | 155.037 | 0 | 25 | 0 |
| load/ramp-down-3 | 3 | 5.005 | 17.981 | 21.907 | 63.72 | 66.25 | 0 | 15 | 0 |
| load/ramp-down-1 | 1 | 5.006 | 5.993 | 20.112 | 60.252 | 61.113 | 0 | 5 | 0 |
| stress/stress-5 | 5 | 20.205 | 238.164 | 20.744 | 68.012 | 81.733 | 0 | 802 | 0 |
| stress/stress-10 | 10 | 20.158 | 296.153 | 33.499 | 90.28 | 120.117 | 0 | 995 | 0 |
| stress/stress-20 | 20 | 20.153 | 305.767 | 64.966 | 253.519 | 327.423 | 0 | 1027 | 0 |
| stress/stress-40 | 40 | 20.509 | 304.26 | 130.342 | 613.363 | 685.013 | 0 | 1040 | 0 |
| stress/stress-80 | 80 | 21.596 | 240.883 | 327.214 | 1733.969 | 2431.687 | 0 | 867 | 0 |
| stress/stress-160 | 160 | 23.344 | 157.298 | 943.616 | 4915.822 | 5002.29 | 2.124 | 622 | 78 |
| stress/recovery | 5 | 30.089 | 26.322 | 24.888 | 71.432 | 104.003 | 0 | 132 | 0 |

```json
{
  "load": "PASS",
  "stress": "FAIL",
  "firstStressSloBreachVus": 20,
  "plateauVus": 20,
  "firstStressJourneyErrorBreachVus": 160,
  "generatorValid": true,
  "memoryLeak": "NOT_ASSESSED",
  "targetResourceTelemetry": "UNAVAILABLE",
  "runningBuildMatchesSource": "UNVERIFIED",
  "stoppedBySafety": false
}
```
