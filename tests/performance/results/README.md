# Evidenca izvedb

| Imenik | Namen |
|---|---|
| `2026-11-17T22-00-56-066Z-dae5b6` | Začetni smoke in preverjanje testnega ogrodja |
| `2026-11-17T22-01-43-062Z-eb1740` | Prva polna poskusna izvedba; med začetnimi fazami je tekel tudi obstoječi unit suite. Ni referenčna meritev |
| `2026-11-17T22-07-12-551Z-3f2aa2` | Končna referenčna izvedba z enakim načrtom in pragovi, brez dodatnih sočasnih projektnih testov |
| `2026-11-18T07-05-44-345Z-42f9d6` | Poznejša ponovitev: ST-01 PASS, ST-02 FAIL zaradi enega neuspešnega health vzorca pri 160 VU; recovery PASS |

Vsi imeniki ohranijo izvorne rezultate, čas in hash uporabljene revizije ogrodja.
Med prvima izvedbama in končno je bilo izboljšano shranjevanje sintetičnega profila
po ciljnem naslovu ter dodan prikaz prve kršitve merila napak celotnih ciklov.
Obremenitveni načrt in številčni kriteriji so ostali enaki. Kontrola hash trenutne
kode v `audit-results.mjs` je namenjena končni izvedbi; starejši različici kode
pričakovano nimata istega SHA-256.

Glavno poročilo: [`README_ZK_4.md`](../../../README_ZK_4.md).
