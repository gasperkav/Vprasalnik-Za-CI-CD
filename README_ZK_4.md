# ZK 4 – Sistemsko in zmogljivostno testiranje

## Obseg in arhitektura

Sistem sestavljajo React/Vite, C++17 HTTP strežnik `cpp-httplib` in PostgreSQL prek
`libpqxx`. Izvorna koda določa 8 HTTP delovnih niti (`backend/src/main.cpp`) in 8
povezav do baze (`backend/include/cicdq/db.hpp`).

Pomembna ugotovitev pregleda: `src/api.js`, metoda `evaluate`, trenutno kliče
**lokalno JavaScript funkcijo** `evaluateAssessment`. React izračuna rezultat in
ga pošlje C++ backendu v `POST /api/pipelines`. Obstaja tudi javni C++ endpoint
`POST /api/assessment/evaluate`, vendar trenutni glavni tok Reacta ne uporablja
tega endpointa. Zato glavna testna pot posnema trenutno aplikacijo.

| Kritična pot | Razlog za vključitev |
|---|---|
| `GET /api/questionnaire/versions/1.0` | Rekonstrukcija drevesa vprašanj in možnosti iz DB; nujno za izpolnjevanje |
| `GET /api/rules/versions/1.0` | Prenos pravil za lokalni izračun zrelosti |
| `GET /api/pipelines` | JWT, branje uporabnikovih ocen in njihovih odgovorov |
| `POST /api/pipelines` | JWT, transakcija, zapis cevovoda in vseh odgovorov |
| `GET /api/pipelines/:id` | Preverjanje dejanskega zapisa in integritete odgovorov |
| `DELETE /api/pipelines/:id` | Sprotno čiščenje testnih podatkov, vključeno v merjeno obremenitev |
| `POST /api/assessment/evaluate` | Dodatno preverjanje pred obremenitvijo; ločen C++ izračun, izven merjene poti |

Ne testiramo izrisa v brskalniku, časa človekovega izpolnjevanja, TLS, Caddyja,
omrežja uporabnika ali horizontalnega skaliranja. To je sistemski HTTP test
dejanske lokalne storitve in baze, brez mockov ali offline fallbacka.

## Izbira orodja in omejitve okolja

Izvedeno orodje je priloženi **Node.js HTTP runner** v
[`tests/performance/run.mjs`](tests/performance/run.mjs). Uporablja samo standardne
module Node.js; dodatna namestitev in `npm install` za te teste nista potrebna.

| Orodje | Prednosti za projekt | Omejitev v tem okolju / odločitev |
|---|---|---|
| **Node.js HTTP runner – izbran** | Obstoječi Node, odvisni GET/POST/DELETE, JWT, isti lokalni izračun kot React, preverjanje shranjenih odgovorov, surov zapis vsake zahteve | Lastno ogrodje; posebej preverimo izračun metrik in zmogljivost generatorja. Zaprt VU model |
| **k6** | Uveljavljeno orodje, vgrajeni profili, pragovi, odprti in zaprti modeli | Ni nameščen; potrebuje ločen izvršni program ali delujoč Docker API. Pri manj omejenem okolju je primeren naslednji korak |
| **autocannon** | Optimiziran Node HTTP generator, povezave, rate limit, histogramske metrike | Ni nameščen; dejanski poskus `npm install --save-dev --save-exact autocannon@8.0.0` je odpovedal z `EACCES` pri dostopu do npm registry |

Docker CLI obstaja, vendar proces nima dostopa do Docker named pipe in uporabniške
konfiguracije. Backend na `http://127.0.0.1:3002` je bil že zagnan in dosegljiv;
uporabljena je bila ta dejanska storitev. Nismo je nadomestili s testnim strežnikom.
Izbrani runner je praktična izbira za dostopno okolje, ne splošna zamenjava za k6.

