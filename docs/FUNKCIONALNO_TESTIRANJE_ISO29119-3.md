# Ročno funkcionalno testiranje – ISO/IEC/IEEE 29119-3:2021

## 1. Identifikacija in uporaba dokumenta

| Atribut | Vrednost |
|---|---|
| ID dokumenta / različica | ZK-FT-001 / 1.1 |
| Projekt / izdajatelj | Vprašalnik-Za-CI-CD / projektna ekipa ZK |
| Datum priprave | 17. 11. 2026 |
| Avtor osnutka | ChatGPT/Codex na zahtevo projektne ekipe |
| Skrbnik / pregledovalec | Član 1, QA koordinator; dejansko ime dopiše ekipa |
| Odobritveni organ | QA koordinator in projektna ekipa |
| Stanje | Izvedeni TS-01–TS-03 v individualnem obsegu. Rezultati v 8. poglavju. |
| Pregledana revizija | 73ac878ab203e7c907be21e45472c55fb6f91250 |
| Vrsta testiranja | Ročno funkcionalno sistemsko / end-to-end; black-box prek UI in javnih HTTP vmesnikov |
| Obseg sistema | React → C++ REST API → PostgreSQL; ločeno lokalni nadomestni način |
| Odobril / datum odobritve | |

Načrt temelji na pregledu dokumentacije, izvorne kode in konfiguracijskih podatkov. Referenčni izračuni so bili kontrolno preverjeni lokalno. Poročilo v 8. poglavju povzema ločeno ročno izvedbo TS-01–TS-03, ki jo je potrdil izvajalec.

| Različica | Datum spremembe | Sprememba | Pripravil |
|---|---|---|---|
| 1.0 | 17. 11. 2026 | Funkcionalni katalog, podatki, 12 specifikacij, dnevniki ter predloge poročil | ChatGPT/Codex |
| 1.1 | 17. 11. 2026 | Individualna izvedba TS-01–TS-03, ugotovitve TS-03 in incident INC-001 | ChatGPT/Codex po ugotovitvah izvajalca |

### 1.1 Prilagoditev standarda

Predloga sledi strukturi dokumentacije ISO/IEC/IEEE 29119-3:2021. Zaradi ročnega dela so specifikacija primera, postopek in dnevnik združeni. TS označuje scenarij oziroma povezan postopek; njegove variante imajo ločene kontrolne točke. Oznaka PASS velja šele, ko so uspešni vsi zahtevani koraki.

| Področje standarda | Umestitev |
|---|---|
| Skupni podatki (5) | Identifikacija, odgovornosti, stanje, zgodovina, obseg in viri |
| Načrt in model (7.2, 8.2) | Funkcionalni katalog, pokritost, okolje, merila |
| Specifikacija primerov in postopkov (8.3–8.4) | Cilji, podatki, predpogoji, urejeni koraki, pričakovanja in zaključek |
| Podatki, okolje in pripravljenost (8.5–8.8) | Skupni kompleti, zagon in evidenca pripravljenosti |
| Rezultati in dnevnik (8.9–8.10) | Prazna izvedbena polja ter evidenca dogodkov |
| Incidenti (8.11) | Predloga INC |
| Zaključek (7.4) | Zbirni rezultati, odstopanja, tveganja in sklep |

To je izvirna projektno prilagojena predloga, ne prepis standarda. **Obvezna polja** v nadaljevanju pomenijo obveznost za ta projekt. Javni predogled ne vsebuje celotnega normativnega besedila in Priloge A; zato ne trdimo, da je dokument formalno preverjen za popolno skladnost ali da je vsak dodani atribut univerzalno obvezen po ISO. Formalna izjava zahteva celoten standard in pregled prilagoditve.

Viri, preverjeni 17. 11. 2026:

- [ISO – izdaja 2021](https://www.iso.org/standard/79429.html).
- [IEEE SA – področje uporabe](https://standards.ieee.org/ieee/29119-3/7499/).
- [Predogled izvirnega standarda, kazalo in uvodni razdelki](https://cdn.standards.iteh.ai/samples/79429/396e15090ac642008cc4ccbd10e89b7f/ISO-IEC-IEEE-29119-3-2021.pdf).

Slovar: **F** = funkcionalnost; **TS** = scenarij/postopek; **RUN** = ena izvedba; **INC** = incident; **Q/R** = različica vprašalnika/pravil; **oracle** = vnaprej določeno pričakovanje. Online pomeni uspešno strežniško operacijo, ne zgolj izris strani.

## 2. Pregled projekta in obnovljene funkcionalnosti

### 2.1 Pregledani viri

| Vir | Namen pregleda |
|---|---|
| [README.md](../README.md), [README_ZK.md](../README_ZK.md), [README_ZK_2.md](../README_ZK_2.md) | Namen, namestitev, zgodovinske ugotovitve in aktualna pogodba izračuna |
| [frontend-README.md](../frontend-README.md), [backend-README.md](../backend-README.md), [_PROMOCIJA/opis_projekta.txt](../_PROMOCIJA/opis_projekta.txt) | Primerjava dokumentiranih in dejanskih funkcij |
| [App.jsx](../src/App.jsx), [api.js](../src/api.js), [data.js](../src/data.js) | Vloge, navigacija, strežniški in lokalni način |
| [Komponente](../src/components/) | LandingPage, Sidebar, Header, Dashboard, Assessment1/4/Wrapper, ResultsPanel, GitHubYamlViewer, Builder, Rules, AdminDashboard, UserAssessments |
| [Izračun](../src/utils/assessment.js), [utils.js](../src/utils.js), [validator](../src/utils/validator.js), [odložišče](../src/utils/clipboard.js) | Kriteriji, odstotki, primerjava različic, kopiranje |
| [C++ API](../backend/include/cicdq/routes/), [store.hpp](../backend/include/cicdq/store.hpp), [assessment.hpp](../backend/include/cicdq/assessment.hpp), [main.cpp](../backend/src/main.cpp) | Avtentikacija, CRUD, dodelitve, shranjevanje in inicializacija |
| [Q1](../questionnaire_config.json), [R1](../maturity_rules.json), [Q2](../questionnaire2.json), [R2](../maturity_rules2.json) | Konkretna vprašanja, možnosti, stopnje in pričakovani izračuni |
| [Compose](../docker-compose.yml), [Vite](../vite.config.js), [SQL](../vprasalnik.sql), Dockerfiles in produkcijski Compose | Testno okolje in začetni podatki |

Ob pregledu docs še ni obstajal, v evidence in test ni bilo datotek z uporabnimi dokazi izvedb. Zgodovinskih unit rezultatov ne prenašamo v ročne rezultate. database.json in src/data.js ne dokazujeta dejanskega online stanja baze.

### 2.2 Funkcionalni katalog in sledljivost

| ID | Funkcionalnost končnega uporabnika | Vmesnik / povezava | Scenariji |
|---|---|---|---|
| F-01 | Registracija member računa, prijava, obnova seje, odjava | LandingPage; /api/auth/register, /login | TS-01, TS-09 |
| F-02 | Gost izpolni in izračuna oceno, shranjevanje zahteva prijavo | ▶ Oceni cevovod zdaj | TS-02 |
| F-03 | Izbira različic vprašalnika in pravil | Dashboard; /api/questionnaire/versions, /api/rules/versions | TS-02, TS-04, TS-05 |
| F-04 | Metapodatki ocene, pet tipov odgovorov, odvisni otroci in pomoč | Assessment1/4, Builder | TS-03, TS-07, TS-10 |
| F-05 | Skrčljive teme / Stranski zavihki, tema in stranska vrstica | Sidebar, Header, AssessmentWrapper | TS-02, TS-03 |
| F-06 | Odstotek izpolnjenosti, najvišja izpolnjena stopnja in priporočila | Izračunaj zrelost, ResultsPanel; lokalni JS | TS-04, TS-05, TS-11 |
| F-07 | Rezultati po sekcijah, PDF/tisk in TXT izvoz | Izvozi PDF, Izvozi vprašalnik | TS-06 |
| F-08 | Branje/kopiranje YAML iz GitHub, osvežitev in napake | GitHubYamlViewer; javni GitHub API | TS-06 |
| F-09 | Shranjevanje, urejanje, filtri, pregled in brisanje ocen | Dashboard; /api/pipelines | TS-07, TS-09 |
| F-10 | Nova verzija ocene, lokalna zgodovina, read-only in posodobitev vprašalnika | Dashboard, App, api.js | TS-08 |
| F-11 | Uvoz/izvoz JSON, kategorije, elementi, podvprašanja, CRUD vprašalnika | Builder; /api/questionnaire, /api/categories | TS-10 |
| F-12 | Različice pravil, kriteriji, priporočila, JSON/vizualni urejevalnik | Rules; /api/rules/versions | TS-11 |
| F-13 | Uporabniki, priprava vabil, kopiranje povezav, izvoz uporabnikov | AdminDashboard; /api/users, mailto | TS-12 |
| F-14 | Skupine, člani, repozitoriji, dodelitve in spremljanje napredka | /api/groups, /api/assignments | TS-12 |
| F-15 | Vabilo, reševanje dodelitve, zaključek, nadgradnja user → member | /api/auth/invite-login, /upgrade; /api/assignments/:id/complete | TS-12 |
| F-16 | Offline hramba, ponovna povezava in omejitve pravic | api.js, JWT zaščitene C++ poti | TS-09 |

### 2.3 Kaj starejša dokumentacija ne opiše pravilno

- Gost ni samo bralec. Dejanski začetni gumb je **▶ Oceni cevovod zdaj**.
- Stanja so guest, member, povabljeni user in admin. Member ima nadzorno ploščo in nove ocene; user predvsem **Ocenjevanje cevovoda** z dodelitvami; admin še **Admin panel**, **Form Builder**, **Pravila zrelosti**.
- api.evaluate vedno računa lokalno v JavaScriptu. POST /api/assessment/evaluate obstaja, vendar ga ta UI tok ne kliče; njegov C++ algoritem ni enakovreden kriterijskemu JS izračunu.
- **Izračunaj zrelost** ne shrani ocene. To stori **✓ Shrani ocenjevanje**. Trajnega samodejnega shranjevanja nedokončanega obrazca ni.
- Q2.0 je **Ocena zrelosti agilnih procesov (Agile & Scrum)**, ne razširitev CI/CD Q1.0. Izbiri Q in R sta neodvisni, vsebinska združljivost ni samodejno zagotovljena.
- Checkbox in yes_no_na kažeta **DA** in **/** (NA); gumba NE ni. Neoznačeno je neizpolnjeno. Pri shranjevanju manjkajoči checkbox odgovor dobi NE.
- Otroci se omogočijo pod DA. Izključitev starša ne izbriše prejšnjih otroških vrednosti. Skrčljiv pogled lahko sekcijo zapre, zavihki kažejo onemogočene vnose.
- Odstotek meri izpolnjenost aktivnih vprašanj, stopnjo pa določijo kriteriji. Nivo 5 je mogoče doseči pri 41 %.
- PDF uporablja brskalniško tiskanje; TXT trenutno izvaža samo vrhnja vprašanja. Kopiranja celotnega rezultata ni; kopiranje obstaja za YAML in vabila.
- Zgodovina ocen je lokalna (cicdq_versions_…), ne strežniška zgodovina. Posodobitev iste definicije ni migracija CI/CD 1.0 v Agile 2.0.
- YAML pregledovalnik bere .yml/.yaml; iz njih ne izpolnjuje odgovorov samodejno.
- Ustvarjanje uporabnika pripravi mailto sporočilo; aplikacija sama ne pošlje e-pošte. Izvoz z napisom »imena & gesla« vsebuje identifikacijske podatke in vlogo, ne gesel.

### 2.4 Tveganja, ugotovljena s statičnim pregledom

To niso dejanski rezultati ročnega testa. Pričakovanj ne prilagajamo napaki samo zato, da dobimo PASS. **Sprejemno preverjanje** v scenarijih pomeni želeno uporabniško lastnost; lahko odkrije že predvideno odstopanje. **Karakterizacija** posebej označuje dokumentirano omejitev.

| ID | Ugotovitev / tveganje | Preverjanje |
|---|---|---|
| R-01 | Po neuspešnem HTTP ustvarjanju/urejanju ocene je mogoč lokalni fallback; prikaz ni dokaz baze | TS-07/09 |
| R-02 | Vizualna pravila zapisujejo equals/gte/contains, izračun podpira =, >=, >, <=, <, includes | TS-11 |
| R-03 | TXT ne obhodi podvprašanj | TS-06 |
| R-04 | Zgodovina je lokalna; ločena rulesVersion se v C++ Pipeline ne ohranja | TS-08/11 |
| R-05 | set_password uporablja /api/users/set-password, ki v pregledanih C++ poteh ni registrirana; /api/auth/upgrade obstaja | TS-12 |
| R-06 | Ob preklopu Assessment1/4 sta ime/link lokalni stanji ponovno ustvarjene komponente | TS-03 |
| R-07 | Uvoz lahko pokaže uspeh pred potrditvijo hrambe; nadkategorije se po obnovi izpeljejo iz ID | TS-10 |
| R-08 | Numeric pokritost nima min/max; kriteriji lahko berejo ohranjene onemogočene otroke | TS-03/05 |
| R-09 | Offline avtentikacija je demonstracijska, predpomnilnik ni zanesljiva meja med uporabniki | TS-09 |
| R-10 | Admin lahko bere tuje ocene, PUT/DELETE pa zahtevata lastništvo | TS-09 |
| R-11 | Posodobitev zaznava spremembe uporabljene definicije, ne avtomatskega prehoda na drugo vsebinsko različico | TS-08 |

## 3. Načrt, okolje in podatki

### 3.1 Obseg, merila in statusi

Testi uporabljajo UI; DevTools Network je dokaz javne komunikacije, ne nadomestek uporabniške poti. Ročni dodatni HTTP testi preverjajo javno pogodbo API. Izven obsega so avtomatizirani E2E/unit testi, obremenitvene meritve, penetracijsko testiranje, celotna dostopnost in vse kombinacije OS/brskalnikov. Pokritje vseh F ni trditev o izčrpni kombinatorični pokritosti. Starega načina minScore ne enačimo s kriterijskimi Q/R1 in Q/R2.

**Vstopna merila:** izolirana testna baza, delujoč health in podatkovni API, Q/R1.0 in Q/R2.0 ustrezata repozitoriju, pripravljeni računi in zapisane dejanske različice okolja.

**Izhodna merila:** izvedenih vseh 12 scenarijev in variant; FAIL ima INC; blokade/neizvedeni deli so pojasnjeni; prijava, izračun, trajna hramba in dodelitve delujejo; ni odprtih S1/S2 incidentov; ostali incidenti imajo odgovorno osebo in presojo.

PASS = pričakovanje v celoti izpolnjeno; FAIL = opaženo odstopanje; BLOCKED = izvedba ni mogoča; NOT RUN = še ni izvedeno. Če ima scenarij vsaj en FAIL, je skupno FAIL. Brez FAIL, a z neizvedenimi zahtevanimi koraki ne sme dobiti PASS. Pred izvedbo statusi ostanejo prazni.

### 3.2 E-01 in E-02

E-01: Windows 10/11, PowerShell, Docker Desktop z Linux vsebniki; React/Vite, C++ in PostgreSQL 15 iz lokalnega Compose iste revizije. Primarni brskalnik Chrome ali Edge; dejansko različico vpišite. TS-02/03/06 ponovite v drugem brskalniku kot dodaten RUN istega scenarija, ne nov dodeljen scenarij.

~~~powershell
docker compose config --quiet
docker compose up --build -d
docker compose ps
docker compose logs --tail=100 db backend frontend
~~~

Frontend: http://localhost:5173. Health: http://localhost:3002/health in http://localhost:5173/health; pričakovano HTTP 200 in {"status":"ok"}. Preverite še uspešen podatkovni GET. Prvi zagon praznega nosilca uporabi korenski SQL; samodejni uvoz JSON je odvisen od praznosti ustreznih tabel. Obstoječa baza se s spremembo datotek ne ponastavi.

Alternativa: Docker db/backend in lokalni frontend (npm ci, npm run dev; API_PROXY_TARGET=http://localhost:3002). Ne zaganjajte dveh frontendov na 5173. Podrobnosti ročne C++ gradnje so v README_ZK.md; referenčna izvedba uporablja Compose.

E-02: stran ostane odprta; **docker compose stop backend** ustavi samo testni backend. Frontend ostane dosegljiv, health odpove. Obnova: **docker compose start backend**, uspešen health in po potrebi nova online prijava. E-02 uporabite samo v TS-09, usklajeno z ekipo.

Ločeni profili: A/B sta member, C admin, U/V povabljena user računa. Dve zasebni okni lahko delita localStorage; za ločitev uporabite ločene profile/brskalnike. Ne posegajte v produkcijske podatke in ne uporabljajte down -v.

| Pripravljenost ENV-01 / DATA-01 | Dejanska vrednost / dokaz |
|---|---|
| Datum/čas, pripravil, RUN | |
| OS in brskalnik z različico, profil | |
| Commit, lokalne spremembe, način zagona | |
| Docker/Compose, Node pri lokalnem frontendu | |
| URL, health in podatkovni GET | |
| Različici in vsebina Q1/R1, Q2/R2 | |
| Testni računi pripravljeni | |
| GitHub, tisk v PDF, prenosi, odložišče | |
| Pripravljeno DA/NE, blokade | |

### 3.3 Skupni postopki in računi

**P-START:** Nadzorna plošča → **+ Novo ocenjevanje** → **Vprašalnik (obrazec) \*** = zahtevana Q → **Pravila zrelosti \*** = zahtevana R → **Začni ocenjevanje →**. Bližnjica »Nova ocena« v stranski vrstici ni dokaz izrecne izbire različic.

**P-CALC:** vnesite komplet → **Izračunaj zrelost** → preverite stopnjo, priporočila in sekcije. Za skupni odstotek uporabite prijavljenega člana, vnaprej določeno ime, **✓ Shrani ocenjevanje** in odstotek v vrstici nadzorne plošče. ResultsPanel skupnega odstotka ne izpiše kot samostojne številke. Vsak neodvisen komplet začnite s P-START; Zapri okence vrne na nadzorno ploščo.

**P-PERSIST:** ob UI zapisu zabeležite metodo/URL/status in očiščen odgovor; nato v čistem profilu prijavite istega uporabnika in preverite obnovo iz strežnika. PASS trajnosti zahteva oboje, ne samo lokalni prikaz. V dokazilih ne vključujte žetonov ali gesel.

**P-CLEAN:** po dokazih odstranite samo testne ocene, dodelitve/skupine, testne konfiguracije in račune; najprej odvisne objekte. Dokaze ohranite. Za ponovitev enotno zamenjajte pripono imen, če objekti že obstajajo.

| Podatek | Konkretna vrednost |
|---|---|
| Začetni lokalni admin | admin / password; potrditi na testni bazi |
| Member A | qa.zk.a.20261117 / qa.zk.a.20261117@example.com / ZkTest!2026 |
| Member B | qa.zk.b.20261117 / qa.zk.b.20261117@example.com / ZkTest!2026 |
| Povabljena U/V | qa.zk.invited.20261117@example.com / qa.zk.extra.20261117@example.com |
| Geslo po nadgradnji U | ZkUpgrade!2026 |
| Skupina | QA-ZK-SKUPINA-20261117 |
| Referenčni repozitorij | https://github.com/Timotejlipic/Vprasalnik-Za-CI-CD |
| Drugi repozitorij | https://github.com/vitejs/vite |

A nastane v TS-01; B pripravite z istim registracijskim postopkom pred TS-09. Naslovi example.com so sintetični. Vabila kopirajte/odprite lokalno; e-pošte ne pošiljajte. Naključnega začasnega gesla U/V ni treba poznati.

### 3.4 Konkretni podatkovni kompleti Q1.0/R1.0

Nenavedena polja so prazna/neoznačena. Starše vedno omogočite pred otroki. DA pri Build, Unit Testing ali Deploy pomeni **Prisoten v cevovodu: DA**.

| Ključ | Dejanska lokacija / naziv / možnosti |
|---|---|
| build_present | Build → Prisoten v cevovodu (Build korak je prisoten v cevovodu) |
| build_other_triggers | Build → Avtomatski prožilci → Push (PUSH), Pull Request (PULLRQ) |
| build_artifacts_stored | Build artefakti se hranijo |
| build_artifact_versioning | Otrok prejšnjega → Avtomatsko verzioniranje artefaktov |
| build_notification | Obvestilo ob uspehu / neuspehu build-a |
| unit_test_present | Unit Testing → Prisoten v cevovodu |
| unit_test_pipeline_fail | Cevovod se ustavi ob neuspehu testov |
| unit_test_report | Generiranje testnega poročila |
| unit_test_coverage_tracking | Merjenje pokritosti kode s testi (code coverage) |
| unit_test_coverage_percent | Otrok merjenja → Pokritost kode s testi (%) |
| unit_test_coverage_gate | Otrok merjenja → Cevovod se ustavi, če pokritost pade pod prag |
| deploy_present | Deploy → Prisoten v cevovodu |
| deploy_environments | Okolja, v katera se izvaja deploy → Test, Staging, Production / Produkcija |

| Komplet | Konkretni odgovori | Izpolnjena / aktivna vprašanja | Odstotek in stopnja |
|---|---|---|---|
| D0 | Vse prazno | 0/4 | 0 %, Nivo 1 – Regresiven |
| D2 | build_present=DA; build_other_triggers=[PUSH]; unit_test_present=DA | 3/23 | 13 %, Nivo 2 – Ponovljiv |
| D3 | D2 + unit_test_pipeline_fail=DA; unit_test_report=DA; deploy_present=DA | 6/29 | 21 %, Nivo 3 – Konsistenten |
| D59 | D3 + build_artifacts_stored=DA; unit_test_coverage_tracking=DA; unit_test_coverage_percent=59; deploy_environments=[test, staging] | 10/32 | 31 %, Nivo 3 – Konsistenten |
| D60 | D59, pokritost zamenjaj s 60 | 10/32 | 31 %, Nivo 4 – Kvantitativno upravljan |
| D61 | D59, pokritost zamenjaj z 61 | 10/32 | 31 %, Nivo 4 – Kvantitativno upravljan |
| D79 | D60 + build_other_triggers=[PUSH, PULLRQ]; build_artifact_versioning=DA; build_notification=DA; unit_test_coverage_gate=DA; deploy_environments=[test, staging, production]; pokritost=79 | 13/32 | 41 %, Nivo 4 – Kvantitativno upravljan |
| D80 | D79, pokritost zamenjaj z 80 | 13/32 | 41 %, Nivo 5 – Optimizacija |
| D81 | D79, pokritost zamenjaj z 81 | 13/32 | 41 %, Nivo 5 – Optimizacija |

Oracle je izpeljan iz vprašanj in kriterijev: zaokroženo 100 × izpolnjena/aktivna, enaka utež vprašanj. Otroci štejejo pod DA. / pri kriterijskih pravilih ostane neizpolnjeno vprašanje v imenovalcu. Več izbir istega multiselect vprašanja šteje kot eno izpolnjeno vprašanje, lahko pa izpolni več kriterijev.

Q2/R2 stopnje: **Nivo 1 – Ad-hoc / Kaotičen**, **Nivo 2 – Začetni (Initiated)**, **Nivo 3 – Definiran (Defined)**, **Nivo 4 – Napreden (Advanced)**, **Nivo 5 – Visoko zmogljiva ekipa (High-Performing)**.

## 4. Seznam scenarijev in odgovornosti

Izbrana je ekipa **štirih članov, vsak ima natanko tri scenarije**. Status priprave ne pomeni uspešne izvedbe.

| ID | Naziv scenarija | Kratek opis | Odgovorna oseba | Status priprave |
|---|---|---|---|---|
| TS-01 | Registracija, prijava in seja | Validacije, vloge, obnova, odjava | Gašper Kavčič | Izvedeno |
| TS-02 | Gost, konfiguracija in navigacija | Q/R1 in Q/R2, gost brez shranjevanja, tema | Gašper Kavčič | Izvedeno |
| TS-03 | Pogojni obrazec in tipi | Odvisnosti, DA/NA, multiselect, tekst, numeric, dva izgleda | Gašper Kavčič | Izvedeno |
| TS-04 | Osnovne stopnje | D0/D2/D3, odstotek in priporočila | Član 2 | Pripravljeno za izvedbo |
| TS-05 | Meje pokritosti | 59/60/61 in 79/80/81, najvišja stopnja | Član 2 | Pripravljeno za izvedbo |
| TS-06 | Rezultati, izvozi in YAML | PDF, TXT, kopiranje YAML, napake | Član 2 | Pripravljeno za izvedbo |
| TS-07 | Trajna hramba in CRUD ocen | Validacija imena, baza, restart, filtri, urejanje, brisanje | Član 3 | Pripravljeno za izvedbo |
| TS-08 | Zgodovina in sprememba vprašalnika | Nova verzija, read-only, isti repo, posodobitev | Član 3 | Pripravljeno za izvedbo |
| TS-09 | Izpad in omejitve dostopa | Offline/online, API pravice, ločitev sej | Član 3 | Pripravljeno za izvedbo |

Vrstni red: E-01 → TS-01 → TS-02/03/04/05/06/07 → priprava Q90.1/R90.1 iz 6.A → TS-08 → TS-09. Testne konfiguracije se brišejo šele po odvisnih scenarijih. Izpada TS-09 ne izvajajte sočasno z online testi.

## 5. Predloga specifikacije in dnevnika

### 5.1 Atributi

Za projekt so obvezni ID, naziv, avtor/odgovorni, cilj, sledljivost, predpogoji, okolje, konkretni podatki, koraki, pričakovani rezultati in končno stanje. Priporočena in spodaj vključena sta še prioriteta in čiščenje/odvisnosti. Ob izvedbi so obvezni RUN, datum/čas, izvajalec, revizija/okolje, dejanski rezultat in status; ob neuspehu še INC in dokaz.

| Test Case Specification – prazna predloga | Vnos |
|---|---|
| Test Case Identifier / ID | |
| Title / Naziv | |
| Author / Responsible Person | |
| Objective / Purpose | |
| Traceability / Related Functionality | |
| Prioriteta / tveganje | |
| Preconditions / stanje in odvisnosti | |
| Test Environment | |
| Test Data | |
| Postconditions / cleanup | |

| Korak | Akcija / Test Procedure | Pričakovani rezultat / Expected Result | Dejanski rezultat / Actual Result | Status PASS/FAIL | Opombe / dokazilo |
|---|---|---|---|---|---|
| 1 | | | | | |

| Test Execution Log – glava | Vnos |
|---|---|
| RUN-ID / TS / ponovitev | |
| Datum izvedbe, čas začetka/konca, časovni pas | |
| Izvajalec | |
| Commit / lokalne spremembe | |
| OS / brskalnik / različice / profil / E / Q / R | |
| Končni status scenarija | |
| Incidenti / dokazi | |

Ob ponovitvi kopirajte dnevnik, starih rezultatov ne prepisujte. Za variante uporabite npr. TS-05/D79/RUN-02. V stolpcu PASS/FAIL sta za neizvedene korake dovoljena tudi BLOCKED in NOT RUN. Dejanski rezultati niso kopija pričakovanj.

| Datum/čas | RUN / TS / korak | Dogodek in dejanski potek | Vpliv na nadaljevanje | Ukrep / dokaz |
|---|---|---|---|---|
| | | | | |

Dokaze shranite v evidence/zk3/RUN-ID/TS-xx/korak-xx.png oziroma .pdf/.txt/.json, povezavo vpišite ob koraku. Mrežna napaka potrebuje status in očiščeno telo odgovora. Zeleno obvestilo samo ne dokazuje uspešne strežniške operacije.

## 6. Izpolnjene specifikacije

Vsi TS imajo že določen cilj, podatke, postopek in pričakovanja. Dejanske rezultate vpiše izvajalec. Sklic na D-komplet pomeni vse konkretne vrednosti iz 3.4. E-01 vključuje celotni frontend/C++/PostgreSQL sistem; dejanske verzije se vpišejo v dnevnik.


### TS-01 – Registracija, prijava in seja

| Atribut | Specifikacija |
|---|---|
| ID / Title | TS-01 / Registracija, prijava in seja |
| Author / Responsible Person | ChatGPT/Codex (osnutek) / Član 1 |
| Objective / Purpose | Potrditi validacije, nastanek member računa in celoten cikel prijavne seje. |
| Traceability / Related Functionality | F-01, F-16; LandingPage, App, api.js, routes/auth.hpp |
| Prioriteta | Visoka |
| Preconditions | Profil A brez seje; račun A še ne obstaja; admin dosegljiv. |
| Test Environment | E-01; dejanske verzije in profil v dnevniku |
| Test Data | A iz 3.3; napačno geslo Napacno!2026; kratko 12345; neujemajoča potrditev Drugace!2026. |
| Postconditions / cleanup | A ostane za nadaljnje teste, na koncu odjavljen; admin preverjen v profilu C. |

| Korak | Akcija / Test Procedure | Pričakovani rezultat / Expected Result | Dejanski rezultat / Actual Result | Status PASS/FAIL | Opombe / dokazilo |
|---|---|---|---|---|---|
| 1 | Prijava → prazna polja → Prijava →. | Izpolnite vsa polja.; brez seje in POST prijave. | | | |
| 2 | Vpišite admin / Napacno!2026 in potrdite. | POST /api/auth/login 401, Invalid credentials.; ni prijavljene seje. | | | |
| 3 | Registracija → brez podatkov → Ustvari račun →. | Izpolnite vsa obvezna polja.; brez novega računa. | | | |
| 4 | Vnesite ime in naslov A, Geslo *=12345 in Potrdi geslo *=12345; potrdite. | Geslo mora imeti vsaj 6 znakov.; brez novega računa. | | | |
| 5 | Vnesite Geslo *=ZkTest!2026 in Potrdi geslo *=Drugace!2026; potrdite. | Gesli se ne ujemata.; brez novega računa. | | | |
| 6 | V obe gesli vnesite ZkTest!2026; Ustvari račun →. | HTTP 201, role=member; Nadzorna plošča in Nova ocena sta dostopni. Admin panel, Form Builder in Pravila zrelosti niso v member navigaciji. | | | |
| 7 | Osvežite stran, nato kliknite Odjava in ponovno osvežite. | Najprej se obnovi ista member seja; po odjavi ostane pristajalna stran, brez obnovljene prijave. | | | |
| 8 | Ponovite registracijo z istim imenom A in veljavnimi podatki. | HTTP 409, Username is already taken.; dvojnik ne nastane. | | | |
| 9 | Prijavite A s pravilnim geslom in Enter v polju Geslo; nato se odjavite. | HTTP 200; isti račun. Po odjavi pristajalna stran. | | | |
| 10 | V ločenem profilu C prijavite admin / password. | Admin vidi Admin panel, Form Builder, Pravila zrelosti; profil A ostane odjavljen. | | | |

| Dnevnik TS-01 | Vnos ob izvedbi |
|---|---|
| RUN-ID / ponovitev | |
| Datum izvedbe, začetek/konec, časovni pas | |
| Izvajalec | |
| Commit / lokalne spremembe | |
| OS / brskalnik / različica / profil / E / Q / R | |
| Končni status scenarija | |
| Incidenti / dokazila / odstopanja | |

Napačno geslo preverjajte online: demonstracijska offline prijava ima drugačno obnašanje.

### TS-02 – Gost, konfiguracija in navigacija

| Atribut | Specifikacija |
|---|---|
| ID / Title | TS-02 / Gost, konfiguracija in navigacija |
| Author / Responsible Person | ChatGPT/Codex (osnutek) / Član 1 |
| Objective / Purpose | Preveriti gostujoče ocenjevanje, izbiro Q/R in navigacijo. |
| Traceability / Related Functionality | F-02, F-03, F-05; LandingPage, Dashboard, Header, Sidebar |
| Prioriteta | Visoka |
| Preconditions | Čist neprijavljen profil; nespremenjeni Q/R1.0 in Q/R2.0. |
| Test Environment | E-01; dejanske verzije in profil v dnevniku |
| Test Data | Gost; ime QA-ZK-GOST; prazni odgovori; konfiguraciji 1.0/1.0 in 2.0/2.0. |
| Postconditions / cleanup | Brez shranjene gostove ocene; obnovljena začetna tema. |

| Korak | Akcija / Test Procedure | Pričakovani rezultat / Expected Result | Dejanski rezultat / Actual Result | Status PASS/FAIL | Opombe / dokazilo |
|---|---|---|---|---|---|
| 1 | Na začetni strani kliknite ▶ Oceni cevovod zdaj. | Aplikacija se odpre kot gost; ni admin funkcij. Sam vstop ne ustvari ocene. | | | |
| 2 | + Novo ocenjevanje → Prekliči. | Dialog se zapre, brez novega zapisa. | | | |
| 3 | P-START Q1.0/R1.0. | Build, Unit Testing, Deploy in Drugo ter Ime cevovoda in Repozitorij (link). | | | |
| 4 | Vnesite QA-ZK-GOST, vse odgovore pustite prazne; Izračunaj zrelost. | Nivo 1 – Regresiven; brez prijave. Ni POST /api/assessment/evaluate in ni shranitve. | | | |
| 5 | Kliknite ✓ Shrani ocenjevanje. | Za shranjevanje se morate prijaviti.; ni uspešnega POST /api/pipelines ali nove gostove ocene. Zaprtje rezultatov ni shranitev. | | | |
| 6 | Zaprite obvestilo; P-START Q2.0/R2.0. | Planiranje sprinta (Sprint Planning), Dnevni sestanek (Daily Scrum), Retrospektiva sprinta (Sprint Retrospective); CI/CD vprašanja niso pomešana. | | | |
| 7 | Pustite prazne odgovore in Izračunaj zrelost. | Nivo 1 – Ad-hoc / Kaotičen; priporočila pripadajo Agile pravilom. | | | |
| 8 | Zapri okence; preklopite Svetel način/Temen način. | Tema se spremeni; vmesnik ostane uporaben. Napis gumba opisuje naslednjo izbiro. | | | |
| 9 | Zapri stransko vrstico in Odpri stransko vrstico (title gumbov). | Navigacija se skrije in obnovi; podatki se s tem ne spremenijo. | | | |
| 10 | Osvežite; po potrebi ponovno vstopite kot gost; nato obnovite začetno temo. | Izbrana tema se ohrani. Gostu ni treba ostati na isti notranji strani; ni lažno obnovljene prijavne seje. | | | |

| Dnevnik TS-02 | Vnos ob izvedbi |
|---|---|
| RUN-ID / ponovitev | |
| Datum izvedbe, začetek/konec, časovni pas | |
| Izvajalec | |
| Commit / lokalne spremembe | |
| OS / brskalnik / različica / profil / E / Q / R | |
| Končni status scenarija | |
| Incidenti / dokazila / odstopanja | |

### TS-03 – Pogojni obrazec in tipi

| Atribut | Specifikacija |
|---|---|
| ID / Title | TS-03 / Pogojni obrazec in tipi |
| Author / Responsible Person | ChatGPT/Codex (osnutek) / Član 1 |
| Objective / Purpose | Preveriti odvisnosti starš/otrok, različne vnose in preklop izgleda. |
| Traceability / Related Functionality | F-04, F-05; Assessment1/4/Wrapper; R-06, R-08 |
| Prioriteta | Visoka |
| Preconditions | A prijavljen; nov P-START Q1/R1; Skrčljive teme; vse prazno. |
| Test Environment | E-01; dejanske verzije in profil v dnevniku |
| Test Data | Ime QA-ZK-OBRAZEC; referenčni repo; Build Drugo=Gradnja s šumniki: čšž; other_description=QA opomba 2026; numeric 0, 60, -1, 101. |
| Postconditions / cleanup | Brez shranitve; vrnitev na nadzorno ploščo. yes_no_na posebej pokrije TS-10. |

| Korak | Akcija / Test Procedure | Pričakovani rezultat / Expected Result | Dejanski rezultat / Actual Result | Status PASS/FAIL | Opombe / dokazilo |
|---|---|---|---|---|---|
| 1 | Vnesite ime/link; brez označene prisotnosti kliknite glavo Build. | Sekcija se ne odpre; Najprej morate označiti "DA", da je "Build" prisoten v cevovodu, če želite urejati podrobnosti. | | | |
| 2 | Zaprite obvestilo; pri Build označite DA. | Sekcija se odpre, otroci so omogočeni; DA in / nista hkrati izbrana. | | | |
| 3 | Avtomatski prožilci → Push in Pull Request; nato odznačite Pull Request. | Najprej obe možnosti, nato ostane samo Push. | | | |
| 4 | Build → Drugo = Gradnja s šumniki: čšž; kliknite ? pri vprašanju dvakrat. | Besedilo se ohrani, pomoč se pokaže/skrije brez spremembe odgovora. | | | |
| 5 | Build artefakti se hranijo=DA; Avtomatsko verzioniranje artefaktov=DA; odstranite DA pri staršu. | Vnuk je omogočen šele pod DA starša; po odznačitvi je onemogočen in ne sprejema sprememb. | | | |
| 6 | Znova omogočite starša; pri prisotnosti Build izberite / in nato DA. | Prejšnji vnuk ostane izbran. / izključi DA in zapre sekcijo; ponovni DA obnovi otroke, Push in tekst. | | | |
| 7 | Omogočite Unit Testing ter Merjenje pokritosti kode s testi (code coverage). V Pokritost kode s testi (%) vnesite 0, nato 60, nato izbrišite. | 0 je prikazan kot 0, 60 kot 60; po brisanju prazno. Ni zamenjave ničle s praznim odgovorom. | | | |
| 8 | Vnesite -1, nato 101, nato obnovite 60. | Karakterizacija: polje trenutno sprejme tudi -1/101, ker nima min/max. Zabeležite domensko omejitev R-08; to ni potrditev smiselnosti odstotkov izven 0–100. | Polje sprejme vrednosti zunaj območja 0–100. | PASS | Opazovano vedenje potrjuje omejitev R-08. |
| 9 | V Drugo → Opis dodatnih elementov vnesite QA opomba 2026; preklopite Stranski zavihki. | Odgovori ostanejo. Sprejemno preverjanje: ohranita se tudi neshranjena QA-ZK-OBRAZEC in link; izguba je FAIL R-06. | Ob preklopu se izgubita vpisano ime cevovoda in povezava do repozitorija. | FAIL | INC-001 |
| 10 | Preverite kategorije z Naslednja kategorija in Prejšnja kategorija. | Vnosi in šumniki ohranjeni; na prvi je Prejšnja in na zadnji Naslednja onemogočena. | | | |
| 11 | V Unit Testing izključite prisotnost in poskusite spreminjati numeric; znova omogočite prisotnost. | Vnos je onemogočen, po obnovi DA se ohrani 60; odvisnosti veljajo tudi v zavihkih. | | | |
| 12 | Preklopite Skrčljive teme, preverite odgovore/ime/link; Nazaj. | Vnosi se ohranijo med preklopoma; Nazaj ne shrani nove ocene. | Po vrnitvi v Skrčljive teme sta ime in povezava prazna. | FAIL | Isti incident INC-001. |

| Dnevnik TS-03 | Vnos ob izvedbi |
|---|---|
| RUN-ID / ponovitev | |
| Datum izvedbe, začetek/konec, časovni pas | 17. 11. 2026, Europe/Ljubljana |
| Izvajalec | Gašper Kavčič |
| Commit / lokalne spremembe | |
| OS / brskalnik / različica / profil / E / Q / R | |
| Končni status scenarija | FAIL |
| Incidenti / dokazila / odstopanja | INC-001, koraka 9 in 12. Izvajalec je za preostale korake potrdil PASS. Pri koraku 8 je potrdil tudi omejitev R-08. |

Ob izgubi metapodatkov zabeležite FAIL, nato jih lahko ponovno vnesete za nadaljnje neodvisne korake.


### TS-04 – Osnovne stopnje

| Atribut | Specifikacija |
|---|---|
| ID / Title | TS-04 / Osnovne stopnje |
| Author / Responsible Person | ChatGPT/Codex (osnutek) / Član 2 |
| Objective / Purpose | Potrditi stopnje 1–3, odstotke in vsebino priporočil. |
| Traceability / Related Functionality | F-03, F-06; Q1/R1, assessment.js, ResultsPanel |
| Prioriteta | Visoka |
| Preconditions | A prijavljen; nespremenjena Q1/R1; brez istoimenskih ocen. |
| Test Environment | E-01; dejanske verzije in profil v dnevniku |
| Test Data | D0/D2/D3 iz 3.4; imena QA-ZK-TS04-D0/D2/D3; link prazen, da ni združevanja istega repozitorija. |
| Postconditions / cleanup | Tri referenčne ocene ostanejo za dokazila, po zaključku P-CLEAN. |

| Korak | Akcija / Test Procedure | Pričakovani rezultat / Expected Result | Dejanski rezultat / Actual Result | Status PASS/FAIL | Opombe / dokazilo |
|---|---|---|---|---|---|
| 1 | P-START Q1/R1; ime QA-ZK-TS04-D0; D0; Izračunaj zrelost. | Stopnja 1 — Nivo 1 – Regresiven; privzeti pregled stopnje 2. | | | |
| 2 | Preverite priporočila pri 2 in razširite sekcije. | Manjkajo build_present, PUSH in unit_test_present. Besedila: Uvedite avtomatiziran build korak (npr. GitHub Actions, GitLab CI, Jenkins).; Nastavite vsaj en avtomatski prožilec za build (npr. PUSH).; Dodajte avtomatizirano izvajanje unit testov v cevovod. Sekcije imajo 0 %. | | | |
| 3 | Shrani ocenjevanje; preverite vrstico D0 in HTTP. | 0 %, Stopnja 1; POST /api/pipelines 201. | | | |
| 4 | Nov P-START; QA-ZK-TS04-D2; D2; Izračunaj zrelost. | Nivo 2 – Ponovljiv; privzeto pregled stopnje 3. | | | |
| 5 | Preverite priporočila pri 3 in nato izberite gumb 2. | Pri 3 manjkajo ustavitev ob neuspehu, testno poročilo in deploy (tri priporočila). Pri 2 so kriteriji izpolnjeni. Build 25 %, Unit Testing 8 %, Deploy/Drugo 0 %. | | | |
| 6 | Shrani ocenjevanje; preverite D2. | 13 %, Stopnja 2; HTTP 201. | | | |
| 7 | Nov P-START; QA-ZK-TS04-D3; D3; Izračunaj zrelost. | Nivo 3 – Konsistenten; privzeto pregled stopnje 4. | | | |
| 8 | Preverite manjkajoče kriterije in priporočila pri 4. | Manjkajo shranjevanje artefaktov, merjenje pokritosti, >=60, test in staging: pet kriterijev. Priporočilo o okoljih se lahko ponovi, ker koda ne odstrani podvojenih besedil. | | | |
| 9 | Shrani ocenjevanje; ponovno Preglej odgovore. | 21 %, Stopnja 3, odgovori ustrezajo. Pregled rezultatov je read-only, brez gumba Shrani ocenjevanje. | | | |

| Dnevnik TS-04 | Vnos ob izvedbi |
|---|---|
| RUN-ID / ponovitev | |
| Datum izvedbe, začetek/konec, časovni pas | |
| Izvajalec | |
| Commit / lokalne spremembe | |
| OS / brskalnik / različica / profil / E / Q / R | |
| Končni status scenarija | |
| Incidenti / dokazila / odstopanja | |

### TS-05 – Meje pokritosti

| Atribut | Specifikacija |
|---|---|
| ID / Title | TS-05 / Meje pokritosti |
| Author / Responsible Person | ChatGPT/Codex (osnutek) / Član 2 |
| Objective / Purpose | Preveriti spodaj/na/nad pragom in izbiro najvišje izpolnjene stopnje. |
| Traceability / Related Functionality | F-04, F-06; maturity_rules.json, assessment.js; R-08 |
| Prioriteta | Visoka |
| Preconditions | A prijavljen; Q1/R1; vsak komplet v novem obrazcu. |
| Test Environment | E-01; dejanske verzije in profil v dnevniku |
| Test Data | D59/D60/D61/D79/D80/D81; imena QA-ZK-TS05-{komplet}, link prazen. Dodatni varianti spodaj. |
| Postconditions / cleanup | Referenčne ocene ostanejo do zajema dokazov; nato P-CLEAN. |

| Korak | Akcija / Test Procedure | Pričakovani rezultat / Expected Result | Dejanski rezultat / Actual Result | Status PASS/FAIL | Opombe / dokazilo |
|---|---|---|---|---|---|
| 1 | P-START in P-CALC D59; shranite kot QA-ZK-TS05-D59. | 31 %, Nivo 3 – Konsistenten. Za 4 manjka samo >=60: Povečajte pokritost kode s testi na vsaj 60 %. | | | |
| 2 | Nov obrazec, D60; shranite QA-ZK-TS05-D60. | 31 %, Nivo 4 – Kvantitativno upravljan; natanko 60 zadostuje. | | | |
| 3 | Nov obrazec, D61; shranite QA-ZK-TS05-D61. | 31 %, Nivo 4 – Kvantitativno upravljan. | | | |
| 4 | Nov obrazec, D79; shranite QA-ZK-TS05-D79. | 41 %, Nivo 4 – Kvantitativno upravljan. Za 5 manjka samo >=80: Povečajte pokritost kode s testi na vsaj 80 %. | | | |
| 5 | Nov obrazec, D80; shranite QA-ZK-TS05-D80. | 41 %, Nivo 5 – Optimizacija; pri pregledu 5 ni manjkajočih pogojev. UI kaže Čestitamo! Ta stopnja zrelosti je že v celoti dosežena. Izpolnjeni pogoji:. | | | |
| 6 | Nov obrazec, D81; shranite QA-ZK-TS05-D81. | 41 %, Nivo 5 – Optimizacija. Numeric 81 ne pomeni 81 % skupne izpolnjenosti. | | | |
| 7 | Nov P-START z D80, pri Build → Avtomatski prožilci pustite samo Push; izračunajte brez shranitve. | Nivo 4; za 5 manjka PULLRQ. Vprašanju še vedno pripada ena utež, ne število izbranih možnosti. | | | |
| 8 | Nov P-START z D80; odstranite DA pri Merjenje pokritosti kode s testi (code coverage); izračunajte. | Nivo 3, ker 4/5 zahtevata tudi coverage_tracking=true. Ohranjenih 80 v onemogočenem otroku ne zadošča. | | | |
| 9 | V rezultatih kliknite 1 in nato 5. | Spremeni se razlaga izbrane stopnje, dosežena stopnja se samo zaradi pregleda ne spremeni. | | | |

| Dnevnik TS-05 | Vnos ob izvedbi |
|---|---|
| RUN-ID / ponovitev | |
| Datum izvedbe, začetek/konec, časovni pas | |
| Izvajalec | |
| Commit / lokalne spremembe | |
| OS / brskalnik / različica / profil / E / Q / R | |
| Končni status scenarija | |
| Incidenti / dokazila / odstopanja | |

### TS-06 – Rezultati, izvozi in YAML

| Atribut | Specifikacija |
|---|---|
| ID / Title | TS-06 / Rezultati, izvozi in YAML |
| Author / Responsible Person | ChatGPT/Codex (osnutek) / Član 2 |
| Objective / Purpose | Preveriti prikaz poročila, popolnost izvoza in kopiranje zunanje konfiguracije. |
| Traceability / Related Functionality | F-07, F-08; ResultsPanel, Dashboard, GitHubYamlViewer; R-03 |
| Prioriteta | Visoka |
| Preconditions | A prijavljen; tisk v PDF in prenosi dovoljeni. Predhodno potrjen javni referenčni repo z .github/workflows/ci.yml; zabeležen remote SHA/datum. Nedosegljiv GitHub blokira pozitivni YAML del. |
| Test Environment | E-01; dejanske verzije in profil v dnevniku |
| Test Data | D3; ime QA-ZK-TS06; referenčni link; other_description=QA izvoz čšž. Negativni URL=https://github.com/Timotejlipic/qa-zk-neobstojeci-20261117 (predhodno potrjen 404). |
| Postconditions / cleanup | Ocena in izvozi za dokaz; negativna sprememba URL ni shranjena. |

| Korak | Akcija / Test Procedure | Pričakovani rezultat / Expected Result | Dejanski rezultat / Actual Result | Status PASS/FAIL | Opombe / dokazilo |
|---|---|---|---|---|---|
| 1 | P-START Q1/R1; vnesite navedeno ime, repo, D3 in Opis dodatnih elementov; Prikaži YAML. | GitHub YAML Datoteke pokaže seznam .yml/.yaml; odgovori se ne izpolnijo samodejno. | | | |
| 2 | Izberite .github/workflows/ci.yml in primerjajte z isto trenutno datoteko na GitHub. | Prikaz ustreza izbrani datoteki in zabeleženi reviziji. | | | |
| 3 | ⎘ Kopiraj; prilepite v lokalno prazno besedilno datoteko. | Prilepljena je celotna enaka vsebina; preverite začetek, konec in prelome. Klik sam ni dokaz. | | | |
| 4 | ↺ Osveži → znova izberite datoteko → Skrij YAML. | Seznam se obnovi, panel se skrije; odgovori/ime/link ostanejo. | | | |
| 5 | Izračunaj zrelost; razširite vse sekcije, izberite stopnjo 4. | Nivo 3, priporočila kot D3; Drugo vsebuje QA izvoz čšž. | | | |
| 6 | 🖨️ Izvozi PDF; v brskalniku shranite PDF in ga odprite. | Berljivi stopnja, priporočila in odprte sekcije; šumniki pravilni, ni praznega poročila ali odrezanih ključnih podatkov. | | | |
| 7 | ✓ Shrani ocenjevanje; preverite HTTP in vrstico. | POST 201; 24 % (7/29), Stopnja 3. | | | |
| 8 | Izvozi vprašalnik pri QA-ZK-TS06; odprite vprasalnik_odgovori_qa_zk_ts06.txt. | Glava vsebuje ime, datum, Stopnja 3 in Skupni rezultat: 24%; vrhnje kategorije in dodatni tekst ustrezajo. | | | |
| 9 | V TXT poiščite Avtomatski prožilci s PUSH ter Generiranje testnega poročila=DA. | Sprejemno preverjanje popolnosti: vključeni morajo biti tudi izpolnjeni otroci. Izpuščena gnezdena vsebina je FAIL R-03, čeprav je prenos uspel. | | | |
| 10 | Preglej odgovore; ponovite PDF iz read-only rezultatov. | Ni gumba Shrani ocenjevanje. PDF tudi iz tega pogleda ni prazen; modalni tisk preverite ločeno od inline tiskanja. | | | |
| 11 | Zaprite rezultate, Uredi; zamenjajte link z negativnim URL; Prikaži YAML. | Ob HTTP 404: Repozitorij ni najden ali je zaseben. HTTP 403 kaže omejitev GitHub API in ni uspeh 404 variante. | | | |
| 12 | Nazaj brez shranitve; ponovno odprite oceno. | Ohranjen prvotni link; napaka YAML ni spremenila baze. | | | |

| Dnevnik TS-06 | Vnos ob izvedbi |
|---|---|
| RUN-ID / ponovitev | |
| Datum izvedbe, začetek/konec, časovni pas | |
| Izvajalec | |
| Commit / lokalne spremembe | |
| OS / brskalnik / različica / profil / E / Q / R | |
| Končni status scenarija | |
| Incidenti / dokazila / odstopanja | |


### TS-07 – Trajna hramba in CRUD ocen

| Atribut | Specifikacija |
|---|---|
| ID / Title | TS-07 / Trajna hramba in CRUD ocen |
| Author / Responsible Person | ChatGPT/Codex (osnutek) / Član 3 |
| Objective / Purpose | Dokazati celoten tok obrazec → API → baza → ponovni prikaz ter pravilno urejanje, filtriranje in brisanje. |
| Traceability / Related Functionality | F-04, F-09; R-01; Dashboard, api.js, C++ pipelines |
| Prioriteta | Visoka |
| Preconditions | E-01, prijavljen A; brez ocene QA-ZK-TS07. Drugi profil istega A je prazen; ekipa potrdi termin ponovnega zagona. |
| Test Environment | E-01; dejanske verzije in profil v dnevniku |
| Test Data | Q1.0/R1.0, D3 + other_description = Ročni QA preizkus; ime QA-ZK-TS07, nato QA-ZK-TS07-UREJENO; repo https://github.com/Timotejlipic/Vprasalnik-Za-CI-CD?qa=ts07. Pričakovano 7/29 = 24 %, nivo 3. |
| Postconditions / cleanup | Testna ocena izbrisana; storitve spet delujejo. Ohranite očiščene HTTP dokaze in ID PID-A. |

| Korak | Akcija / Test Procedure | Pričakovani rezultat / Expected Result | Dejanski rezultat / Actual Result | Status PASS/FAIL | Opombe / dokazilo |
|---|---|---|---|---|---|
| 1 | P-START Q1.0/R1.0; vnesite D3 in Drugo → opis = Ročni QA preizkus. Ime in repozitorij pustite prazna; izračunajte in kliknite ✓ Shrani ocenjevanje. | Opozorilo »Prosimo, vnesite ime cevovoda.«; novega strežniškega zapisa ni. Morebitna vrnitev na nadzorno ploščo ni dokaz shranjevanja. | | | |
| 2 | Znova P-START; izpolnite isti komplet, Ime cevovoda = QA-ZK-TS07 in Repo z zgornjim URL. Izračunajte ter shranite. | POST /api/pipelines vrne 201; zabeležen PID-A. Na nadzorni plošči pravilno ime/link, 24 % in Nivo 3 – Konsistenten. | | | |
| 3 | V čistem profilu prijavite A, osvežite nadzorno ploščo, odprite Uredi pri PID-A. | GET vrne isti ID in odgovore, vključno z opisom in D3. Polji ime/repo sta pravilno obnovljeni; izračun znova da nivo 3. | | | |
| 4 | Zaprite obrazec. V usklajenem terminu izvedite docker compose down in docker compose up -d (brez -v); počakajte na health in podatkovni GET. | Storitve se ponovno zaženejo z istim podatkovnim nosilcem; ocena po novi prijavi še obstaja. To preveri trajnost, ne samo localStorage. | | | |
| 5 | Pri PID-A kliknite Uredi; ime spremenite v QA-ZK-TS07-UREJENO in opis v Popravljeno QA besedilo. Izračunajte in shranite. | PUT /api/pipelines/PID-A vrne 200; ID ostane isti, samo ena vrstica; 24 %, nivo 3. Običajno urejanje ne ustvari novega zgodovinskega posnetka. | | | |
| 6 | Uporabite Preglej odgovore in nato preverite v čistem profilu še Uredi. | Prikazana pravilna stopnja/sekcije; v Uredi je novo ime in Popravljeno QA besedilo. Ponoven izračun ni spremenil odgovorov. | | | |
| 7 | V Ime / ocenjevalec vnesite qa-zk-ts07-urejeno; v Repozitorij (link) vnesite qa=ts07; Datum nastavite na datum, prikazan pri tej oceni. | Rezultat vsebuje PID-A, ob upoštevanju vseh treh filtrov. Razlika velikih/malih črk ne skrije pravilnega imena. | | | |
| 8 | Ime filtra spremenite v QA-NE-OBSTAJA-20261117, nato kliknite X Počisti filtre. | Najprej ni ujemajoče vrstice; po čiščenju so polja prazna in lastna ocena znova vidna. | | | |
| 9 | Pri testni oceni kliknite Izbriši; v potrditvi »Ali res želite izbrisati ta popis cevovoda?« izberite Prekliči. | Ocena ostane; DELETE zahteva ni poslana. | | | |
| 10 | Ponovite Izbriši in potrdite; osvežite oba profila A. | DELETE /api/pipelines/PID-A vrne 204; ocene ni več v strežniškem seznamu niti po osvežitvi čistega profila. Ostale ocene niso izbrisane. | | | |

| Dnevnik TS-07 | Vnos ob izvedbi |
|---|---|
| RUN-ID / ponovitev | |
| Datum izvedbe, začetek/konec, časovni pas | |
| Izvajalec | |
| Commit / lokalne spremembe | |
| OS / brskalnik / različica / profil / E / Q / R | |
| Končni status scenarija | |
| Incidenti / dokazila / odstopanja | |

Podatek score v surovem GET je lahko 0, ker C++ nima enakovrednega stolpca in UI oceno obnovi/izračuna. Preverjajte vidni odstotek in shranjene odgovore; same ničle v tem polju ne razglasite za izgubo odgovorov. Če je HTTP zapis neuspešen, lokalni prikaz ne zadostuje za PASS.

### 6.A Izolirani podatki za TS-08, TS-10 in TS-11

Naslednji vprašalnik in pravila so **namensko pripravljeni testni podatki**, ne vgrajena funkcionalnost ali obstoječa poslovna vprašanja. Besedila so točna glede na spodnji uvoz. Datoteki shranite kot UTF-8 in uvozite z admin računom. Q in R uvozite ločeno; potrdite uspešen HTTP zapis ter obnovo po osvežitvi.

**qa_questionnaire_90_1.json**

~~~json
{
  "version": "90.1",
  "title": "QA testni vprasalnik",
  "sections": [
    {
      "id": "qa_build",
      "label": "QA Build",
      "type": "checkbox",
      "items": [
        {
          "id": "qa_gate",
          "label": "QA korak je prisoten",
          "type": "yes_no_na",
          "description": "Testno vprasanje DA ali NA.",
          "items": [
            {"id": "qa_note", "label": "QA opomba", "type": "text"},
            {"id": "qa_count", "label": "QA stevilo", "type": "numeric"},
            {
              "id": "qa_tools",
              "label": "QA orodja",
              "type": "multiselect",
              "options": [
                {"value": "A", "label": "Orodje A"},
                {"value": "B", "label": "Orodje B"}
              ]
            }
          ]
        }
      ]
    }
  ]
}
~~~

**qa_rules_90_1.json**

~~~json
{
  "version": "90.1",
  "title": "QA testna pravila",
  "levels": [
    {"id": 1, "label": "QA osnovna", "criteria": []},
    {
      "id": 2,
      "label": "QA potrjena",
      "criteria": [
        {"item_id": "qa_gate", "operator": "=", "value": true}
      ],
      "improvement_suggestions": {"qa_gate": "Oznacite QA korak."}
    }
  ]
}
~~~

Za **Q90.2** kopirajte celoten prvi JSON v qa_questionnaire_90_2.json; spremenite samo version v "90.2" in title v "QA testni vprasalnik 2". Za **R90.2** kopirajte drugi JSON v qa_rules_90_2.json; spremenite version v "90.2" in title v "QA testna pravila 2". ID vprašanj ostanejo enaki, kar omogoča primerjavo pravil. Datoteka **qa_invalid.json** vsebuje samo znak `{`; **qa_wrong_shape.json** vsebuje `{"hello":"world"}`.

**D-QA:** QA korak je prisoten = DA; QA opomba = Prva različica; QA stevilo = 60; QA orodja = Orodje A. Pri Q90.1/R90.1 so izpolnjena 4 od 4 aktivnih vprašanj: **100 %, Stopnja 2 (QA potrjena)**. Pri staršu brez DA je aktiven samo starš. Med TS-08 se doda peto vprašanje; pred TS-11 obnovite prvotni Q90.1 iz tega JSON.

Pri uvozu aplikacija iz ID qa_build izpelje nadkategorijo **Neprekinjena integracija (CI)**. V njej poiščite sekcijo **QA Build**.


### TS-08 – Zgodovina in sprememba vprašalnika

| Atribut | Specifikacija |
|---|---|
| ID / Title | TS-08 / Zgodovina in sprememba vprašalnika |
| Author / Responsible Person | ChatGPT/Codex (osnutek) / Član 3 |
| Objective / Purpose | Preveriti verzioniranje iste ocene, nespremenljiv zgodovinski prikaz ter dopolnjevanje spremenjene definicije. |
| Traceability / Related Functionality | F-10; R-04, R-11; Dashboard, App, api.js |
| Prioriteta | Visoka |
| Preconditions | E-01; uvožena Q90.1/R90.1 iz 6.A, A prijavljen; admin v profilu C; brez testne ocene s spodnjim repozitorijem. |
| Test Environment | E-01; dejanske verzije in profil v dnevniku |
| Test Data | D-QA; ime QA-ZK-TS08; repo https://github.com/Timotejlipic/Vprasalnik-Za-CI-CD?qa=ts08; opombe Prva različica, Druga različica, Tretja različica. Novo vprašanje QA novo vprašanje, tip Potrditveno polje. |
| Postconditions / cleanup | Po dokazih odstranite oceno. Dodano vprašanje odstranite ali pred TS-11 ponovno uvozite izvirni Q90.1. Q90.1/R90.1 ohranite za nadaljnje scenarije. |

| Korak | Akcija / Test Procedure | Pričakovani rezultat / Expected Result | Dejanski rezultat / Actual Result | Status PASS/FAIL | Opombe / dokazilo |
|---|---|---|---|---|---|
| 1 | P-START Q90.1/R90.1; D-QA in metapodatki; izračunajte in shranite. Zabeležite PID-V. | POST 201; ena ocena s 100 %, stopnjo 2 (QA potrjena) in opombo Prva različica. | | | |
| 2 | Pri tej oceni kliknite Nova verzija; preverite napis USTVARJANJE NOVE VERZIJE. Spremenite samo opombo v Druga različica; izračunajte in shranite. | Isti PID-V je posodobljen s PUT 200. Nova vrstica ne nastane; stari odgovori so shranjeni v lokalni zgodovini; trenutna opomba je Druga različica. | | | |
| 3 | Kliknite številko verzije z namigom Prikaži zgodovino verzij; za prejšnji posnetek kliknite Preglej. | Odpre se Zgodovinska verzija — in NAČIN SAMO ZA BRANJE. Prikaz vsebuje Prva različica, prvotno vrednost 60 in Orodje A. Ni možnosti spreminjanja/shranjevanja zgodovinske ocene. | | | |
| 4 | Zaprite zgodovinski pregled ter odprite Uredi trenutne ocene. Nato osvežite stran v istem profilu in znova odprite zgodovino. | Trenutna opomba ostane Druga različica; zgodovina po osvežitvi istega profila ostane. Zgodovinski ogled ni prepisal trenutne ocene. | | | |
| 5 | V novem čistem profilu prijavite istega A; preverite oceno in zgodovino. | Strežnik obnovi trenutno oceno in Druga različica. Karakterizacija: lokalni stari posnetki se v nov profil ne prenesejo. Ne pripisujte aplikaciji strežniške zgodovine. | | | |
| 6 | V prvotnem profilu P-START Q90.1/R90.1; vnesite D-QA z opombo Tretja različica ter isti repo; shranite in potrdite ponujeno ustvarjanje nove verzije. | Ponudba prepozna isti repozitorij. Po potrditvi je posodobljen PID-V, ni podvojene ocene; prejšnja trenutna ocena se pojavi v lokalni zgodovini. | | | |
| 7 | Admin odpre Form Builder, Aktivna verzija 90.1; pod QA korak je prisoten klikne ＋ (Dodaj pod-element). Oznaka = QA novo vprašanje, tip = Potrditveno polje; Shrani element. Potrdite HTTP uspeh in obnovo definicije. | V isti različici 90.1 je dodan otrok z novim ID. R90.1 ostane nespremenjena. Ne ustvarite Q90.2 in ne posegajte v Q1.0. | | | |
| 8 | A osveži nadzorno ploščo in pri PID-V preveri zaznavo sprememb; klikne Posodobi vprašalnik. | Prikazano Zaznane spremembe v vprašalniku ali pravilih!; odpre se POSODOBITEV VPRAŠALNIKA z dodanim vprašanjem in potrebnim kontekstom starša. | | | |
| 9 | Po potrebi omogočite QA korak je prisoten = DA; pri QA novo vprašanje označite DA, izračunajte ter shranite. | Isti PID-V je posodobljen; nova vrednost se združi s starimi odgovori. Celota: opomba Tretja različica, število 60, Orodje A, novi DA; 5/5 = 100 %, stopnja 2. Nastane dodatni lokalni posnetek. | | | |
| 10 | Znova preverite Uredi, zgodovino in čisti profil; odstranite testno oceno ter obnovite izvirni Q90.1. | Trenutna celota je trajno shranjena. Zgodovinski pregled pokaže podatke izbranega posnetka, ne trenutnih odgovorov. Po čiščenju originalni Q90.1 ponovno vsebuje samo štiri vprašanja. | | | |

| Dnevnik TS-08 | Vnos ob izvedbi |
|---|---|
| RUN-ID / ponovitev | |
| Datum izvedbe, začetek/konec, časovni pas | |
| Izvajalec | |
| Commit / lokalne spremembe | |
| OS / brskalnik / različica / profil / E / Q / R | |
| Končni status scenarija | |
| Incidenti / dokazila / odstopanja | |

Če je na zgodovinskem zaslonu pravilen napis, odgovori pa so trenutni, korak 3 oziroma 10 označite FAIL. Odsotnost zgodovine v čistem profilu je dokumentirana omejitev, ne dokaz izgube trenutnega strežniškega zapisa.

### TS-09 – Izpad in omejitve dostopa

| Atribut | Specifikacija |
|---|---|
| ID / Title | TS-09 / Izpad in omejitve dostopa |
| Author / Responsible Person | ChatGPT/Codex (osnutek) / Član 3 |
| Objective / Purpose | Ločiti lokalni način od trajne hrambe, preveriti obnovo povezave in funkcionalno uveljavljanje pravic. |
| Traceability / Related Functionality | F-01, F-09, F-16; R-01, R-09, R-10; auth/pipelines/users API |
| Prioriteta | Visoka |
| Preconditions | E-01 in dogovorjen E-02; računa A in B obstajata, ločena profila, C admin. Pripravite A oceno QA-ZK-ACCESS z D2 (Q1/R1); zabeležite PID-X. |
| Test Environment | E-01 in E-02; profili A/B/C ter ločen profil za negativno offline prijavo |
| Test Data | QA-ZK-ACCESS, QA-ZK-OFFLINE; repo za offline https://github.com/Timotejlipic/Vprasalnik-Za-CI-CD?qa=offline; D2; napačno geslo admin = Napacno!2026. |
| Postconditions / cleanup | Backend znova dosegljiv; A odstrani obe testni oceni in morebitne svoje lokalne dvojnike. B podatki ostanejo nespremenjeni. |

| Korak | Akcija / Test Procedure | Pričakovani rezultat / Expected Result | Dejanski rezultat / Actual Result | Status PASS/FAIL | Opombe / dokazilo |
|---|---|---|---|---|---|
| 1 | Kot B odprite nadzorno ploščo; preverite navigacijo in v DevTools ročno pošljite GET /api/users z B žetonom. | B ne vidi Admin panel/Form Builder/Pravila zrelosti. API vrne 403 in Admin access required.; UI skrivanje samo po sebi ni dokaz pravic. | | | |
| 2 | Pošljite GET /api/pipelines brez Authorization glave. | HTTP 401, Authentication required.; seznam ocen ni razkrit. | | | |
| 3 | Kot B pošljite GET /api/pipelines/PID-X, nato PUT z JSON {"name":"NEDOVOLJENO"}, nato DELETE iste poti. | Vsak zahtevek vrne 403 Access denied. A v svojem profilu še vidi nespremenjeno QA-ZK-ACCESS; noben tuji zapis ni spremenjen ali odstranjen. | | | |
| 4 | Kot C pošljite GET iste ocene, nato PUT {"name":"NEDOVOLJENO"} in DELETE iste poti. | GET 200 je dovoljen adminu. PUT in DELETE 403, ker zahtevata lastništvo. Ocena A ostane nespremenjena. | | | |
| 5 | Kot A začnite novo Q1/R1, vnesite D2 in QA-ZK-OFFLINE ter repo. Ustavite samo backend: docker compose stop backend. Izračunajte zrelost. | Health ni dosegljiv; frontend ostane odprt. Lokalni izračun vrne nivo 2. Ne pričakujte klica C++ evaluate. | | | |
| 6 | Kliknite ✓ Shrani ocenjevanje; preglejte Network in nadzorno ploščo. | Karakterizacija: možen je lokalni zapis s p_ ID in 13 %, nivojem 2. Ni uspešnega strežniškega POST. V dnevnik zapišite lokalno shranjevanje, nikakor PASS trajnosti v bazi. | | | |
| 7 | V ločenem testnem profilu ob izpadu odprite prijavo; vnesite admin / Napacno!2026. | Sprejemno preverjanje: napačno geslo ne sme odpreti administracije. Če offline nadomestni način dovoli prijavo, FAIL in incident R-09; ne sprejmite tega kot uspešno avtentikacijo. | | | |
| 8 | Zaženite docker compose start backend; počakajte na health. V prvotnem profilu A obnovite veljavno online prijavo in nadzorno ploščo. | Obnova nalaganja sproži prenos lokalne ocene. Zahtevan uspešen POST in strežniški ID; sam prikaz lokalne vrstice ni dovolj. | | | |
| 9 | Osvežite nadzorno ploščo dvakrat; v čistem profilu prijavite A in nato v ločenem B. | A vidi natanko eno strežniško QA-ZK-OFFLINE z D2, 13 %, nivojem 2. B je ne vidi; ponovni nalaganji nista podvojili zapisa. | | | |
| 10 | V prvotnem profilu A se odjavite in online prijavite B; preverite seznam. Nato vrnite povezavo/račune v urejeno stanje in kot A počistite svoji oceni. | Sprejemno preverjanje: B ne vidi A lokalnih ali prenesenih ocen in nima pravic A. Če ostanek predpomnilnika to omogoči, FAIL in INC. Na koncu health/podatkovni GET delujeta. | | | |

| Dnevnik TS-09 | Vnos ob izvedbi |
|---|---|
| RUN-ID / ponovitev | |
| Datum izvedbe, začetek/konec, časovni pas | |
| Izvajalec | |
| Commit / lokalne spremembe | |
| OS / brskalnik / različica / profil / E / Q / R | |
| Končni status scenarija | |
| Incidenti / dokazila / odstopanja | |

HTTP preizkuse izvajajte ročno v DevTools z veljavnim žetonom trenutne seje, v testnem okolju. Žetona ne kopirajte v poročilo. Neuspeh enega varnostnega koraka ne spremeni pričakovanj drugih; če nadaljevanje ni mogoče, zapišite blokado.


## 7. Test Incident / Defect Report – predloga

Izpolnite ob vsakem FAIL oziroma nepojasnjenem dogodku. En incident lahko poveže več TS; različnih vzrokov ne združujte samo zato, ker se pojavijo na istem zaslonu. Statičnih tveganj R-01 … R-11 ne preimenujte v potrjene incidente brez dejanske izvedbe oziroma ločenega izrecnega pregleda.

| Atribut | Vnos |
|---|---|
| Incident ID (npr. INC-001) | |
| Kratek naslov | |
| Prijavil / odgovorna oseba za obravnavo | |
| Datum in čas odkritja / zadnje spremembe | |
| Povezan TS, varianta, RUN in korak | |
| Povezana funkcionalnost F / statično tveganje R | |
| Commit, Q/R, OS, brskalnik, način online/offline | |
| Predpogoji in konkretni testni podatki | |
| Opis odstopanja | |
| Pričakovani rezultat | |
| Dejanski rezultat / HTTP status in telo | |
| Koraki za ponovitev (1, 2, 3 …) | |
| Pogostost ponovitve | |
| Resnost / Severity (S1–S4) | |
| Prioriteta odprave (P1–P3) | |
| Vpliv / tveganje za uporabnika in podatke | |
| Status | |
| Dokazila (slika, video, očiščen log, izvoz) | |
| Začasni obhod / omejitev obhoda | |
| Dodeljeno / načrtovana odprava | |
| Verzija popravka / commit | |
| Ponovni test: datum, izvajalec, RUN in rezultat | |
| Odločitev o zaprtju / odobril | |

| Resnost | Merilo v tem projektu |
|---|---|
| S1 – kritična | Neavtoriziran dostop do tujih podatkov/administracije, obsežna izguba podatkov ali popolna blokada osrednjega toka brez obhoda |
| S2 – velika | Napačna stopnja zrelosti, neuspešna trajna hramba, napačna dodelitev/konfiguracija ali ključna funkcija brez sprejemljivega obhoda |
| S3 – srednja | Delna funkcionalna napaka z obhodom, nepopoln izvoz ali omejena težava posameznega pogleda |
| S4 – manjša | Besedilo, manjša prikazna neskladnost brez vpliva na podatke in odločitev |

Prioriteta je ločena od resnosti: P1 = pred oddajo/izdajo, P2 = naslednji načrtovani popravek, P3 = pozneje. Predlagani potek statusov: Novo → V analizi → Potrjeno → V odpravi → Za ponovni test → Zaprto; možna sta tudi Ponovno odprto in Zavrnjeno z utemeljitvijo. Za zaprtje ni dovolj razvijalčevo sporočilo »popravljeno«: ponoviti je treba neuspešni primer in povezani regresijski primer.

## 8. Test Completion / Summary Report – predloga

### Zaključno poročilo za individualno izvedbo

Gašper Kavčič je v individualnem obsegu izvedel **3 od 3 načrtovanih scenarijev**. Preveril je registracijo in prijavno sejo, gostujoče ocenjevanje ter pogojni prikaz in vnose v vprašalniku. Scenariji od TS-04 do TS-12 so del širšega ekipnega načrta in so zunaj obsega te izvedbe.

| Scenarij | Izvedba | Končni status | Ugotovitev |
|---|---|---|---|
| TS-01 – Registracija, prijava in seja | Zaključena | Prepiši iz dnevnika TS-01 | Končni status izvajalec potrdi iz lastnega zapisa. |
| TS-02 – Gost, konfiguracija in navigacija | Zaključena | Prepiši iz dnevnika TS-02 | Končni status izvajalec potrdi iz lastnega zapisa. |
| TS-03 – Pogojni obrazec in tipi | Zaključena | FAIL | Ob preklopu pogleda se izgubita ime in povezava do repozitorija. Polje za pokritost sprejme tudi vrednosti zunaj 0–100. |

**INC-001 – Izguba imena cevovoda in povezave pri preklopu prikaza**

| Atribut | Vrednost |
|---|---|
| Povezan scenarij, koraki in tveganje | TS-03, koraka 9 in 12, R-06 |
| Prijavil | Gašper Kavčič |
| Ponovitev | Kot član začni novo ocenjevanje z vprašalnikom in pravili 1.0. V Skrčljive teme vnesi ime cevovoda in povezavo do repozitorija. Preklopi v Stranski zavihki, nato nazaj. Preglej obe polji. |
| Pričakovani rezultat | Obe vrednosti ostaneta izpolnjeni med preklopoma. |
| Dejanski rezultat | Obe polji se izpraznita in po vrnitvi v prvotni pogled ostaneta prazni. |
| Vpliv in predlagana resnost | Izguba dveh neshranjenih vnosov. Vrednosti je mogoče vnesti znova. S3 – srednja. |
| Status | Odprt |
| Dokazilo | |

Pogojni prikaz in preostali koraki TS-03 so po poročilu izvajalca uspešni. Ohranjanje imena in povezave ob spremembi prikaza je pomanjkljivo. Vnos pokritosti zunaj 0–100 je potrjena omejitev preverjanja vnosa. Korak 8 je bil zasnovan za ugotavljanje trenutnega vedenja in je uspešen po merilu scenarija.

### 8.1 Identifikacija zaključnega poročila

| Atribut | Vnos |
|---|---|
| ID zaključnega poročila / verzija | |
| Referenca načrta | ZK-FT-001, različica 1.0 |
| Testirana izdaja / commit in lokalne spremembe | |
| Obdobje testiranja od–do | |
| Pripravil / pregledal / odobril | |
| Datum izdaje poročila | |
| Okolja, brskalniki, Q/R in odstopanja od E-01 | |
| Dejanski obseg izvedbe | |
| Povezava na arhiv dnevnikov in dokazil | |

### 8.2 Zbirni rezultati po scenarijih

Statusi ostanejo prazni do izvedbe. Če obstaja več RUN, navedite zadnji veljaven rezultat in povezavo na prejšnji neuspeh ter ponovni test. Starega incidenta ne izbrišite iz zgodovine.

| TS | Odgovorni član / dejansko ime | Datum izvedbe | RUN / različica | PASS/FAIL/BLOCKED/NOT RUN | Incidenti | Dokaz / opomba |
|---|---|---|---|---|---|---|
| TS-01 | Član 1 / | | | | | |
| TS-02 | Član 1 / | | | | | |
| TS-03 | Član 1 / | | | | | |
| TS-04 | Član 2 / | | | | | |
| TS-05 | Član 2 / | | | | | |
| TS-06 | Član 2 / | | | | | |
| TS-07 | Član 3 / | | | | | |
| TS-08 | Član 3 / | | | | | |
| TS-09 | Član 3 / | | | | | |

### 8.3 Zbirni rezultati vseh članov

| Član | Dodeljeni TS | Načrtovano | PASS | FAIL | BLOCKED | NOT RUN | Izvedene variante / vse variante | Odprti INC / dokazila |
|---|---|---|---|---|---|---|---|---|
| Član 1 | TS-01–TS-03 | 3 | | | | | | |
| Član 2 | TS-04–TS-06 | 3 | | | | | | |
| Član 3 | TS-07–TS-09 | 3 | | | | | | |
| Skupaj | TS-01–TS-12 | 9 | | | | | | |

Kontrola: PASS + FAIL + BLOCKED + NOT RUN = 9. Dodatni brskalnik in ponovitve niso novi scenariji; poročajte jih posebej kot RUN/variante. Delež izvedenih scenarijev = (PASS + FAIL) / 9 × 100 %. Delež uspešnih med izvedenimi = PASS / (PASS + FAIL) × 100 %; če ni izveden noben, rezultat ni določen, ne 100 %. Delno izveden scenarij brez opažene napake, a z blokiranimi koraki je BLOCKED. Število izvedenih kontrolnih točk navedite posebej, da povzetek ne skrije delno opravljene izvedbe.

| Dodatna metrika | Rezultat |
|---|---|
| Izvedeni scenariji / 9 | |
| Delež uspešnih med izvedenimi | |
| Izvedeni koraki in variante / načrtovani | |
| Funkcionalnosti F s preverjenimi pozitivnimi in negativnimi potmi | |
| Odprti incidenti S1 / S2 / S3 | |
| Ponovni testi uspešni / neuspešni / čakajoči | |
| Brskalniki/okolja z dejanskimi dokazi | |

### 8.4 Presoja zaključka

| Področje | Ugotovitev / dokaz / odločitev |
|---|---|
| Kaj je bilo dejansko testirano | |
| Odstopanja od načrta in razlogi | |
| Neizvedeni/blokirani koraki, izgubljeni dokazi | |
| Preverjanje izhodnih meril iz 3.1 | |
| Pravilnost izračuna in mejnih vrednosti | |
| Trajnost podatkov in obnova v čisti seji | |
| Ločitev uporabnikov in administratorskih pravic | |
| Uporabnost in popolnost izvozov | |
| Preostala tveganja, vključno z lokalno zgodovino in offline načinom | |
| Sprejeti incidenti: kdo jih sprejme, zakaj, do kdaj | |
| Priporočilo: pripravljeno / pogojno pripravljeno / ni pripravljeno | |
| Zahtevani naslednji koraki, odgovorna oseba, rok | |
| Shranjeni izdelki: specifikacije, dnevniki, podatki, INC in izvozi | |
| Ponovno uporabni testni podatki in postopki | |
| Nauki in izboljšave prihodnjega testiranja | |