Uradna dokumentacija: [Node HTTP](https://nodejs.org/docs/latest-v20.x/api/http.html),
[autocannon](https://github.com/mcollina/autocannon),
[k6: odprti in zaprti modeli](https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/).

## Specifikacija pred izvedbo

Celotna vnaprejšnja specifikacija je v
[`SPECIFIKACIJA.md`](tests/performance/SPECIFIKACIJA.md), strojno berljivi profili in
številčni pragovi pa v [`plan.json`](tests/performance/plan.json). Načrt se pred
izvedbo kopira v rezultate in podpiše s SHA-256. Meje po ogledu rezultatov niso
bile znižane. Smoke preveri veljavnost celotnega toka pred večjo obremenitvijo.

**En cikel:** prenos vprašalnika → prenos pravil → seznam cevovodov → lokalni
izračun → oddaja ocene → ponovno branje vseh odgovorov → izbris testnega cevovoda.
To je šest merjenih HTTP zahtev, vključno s čiščenjem. Pred meritvijo se registrira
oziroma prijavi izključno namenski sintetični račun `zk_perf_*`.

Payload vsebuje 36 dejanskih ključev prenesenega vprašalnika: checkboxe, številke,
besedilo in polja možnosti, kjer tak tip obstaja. Numerična vrednost je 85,
multiselect uporabi prvi največ dve veljavni možnosti. Celoten dejansko uporabljeni
payload z vprašalnikom in pravili je v `fixture.json` posamezne izvedbe.

| Test | Cilj | Profil | Načrtovano trajanje |
|---|---|---|---:|
| **ST-01: obremenitev** | Odzivnost in pravilno shranjevanje pri predpostavljeni študijski uporabi | Ramp-up 1/3/5 VU po 5 s; 5 VU 60 s; ramp-down 5/3/1 VU po 5 s; 1000 ms premora po ciklu | 90 s |
| **ST-02: stres in okrevanje** | Najti mejo SLO oziroma plato ter preveriti okrevanje | 5/10/20/40/80/160 VU po 20 s brez premora; recovery 5 VU 30 s s 1000 ms premora | 150 s |

Vsaka faza ob koncu počaka že začete cikle. To podaljša dejanski čas in je vključeno
v merjeno prepustnost, ne skrito. Med testoma je 10 s premora. Rampanje je
stopničasto z zaključenimi cikli med fazami, ne zvezno. Pet uporabnikov je izrecna
predpostavka, saj produkcijske statistike uporabe niso na voljo.

| Merilo sprejemljivosti | Vnaprejšnja meja |
|---|---|
| HTTP odzivnost pri normalni obremenitvi | p95 <200 ms in p99 <500 ms: celoten ST-01, steady in vsaka pot v steady |
| HTTP napake in neuspešni celotni cikli | Oboje <1 % za ST-01 in recovery |
| Uspešna prepustnost steady | >=15 req/s |
| Integriteta odgovorov, nivoja, imena, repozitorija in različice | 0 neskladij |
| Dosegljivost | 0 neuspešnih vzorcev `/health`, vzorčenje približno 1 Hz |
| Zaključek | 0 preostalih cevovodov te izvedbe |
| Generator | CPU <90 % enega logičnega jedra in event-loop p99 <100 ms po fazi |
| Velikost vzorca | >=30 HTTP zahtev v vsaki glavni merjeni fazi in za vsako pot v steady |

Za ST-02 je preseganje HTTP SLO med stresom pričakovan rezultat. Testni cilj uspe,
če zaznamo mejo/plato, ohranimo integriteto in dosegljivost ter sistem v recovery
ponovno izpolni normalni SLO. To **ne pomeni**, da sistem pri 160 VU ustreza
odzivnostnim zahtevam. Višje stopnje se preskočijo po fazi z >=5 % HTTP napak;
po treh zaporednih neuspešnih health preverjanjih se ustavi dodajanje ciklov.

Model je zaprt: počasnejši cikel zmanjša hitrost novih prihodov. RPS je izmerjen
rezultat, ne obljubljena fiksna stopnja prihodov. p95/p99 ne ocenjujeta zakasnitev
pri nespremenljivem zunanjem RPS (coordinated omission). Retryjev ni; timeout je
absoluten 5000 ms. Latenca vključuje celoten odgovor in vsebinsko validacijo.
Napaka je nepričakovan status, napačna vsebina, transportna napaka ali timeout.
Tudi neuspešne zahteve so vključene v percentile. Zbirni percentili nastanejo iz
združenih surovih vzorcev, ne iz povprečenja percentilov posameznih faz.

## Zagon in ponovitev

V korenu projekta z nameščenim Node.js >=20 in dosegljivim backendom:

```powershell
node --version
npm run test:system:smoke
npm run test:system
```

Ločena testa:

```powershell
npm run test:system:load
npm run test:system:stress
```

Runner pred vsako izvedbo preveri health, pravo prijavo, zapis in ponovno branje
odgovorov. Sprejema samo HTTP loopback naslove. Lokalni profil s sintetičnim geslom
`.account-*.local` in zaklep `.runner.lock` sta izključena iz Gita. JWT ni v
rezultatih. VU-ji delijo namenski račun, uporabljajo ločene povezave in unikatne
cevovode. To ne meri raznolikosti več različnih računov ali velikih zgodovin ocen.

Za sveže izolirano okolje je pripravljena samostojna konfiguracija, ki uporablja
lasten Compose projekt in podatkovni nosilec ter vrata 18082:

```powershell
docker compose -f tests/performance/compose.yml up -d --build
$env:PERF_BASE_URL = 'http://127.0.0.1:18082'
npm run test:system
Remove-Item Env:PERF_BASE_URL
docker compose -f tests/performance/compose.yml down
```

Ta izolirana konfiguracija v tej seji zaradi nedostopnega Docker API ni bila
izvedena. Referenčne meritve se nanašajo na obstoječo storitev na vratih 3002.
Običajni `down` ohrani podatke. Ni potrebe po brisanju obstoječe baze aplikacije.
Za vsako ciljno origin se uporablja ločen sintetični profil. Testni račun ostane
za ponovne zagone; sproti se brišejo samo testni cevovodi.

Vsak zagon ustvari nov imenik v `tests/performance/results/`. `summary.json`
vsebuje strojno presojo, `RESULTS.md` tabelo, `raw.ndjson` posamezne zahteve/cikle,
health in vzorce virov, `console.txt` dejanski izpis, `environment.json` okolje in
SHA-256, `cleanup.json` končno čiščenje, `preflight.json` funkcionalne ugotovitve.
Napaka ali nepotrjeno zasičenje vrne izhodno kodo 1. Pri ST-02 je kršitev SLO med
stresom dovoljena po zgornji definiciji; zato uspešno okrevanje lahko da izhod 0.

Neodvisen ponovni izračun shranjenih metrik, brez nove obremenitve:

```powershell
node tests/performance/audit-results.mjs
# Ali izrecno navedite ime imenika izvedbe:
node tests/performance/audit-results.mjs IME_IZVEDBE
```

Preveri štetja, percentile po fazah in poteh, združene percentile, prepustnost,
SHA-256 trenutnih virov, odsotnost polj z gesli/JWT in zaključeno čiščenje. Če se
je koda po izvedbi spremenila, hash namenoma ne ustreza; rezultatov druge revizije
ne smemo predstavljati kot dokaz meritve trenutne kode.

## Referenčna izvedba, rezultati in presoja

### Okolje in sledljivost

Referenčna izvedba: **`2026-11-17T22-07-12-551Z-3f2aa2`**, 17. 11. 2026,
17. 11. 2026, 23:07:12–17. 11. 2026, 23:11:58 (Europe/Ljubljana, CET).
Surovi zapisi uporabljajo UTC. Referenčni git commit:
`a0bdec393448fae95cd43e2b0f26020e2fb31241`; pri zagonu so bile prisotne lokalne spremembe
testnega ogrodja, ki so dodatno identificirane s SHA-256.

| Lastnost | Dejansko ugotovljeno |
|---|---|
| OS | Windows 10 Home, 10.0.19045, x64 |
| CPU | Intel(R) Core(TM) i5-10300H CPU @ 2.50GHz, 8 logičnih jeder |
| RAM gostitelja | 7.871 GiB |
| Node generatorja | v20.19.6 |
| Cilj | `http://127.0.0.1:3002`, že delujoča lokalna storitev |
| C++ v virih | C++17, cpp-httplib 0.15.3, nlohmann/json 3.11.3 |
| C++ prevajalnik tekoče storitve | N/A – Docker API nedostopen |
| PostgreSQL v Compose / dejanska različica | `postgres:15-alpine` / N/A – Docker API nedostopen |
| CPU/RAM C++ in PostgreSQL, restart števec | N/A – ni dostopa do telemetrije ciljnih procesov |
| Načrt SHA-256 | `1d231cc271ca2d2d3030059caa8db668d095ac91c8b0febc364970d552ba27e2` |

Hash virov je dokaz, katera koda je bila analizirana, ne dokaz, iz katere revizije
je bila prevedena že zagnana storitev. Identiteta tekoče Docker slike ni bila
preverljiva. Izvedba je veljavna meritev dosegljive storitve, ne certificiran
benchmark sveže prevedene različice. Samostojna Compose izvedba je pripravljena
za nadaljnjo meritev v okolju z dostopnim Dockerjem.

Dokazi: [strojni povzetek](tests/performance/results/2026-11-17T22-07-12-551Z-3f2aa2/summary.json),
[surovi zapisi](tests/performance/results/2026-11-17T22-07-12-551Z-3f2aa2/raw.ndjson),
[dejanski izpis](tests/performance/results/2026-11-17T22-07-12-551Z-3f2aa2/console.txt),
[okolje in hashi](tests/performance/results/2026-11-17T22-07-12-551Z-3f2aa2/environment.json),
[dejanski payload](tests/performance/results/2026-11-17T22-07-12-551Z-3f2aa2/fixture.json),
[čiščenje](tests/performance/results/2026-11-17T22-07-12-551Z-3f2aa2/cleanup.json),
[preverjanje izračunov](tests/performance/results/2026-11-17T22-07-12-551Z-3f2aa2/audit.json).

### Zbirne metrike

| Test | Zahteve | Čas s | Povp. ms | p95 ms | p99 ms | req/s | HTTP napake % | Neuspešni cikli % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| ST-01 skupaj | 1874 | 98.862 | 52.332 | 111.602 | 201.817 | 18.956 | 0.267 | 1.582 |
| ST-02 skupaj (tudi recovery) | 18200 | 172.951 | 373.376 | 2987.862 | 5001.649 | 105.232 | 1.264 | 7.213 |

ST-01 ima 5 timeoutov in 5/316
neuspešnih ciklov (1.582 %).
ST-02 ima 230 timeoutov in 229/3175
neuspešnih ciklov. En cikel lahko vsebuje več neuspešnih zahtev; števili zato nista
nujno enaki. Vseh 235 neuspešnih HTTP zahtev obeh testov je bilo timeoutov, ne
odgovorov HTTP 500 ali zaznanih vsebinskih neskladij.

### Rezultati vsake faze

`req/s` vključuje vse končane zahteve, tudi neuspešne. Uspešna prepustnost je
ločeno v JSON poročilih. Časi vključujejo praznjenje že začetih ciklov.

| Test/faza | VU | Čas s | Zahteve | req/s | Povp. ms | p95 ms | p99 ms | HTTP napake % | Neuspešni cikli % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| smoke/smoke | 1 | 3.254 | 48 | 14.753 | 37.003 | 107.403 | 126.043 | 0.000 | 0.000 |
| load/ramp-up-1 | 1 | 5.079 | 30 | 5.906 | 34.960 | 117.096 | 181.217 | 0.000 | 0.000 |
| load/ramp-up-3 | 3 | 5.131 | 90 | 17.539 | 35.499 | 92.353 | 120.010 | 0.000 | 0.000 |
| load/ramp-up-5 | 5 | 5.008 | 120 | 23.963 | 45.722 | 113.731 | 138.669 | 0.000 | 0.000 |
| load/steady | 5 | 60.042 | 1414 | 23.550 | 44.594 | 95.752 | 145.244 | 0.212 | 1.261 |
| load/ramp-down-5 | 5 | 9.315 | 116 | 12.453 | 135.324 | 415.511 | 1939.313 | 0.862 | 5.000 |
| load/ramp-down-3 | 3 | 9.114 | 68 | 7.461 | 126.606 | 158.316 | 5003.939 | 1.471 | 8.333 |
| load/ramp-down-1 | 1 | 5.173 | 36 | 6.959 | 27.120 | 72.657 | 86.583 | 0.000 | 0.000 |
| stress/stress-5 | 5 | 20.299 | 2485 | 122.421 | 40.505 | 91.613 | 138.959 | 0.161 | 0.959 |
| stress/stress-10 | 10 | 24.139 | 3065 | 126.971 | 67.111 | 151.368 | 443.837 | 0.294 | 1.744 |
| stress/stress-20 | 20 | 24.064 | 3142 | 130.567 | 133.718 | 373.523 | 1548.043 | 0.541 | 3.184 |
| stress/stress-40 | 40 | 25.058 | 2908 | 116.053 | 287.026 | 1228.286 | 1704.590 | 0.516 | 3.049 |
| stress/stress-80 | 80 | 25.056 | 2923 | 116.657 | 558.076 | 2987.006 | 3460.606 | 0.445 | 2.632 |
| stress/stress-160 | 160 | 24.140 | 2967 | 122.910 | 1203.373 | 5001.408 | 5033.888 | 5.730 | 28.073 |
| stress/recovery | 5 | 30.195 | 710 | 23.514 | 45.936 | 102.323 | 138.512 | 0.282 | 1.667 |

ST-01 je trajal 98.862 s namesto načrtovanih 90 s.
ST-02 je trajal 172.951 s namesto 150 s. Razlika izvira iz
čakanja že začetih ciklov, zlasti zahtev s timeouti; premor med testoma in
predpriprava nista vključena v ti vsoti. Celotna referenčna izvedba, vključno
s predpripravo in premorom, je trajala približno
286.044 s.

### Poti pri polni normalni obremenitvi (steady, 5 VU)

| Pot | Zahteve | Povp. ms | p95 ms | p99 ms | HTTP napake % |
|---|---:|---:|---:|---:|---:|
| `GET /api/questionnaire/versions/1.0` | 238 | 75.652 | 68.156 | 115.499 | 0.840 |
| `GET /api/rules/versions/1.0` | 236 | 30.646 | 20.825 | 32.141 | 0.424 |
| `GET /api/pipelines` | 235 | 33.516 | 54.822 | 68.479 | 0.000 |
| `POST /api/pipelines` | 235 | 80.704 | 145.244 | 213.527 | 0.000 |
| `GET /api/pipelines/:id` | 235 | 34.867 | 57.974 | 66.643 | 0.000 |
| `DELETE /api/pipelines/:id` | 235 | 11.843 | 30.611 | 57.392 | 0.000 |

V steady so p95/p99 in deleži napak posameznih poti pod HTTP pragovi, vendar
**3 od 238 celotnih ciklov odpovejo (1,261 %)**. Merilo uporabniškega uspeha
je zato kršeno kljub sprejemljivemu p95. Vsi trije timeouti v steady so na prenosu
vprašalnika (2) in pravil (1); noben od teh treh ciklov ne pride do oddaje.

### Viri, dosegljivost in integriteta

| Meritev | Rezultat | Razlaga |
|---|---:|---|
| Health vzorci, vključno s smoke | 265 | Približno 1 Hz; pri počasnem health se vzorci ne prekrivajo |
| Neuspešni health | 0 | Izpad ni bil opažen; to ne izključuje kratkega izpada med vzorci ali restarta |
| Neskladja preverjanih podatkov | 0 | Primerjava vseh odgovorov, nivoja, imena, različice in repozitorija |
| Testni cevovodi po zaključnem čiščenju | 0 | Zaključno čiščenje je dodatno odstranilo 6 cevovodov po neuspelih sprotnih operacijah |
| Najvišji fazni CPU generatorja | 26.409 % enega jedra | Pod mejo 90 %; to ni CPU C++ backenda |
| Najvišji fazni event-loop p99 generatorja | 46.662 ms | Pod mejo 100 ms |
| Najvišji vzorčeni RSS generatorja | 77.859 MiB | Vključuje zbiranje surovih vzorcev v pomnilniku |
| Najmanj prostega RAM gostitelja | 256.480 MiB | Skupni lokalni računalnik ima malo rezerve |
| Poraba virov ciljnih procesov / dokaz odsotnosti puščanja | N/A | Za presojo potrebujemo ciljno telemetrijo in daljši soak test |

Preverjanje `audit-results.mjs` je uspešno: 24.169 surovih zapisov,
**20.122 merjenih HTTP zahtev** (48 smoke + 1.874 load + 18.200 stress), vseh 15
faz, preverjeni percentili, štetja, pretoki, hashi in čiščenje. Računski audit
**PASS** pomeni pravilno izračunane meritve; ne spremeni **FAIL** sistema.

### Primerjava z merili in končna presoja

| Preverjanje | Dejanski rezultat | Presoja |
|---|---|---|
| ST-01: skupni HTTP p95/p99 <200/<500 ms | 111,602 / 201,817 ms | PASS |
| ST-01: steady HTTP p95/p99 <200/<500 ms | 95,752 / 145,244 ms | PASS |
| ST-01: HTTP napake <1 % | Skupaj 0,267 %, steady 0,212 %; tudi vse poti steady <1 % | PASS |
| ST-01: uspešna prepustnost steady >=15 req/s | 23,500 req/s | PASS |
| ST-01: neuspešni celotni cikli <1 % | Skupaj 1,582 %, steady 1,261 % | **FAIL** |
| ST-02: zaznana meja/plato | Prvi plato po definiciji pri 10 VU; prva kršitev HTTP SLO pri 20 VU | Dosežen testni cilj |
| ST-02: odzivnost v recovery | p95 102,323 ms, p99 138,512 ms | PASS |
| ST-02: napake HTTP / ciklov v recovery <1 % | 0,282 % / **1,667 % (2/120)** | **FAIL za cikle** |
| Oba: integriteta, health, čiščenje in generator | Zastavljene preverljive meje izpolnjene | PASS |
| **Končni rezultat ST-01 / ST-02** | **FAIL / FAIL** | Sistem ne izpolni vseh vnaprej določenih meril |

Zmogljivostno je dosežen približno plato 120–131 req/s za ta mešani tok.
Podvojitev od 5 na 10 VU poveča prepustnost le s 122,421 na 126,971 req/s
(+3,72 %), p95 pa z 91,613 na 151,368 ms (+65,23 %), kar že izpolni vnaprejšnjo
definicijo platoja. Pri 20 VU je največja izmerjena prepustnost 130,567 req/s;
pri 40/80 VU ostane okoli 116 req/s, zakasnitve pa rastejo. Pri 160 VU je
170/2967 zahtev neuspešnih (5,730 %), neuspešnih je 169/602 ciklov (28,073 %).
To ni uporabna kapaciteta za navedeni SLO. Številke vključujejo tudi DELETE,
skupni račun in kratko zgodovino; niso univerzalna kapaciteta produkcije.

Med stresom je merilo napak celotnih ciklov prvič kršeno pri 10 VU.
Prva kršitev samo **HTTP** meril nastopi pri 20 VU. Ločujemo uspeh posameznega
HTTP klica od uspeha celotnega opravila. Po razbremenitvi se običajne zakasnitve
vrnejo, vendar občasni timeouti ostanejo, zato ST-02 ne prestane merila okrevanja.

Prva polna poskusna izvedba je dala ST-01/ST-02 PASS: ST-01 p95 99,327 ms,
p99 139,849 ms, 0 napak; recovery 0 napak. Med njenimi začetnimi fazami je tekel
tudi obstoječi unit suite, zato je posebej označena kot poskusna. Končna meritev
je bila izvedena brez dodatnih projektnih testov in ima **iste pragove**.
Ohranjeni sta obe izvedbi ([kazalo evidenc](tests/performance/results/README.md)).
Razlika opozarja na spremenljivost in občasne težave; boljši rezultat ne izniči
dokumentiranih neuspehov referenčne izvedbe.

### Ozka grla in priporočila

Ugotovljen plato in rast zakasnitev sta neposredni meritvi. Naslednji vzroki so
**kandidati na podlagi pregleda kode**; brez ciljnih CPU/DB/čakalnih metrik ne
moremo dokazati, kateri od njih prevladuje.

1. **Zmanjšati število SQL poizvedb ob oddaji.** `Store::_save_answers` za vsak
   odgovor opravi SELECT identifikatorja in INSERT. Za 36 odgovorov je to do 72
   poizvedb plus brisanje in zapis cevovoda. Enkrat pridobiti preslikavo ključev,
   odgovore zapisati paketno v isti transakciji in nato ponoviti isti test.
2. **Odpraviti N+1 pri branju.** `_build_item` za vsako vozlišče posebej bere
   možnosti; `find_pipelines` za vsak cevovod kliče `_load_answers`.
   Možnosti/odgovore pridobiti v skupnih poizvedbah, seznamom dodati paginacijo,
   nespremenljive vprašalnike in pravila pa predpomniti po različici z invalidacijo.
   Skupni testni račun pri višji sočasnosti dodatno obremeni sezname s trenutno
   aktivnimi cevovodi; ločeno ponoviti test z več različnimi računi in zgodovinami.
3. **Raziskati občasne timeoute pred razglasitvijo stabilnosti.** Opreti se na
   konkretne UTC zapise v `raw.ndjson`; dodati korelacijski ID, čas čakanja v HTTP
   vrsti in DB poolu, čas SQL poizvedb ter preveriti keep-alive in zapiranje povezav.
   V steady so timeouti pri GET vprašalnika/pravil, ne pri preverjenem POST zapisu.
   Sedanja evidenca ne loči strežniškega čakanja od vpliva lokalnega omrežja/gostitelja.
4. **Uglasiti sočasnost na podlagi meritev.** Izvorna koda ima 8 HTTP niti in 8 DB
   povezav; blokirajoče čakanje in zasedene povezave lahko povzročijo vrste.
   Pred povečevanjem obeh omejitev izmeriti obremenitev C++/PostgreSQL in čakalne
   čase. Določiti omejeno vrsto in nadzorovano zavrnitev preobremenitve.
   Preveriti vpliv sinhronega `std::endl` beleženja vsake zahteve v `main.cpp`.
5. **Ponoviti na izoliranem, identificiranem buildu.** Zagnati pripravljeni
   Compose, zapisati image digest, prevajalnik, PostgreSQL in meje virov ter
   zajeti `docker stats`/DB telemetrijo. Lokalno je ostalo le približno 256 MiB
   prostega RAM v najslabšem vzorcu, kar je lahko dodaten vir variabilnosti.
   Nato uporabiti k6 z odprtim modelom in daljši soak za puščanje pomnilnika.

### Dodatni funkcionalni ugotovitvi

Predpriprava je dejansko potrdila problem, viden v izvorni kodi:
`POST /api/pipelines` vrne **score 100**, ponovni `GET` pa **score 0**.
V shemi ni stolpca za ta rezultat; `_row_to_pipeline` ga nastavi na 0.
Odgovori in nivo 4 se ohranijo. To je samostojna napaka trajnosti rezultata,
ne dokaz izgube odgovorov pod stresom. Popravek: shraniti score ali ga ob branju
dosledno ponovno izračunati z istimi pravili. Ta naloga aplikacijske logike ne spreminja.

Lokalni izračun z različico pravil 1.0 vrne nivo 4, dodatni C++ evaluation klic
pa z istimi odgovori in vprašalnikom ter **svojimi legacy pravili iz baze** nivo 1.
Ne gre za primerjavo z istim pravilnikom; API-ja zato brez uskladitve modela pravil
ne smemo obravnavati kot zamenljiva. Dokaz je v
[`preflight.json`](tests/performance/results/2026-11-17T22-07-12-551Z-3f2aa2/preflight.json).

Obstoječi testi enot: **179/179 PASS**. Končni sistemski ukaz se je zaključil z
**izhodno kodo 1**, skladno z obema neuspešnima kriterijema ciklov. Testiranje,
surova evidenca in poročilo so zaključeni; zahteve stabilnosti sistema niso
v celoti dosežene.

## Dopolnitev: ponovna izvedba 18. 11. 2026

Po prvotni referenčni izvedbi je bila shranjena še ponovitev
`2026-11-18T07-05-44-345Z-42f9d6`, zaključena ob 08:10 CET. Uporabljena sta bila
isti načrt in ista revizija testnega ogrodja (SHA-256 v `environment.json`).
Spodnji podatki dopolnjujejo rezultate 17. 11.; prejšnjih neuspehov ne brišemo.

| Preverjanje | Meritev 18. 11. | Presoja |
|---|---|---|
| ST-01: celotna obremenitev | 2070 zahtev, 0 napak, p95 83,786 ms, p99 149,287 ms | **PASS** |
| ST-01: steady, 5 VU | 25,498 req/s, p95 89,881 ms, p99 155,581 ms, 0 neuspešnih ciklov | PASS |
| ST-02: prva kršitev HTTP SLO | 20 VU, p95 253,519 ms preseže 200 ms | Zaznana meja |
| ST-02: 160 VU | p95 4915,822 ms; 2,124 % HTTP napak; 12,540 % neuspešnih ciklov | Preobremenitev |
| ST-02: dosegljivost | 1 neuspešen vzorec health pri 160 VU; zahtevano 0 | **FAIL** |
| ST-02: recovery, 5 VU | p95 71,432 ms, p99 104,003 ms, 0 napak zahtev in ciklov | PASS |
| Preverjana integriteta in končno čiščenje | 0 neskladij, 0 preostalih testnih cevovodov | PASS |
| **Končni rezultat ponovitve** | **ST-01 PASS, ST-02 FAIL** | Merilo dosegljivosti med stresom ni izpolnjeno |

Najnovejši stresni test torej ne pade zaradi okrevanja, temveč zaradi enega
neuspešnega health preverjanja. To ne dokazuje sesutja procesa: tudi čakanje ali
timeout health klica lahko povzroči neuspešen vzorec. Prag je bil vnaprej 0 napak.
Kapaciteta je odvisna od pogojev izvajanja; v tej ponovitvi je bil maksimum
približno 306 req/s pri 20 VU, v starejši referenčni izvedbi približno 131 req/s.
Iz teh lokalnih meritev ne določamo univerzalne produkcijske kapacitete.

Dokazi ponovitve:
[povzetek](tests/performance/results/2026-11-18T07-05-44-345Z-42f9d6/summary.json),
[tabela vseh faz](tests/performance/results/2026-11-18T07-05-44-345Z-42f9d6/RESULTS.md),
[surovi zapisi](tests/performance/results/2026-11-18T07-05-44-345Z-42f9d6/raw.ndjson),
[okolje](tests/performance/results/2026-11-18T07-05-44-345Z-42f9d6/environment.json),
[audit](tests/performance/results/2026-11-18T07-05-44-345Z-42f9d6/audit.json).

