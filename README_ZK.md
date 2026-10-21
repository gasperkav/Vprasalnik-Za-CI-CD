# ZK – pregled namestitve, standardov kodiranja in kakovosti

Projekt: **Vprašalnik-Za-CI-CD**. Datum pregleda: **20. 10. 2026**.

Ta dokument vsebuje pregled lokalne kopije projekta, izvedene spremembe in rezultate preverjanj po navodilu naloge. Dokument še ni dokaz uspešne vzpostavitve celotne aplikacije: zagon Dockerja, uporabniški scenariji in individualni preizkusi članov ekipe ostajajo neizvedeni. Pregled je izvedel ChatGPT/Codex na uporabnikovo zahtevo; to niso samostojna opažanja članov ekipe.

## 1. Začetno stanje in način preverjanja

- Okolje: Windows, PowerShell; obstoječa lokalna kopija repozitorija, ne svež klon.
- Node.js: 20.19.6; npm: 10.8.2; Docker CLI: 29.5.2; CMake: 4.3.2.
- Pred začetkom sprememb `git status --short` ni prikazal sprememb.
- Pregledani so bili README, frontend/backend dokumentacija, Compose, Dockerfiles, CMake, konfiguracija Vite, validator, obstoječi testi in GitHub Actions.
- Pred namestitvijo odvisnosti mapa `node_modules` ni obstajala. Poskus `npm ci` je pustil nepopolno namestitev; pred naslednjo gradnjo ponovno izvedite uspešen `npm ci`.
- Dostop procesa do Docker API je zavrnjen. To ne dokazuje napake aplikacije ali nedelujočega Dockerja v uporabnikovi seji.
- Linux in macOS nista bila preizkušena. Javne namestitve in GitHub Actions izvajanj nismo preverili.

## 2. Ugotovljena neskladja in ukrepi

| Ugotovitev | Ukrep oziroma stanje |
|---|---|
| Frontend dokumentacija je dopuščala Node.js 18 | Popravljeno glede na `engines` v package-lock: `^20.19.0 || >=22.12.0`; za ponovljiv razvoj priporočamo vejo 22 z različico najmanj 22.12. |
| Povezave na lokalni disk avtorja `file:///...` | V glavnem in frontend README zamenjane z relativnimi povezavami. |
| Vite je tudi pri ročnem zagonu ciljal `backend:3002` | Privzeto zdaj uporablja `localhost:3002`; Compose za frontend določi `API_PROXY_TARGET=http://backend:3002`. Dejanski HTTP promet še ni preverjen. |
| Navodila so uporabljala `npm install` kljub lock datoteki | Zamenjano z `npm ci`, ki uporabi zaklenjene odvisnosti. |
| Primer backend konfiguracije je navajal DB_HOST in podobne spremenljivke | Zamenjan z dejansko uporabljeno `DATABASE_URL`; dodano pojasnilo, da backend `.env` sam ne bere. |
| Obstajata dve kopiji SQL | SHA-256 ob pregledu enak; lokalni Compose uporablja korensko `vprasalnik.sql`. Kopij nismo brisali; ob spremembah sheme ju je treba uskladiti ali pozneje poenotiti. |
| Samodejna inicializacija baze ni dovolj jasno ločena od obstoječih podatkov | Spodaj je pojasnjen prvi zagon, trajni nosilec in nevarnost `down -v`. |
| Backend pri samodejnem uvozu bere `/app/*.json` | To je Docker pot. Ročni zagon zahteva ločeno ureditev začetnih podatkov; tega nismo spreminjali ali potrdili. |
| Slabše berljiv validator: `c`, `cat`, `ans`, več stavkov v vrstici | Izvedena ureditev `src/utils/validator.js`, brez namerne spremembe logike. |
| Testni ukaz je vključil samo eno datoteko | Zdaj `node --test` sam odkrije teste. Začasni poskus z globom `test/*.test.js` je na Windows odpovedal; zato je uporabljen prenosljiv ukaz brez globa. |
| Samo štirje testi pomožne kategorizacije | Dodanih šest testnih primerov validatorja; vseh deset lokalno uspe. |
| Ni dokazov o API/E2E/backend testih in samodejnem preverjanju sloga | Označeno kot vrzel, brez trditve, da so te aktivnosti že uvedene. |

## 3. Ponovljiv postopek namestitve

### Predpogoji in razlike med sistemi

| Sistem | Potrebno začetno stanje | Stanje preverjanja |
|---|---|---|
| Windows | Git, Docker Desktop z Linux vsebniki in delujočim Docker Engine; izpolnjeni predpogoji virtualizacije izbranega Docker okolja | Statični pregled in Node testi izvedeni; Docker zagon blokiran zaradi dovoljenj procesa. |
| Linux | Git, Docker Engine in Compose v2; uporabnik ima dovoljenje za dostop do Dockerja | Navodila pripravljena, namestitev nepreizkušena. |
| macOS | Git, delujoč Docker Desktop; za uporabljeno arhitekturo morajo biti dosegljive slike in odvisnosti | Navodila pripravljena, namestitev nepreizkušena. |

Na vseh sistemih potrebujete dostop do interneta za slike, npm in prenose CMake odvisnosti. Vrata 5173, 3002 in 5432 morajo biti prosta. Preverite tudi, da ne obstajajo drugi vsebniki z imeni `cicdq-frontend`, `cicdq-backend`, `cicdq-db`. Različno ime Compose projekta ne odpravi konflikta teh izrecno določenih imen.

### Sveža namestitev z Dockerjem

Vsak član naj postopek izvede samostojno in zabeleži rezultat. Za preverjanje svežega klona uporabite novo mapo; ne prepisujte razvojne kopije.

```sh
git --version
docker --version
docker compose version
docker info
git clone https://github.com/Timotejlipic/Vprasalnik-Za-CI-CD.git
cd Vprasalnik-Za-CI-CD
docker compose config --quiet
docker compose up --build
```

Pri lokalnem Compose ne potrebujete lastne `.env`; nastavitve so podane v `docker-compose.yml`. Primerne so za lokalno demonstracijo. Navodila niso postopek produkcijske namestitve.

V drugem terminalu:

```sh
docker compose ps
docker compose logs --tail=100 db backend frontend
```

Odprite `http://localhost:5173`. Preverite oba naslova `http://localhost:3002/health` in `http://localhost:5173/health`; pričakovano telo je `{"status":"ok"}`. Drugi naslov preveri tudi Vite posredovanje. Sam odziv `/health` še ne preveri vseh podatkovnih operacij.

Začetni administrator je v korenskem SQL naveden kot `admin` / `password`. To je pričakovanje iz kode; prijava v tej seji ni bila preizkušena. Gost in prikaz podatkov iz localStorage nista dokaz delovanja baze. Za preverjanje uporabite nov profil brskalnika oziroma zasebno okno in preverite tudi omrežne odzive API v razvojnih orodjih brskalnika.

SQL se izvede ob inicializaciji praznega PostgreSQL nosilca. Obstoječ nosilec ohrani stare podatke; sprememba SQL sama ne spremeni že inicializirane baze. `depends_on` določa vrstni red zagona, ne zagotavlja pripravljenosti baze. Ob začetni napaki preverite dnevnike in pripravljenost baze; backend ima nastavljen ponovni zagon.

Ustavitev in ponovni zagon brez brisanja podatkov:

```sh
docker compose down
docker compose up --build
```

**Samo za nameren izbris testne baze** uporabite `docker compose down -v`. Ta ukaz izbriše podatke nosilca; ni potreben za običajen ponovni zagon. Med pregledom ni bil izveden.

### Ročni razvojni zagon

Frontend potrebuje Node.js, skladen z `^20.19.0 || >=22.12.0`:

```sh
node --version
npm --version
npm ci
npm test
npm run build
npm run dev
```

Frontend privzeto posreduje na lokalni backend. Za drugačen naslov v PowerShell pred `npm run dev` nastavite:

```powershell
$env:API_PROXY_TARGET = 'http://localhost:3002'
```

V bash/zsh lahko uporabite `API_PROXY_TARGET=http://localhost:3002 npm run dev`.

Za backend so potrebni CMake >= 3.20, primeren C++ prevajalnik, PostgreSQL in razvojna knjižnica libpq; libpqxx CMake poišče ali prenese. Sistemski libpqxx mora biti združljiv s projektom. Na Windows potrebujete tudi ustrezno C++ razvojno orodje; sam nameščen CMake ne zadostuje. CMake v tej seji ni našel prevajalnika, zato ročna gradnja ni potrjena.

```sh
cmake -S backend -B backend/build -DCMAKE_BUILD_TYPE=Release
cmake --build backend/build --config Release
```

Pred zagonom strežnika pripravite prazno bazo `vprasalnik` ter vanjo uvozite korenski SQL, na primer z `psql -h localhost -U postgres -d vprasalnik -f vprasalnik.sql`. Spremenljivke `PORT`, `JWT_SECRET`, `FRONTEND_ORIGIN` in `DATABASE_URL` nastavite v okolju procesa, skladno z `backend/.env.example`; zgolj kopiranje v `.env` ne zadostuje. Pot izvršne datoteke je odvisna od generatorja CMake. Ker koda za samodejni uvoz uporablja `/app/*.json`, je za celovito začetno stanje priporočen Docker postopek; ročni zagon in uvoz začetnih vprašalnikov je treba še preveriti.

## 4. Standardi kodiranja

Pred pregledom ni bila najdena posebna dokumentirana politika kodiranja. Spodaj je predlog na osnovi obstoječe kode, uporabljen pri tem popravku. Ekipa ga mora pregledati in potrditi; dokument ne trdi, da je bil že prej formalno dogovorjen ali dosledno uveden povsod.

| Področje | Pravilo |
|---|---|
| JS/JSX funkcije, lokalne spremenljivke | camelCase; opisna imena, npr. `criterion`, `category`, `answer` |
| React komponente in njihove datoteke | PascalCase, npr. `ResultsPanel.jsx` |
| Konstante za nespremenljive konfiguracijske ključe | UPPER_SNAKE_CASE; navadne lokalne vrednosti ostanejo camelCase |
| JS/JSX oblika | Dva presledka, podpičja, enojni narekovaji, zaviti oklepaji tudi pri enovrstičnih pogojih |
| C++ tipi | PascalCase; prostori imen z malimi črkami |
| C++ funkcije in podatkovni člani | snake_case po obstoječih primerih, npr. `create_user`, `password_hash`; zunanje API ključe ohranimo |
| C++ oblika | Štirje presledki; oklepaj bloka v naslednji vrstici, skladno z obstoječimi datotekami |
| Komentarji | Razložijo namen ali omejitev; ne podvajajo očitnega delovanja |
| Gnezdenje | Zgodnje vrnitve za posebne primere, kratki in berljivi bloki |
| Združljivost podatkov | Ne preimenujemo JSON/SQL ključev, npr. `item_id`, samo zaradi sloga lokalnih spremenljivk |

Izbrana datoteka: [src/utils/validator.js](src/utils/validator.js). `c`, `cat`, `ans` so zamenjani z opisnimi imeni; večstavčni enovrstični blok in enovrstični pogoji so razširjeni. Podpisi funkcij, JSON ključi in pričakovani rezultati so ohranjeni. Šest novih primerov je uspelo pred refaktoriranjem in po njem. To potrjuje preverjene primere, ne vseh možnih vhodov ali celotne aplikacije.

## 5. Testiranje in zagotavljanje kakovosti

| Aktivnost | Stanje | Pokriti del rešitve | Orodja/ogrodja | AI in preverjanje |
|---|---|---|---|---|
| Obstoječi enotski testi | 4/4 uspešni lokalno | `getSuperCategory`: build, test, deploy, privzeti odgovor | node:test, node:assert | Prejšnja uporaba AI ni ugotovljena; Codex je teste izvedel. |
| Novi regresijski/enotski testi | 6/6 uspešni pred in po spremembi validatorja | Enolični ID-ji, manjkajoče zbirke, reference pravil, metapodatki, tipi odgovorov, zaokroževanje, prazni sklopi | node:test, node:assert/strict | Codex pripravil teste; rezultat preverjen z izvajanjem in znanimi pričakovanji. Neodvisen človeški pregled še potreben. |
| Avtomatiziran CI za frontend | Konfiguracija obstaja; oddaljeni rezultat nepreverjen | Namestitev odvisnosti, testi, gradnja frontenda ob push/PR na main | GitHub Actions, npm, Vite | Izvorna uporaba AI neznana; Codex pregledal YAML. |
| Avtomatiziran CI za backend | Konfiguracija obstaja; oddaljeni rezultat nepreverjen | Konfiguracija in prevajanje strežnika; brez izvajanja backend funkcionalnih testov | GitHub Actions, CMake, C++ | Izvorna uporaba AI neznana; Codex pregledal YAML. |
| Lokalna namestitev odvisnosti in frontend gradnja | Blokirano: npm ETIMEDOUT; nato `vite` ni na voljo | Ponovljiva namestitev in gradnja nista potrjeni | npm ci, npm run build | Codex izvedel ukaza in pregledal izhod. |
| Lokalna backend gradnja | Blokirano: CMAKE_CXX_COMPILER ni najden | Prevajanje ni potrjeno | CMake, generator Visual Studio 2019 | Codex izvedel konfiguracijo in pregledal izhod. |
| Validacija Compose | Uspešna, izhodna koda 0; opozorilo dostopa do Docker config | Sintaksa in razrešitev lokalnega Compose | docker compose config --quiet | Codex izvedel ukaz; ne dokazuje zagona. |
| Pregled kode in dokumentacije | Izveden v opisanem obsegu | Dokumentacija, konfiguracija, validator | Branje kode, Git diff, Node preverjanje sintakse | Codex primerjal dokumentacijo z datotekami; pregled ekipe še potreben. |
| Opozorila C++ prevajalnika | Konfigurirana; lokalno niso izvedena | `/W4` ali `-Wall -Wextra -Wpedantic` | CMake, prevajalnik | Codex preveril konfiguracijo; prvotna uporaba AI neznana. |
| Ročni sprejemni in integracijski preizkusi | Pripravljeni, neizvedeni | Celoten tok uporabnik–frontend–backend–baza | Brskalnik, Docker, dnevniki | Codex pripravil scenarije; rezultat mora zabeležiti izvajalec. |
| API/E2E/backend avtomatizirani testi | V pregledanih datotekah niso najdeni | Pokritost ni izkazana | Ni najdenega ogrodja | Ni dodano; ne pripisujemo neobstoječih rezultatov. |
| Samodejno preverjanje sloga in merjenje pokritosti | Nista konfigurirana v pregledanem obsegu | Doslednost sloga oziroma odstotek pokritosti nista izkazana | Ni najdenih lint/format/coverage korakov | Ročni pregled ni nadomestilo za te aktivnosti. |

### Izvedeni ukazi in dejanski rezultati

| Ukaz/preverjanje | Rezultat 20. 10. 2026 |
|---|---|
| `npm test` pred spremembami | 4 uspešni, 0 neuspešnih |
| `npm test` z dodanimi testi pred refaktoriranjem | 10 uspešnih, 0 neuspešnih |
| `npm test` po refaktoriranju | 10 uspešnih, 0 neuspešnih |
| `npm ci --no-audit --no-fund --fetch-retries=0 --fetch-timeout=20000` | Neuspešno: ETIMEDOUT pri npm registru; tudi opozorila EPERM pri čiščenju. Namestitev je nepopolna. |
| `npm run build` | Neuspešno: `vite` ni prepoznan, ker odvisnosti niso uspešno nameščene. |
| `cmake -S backend -B backend/build -DCMAKE_BUILD_TYPE=Release` | Neuspešno: ni C++ prevajalnika. |
| `docker compose config --quiet` | Uspešno; opozorilo, da uporabniška Docker konfiguracija ni berljiva. |
| `docker compose ps` | Blokirano: permission denied pri povezavi z Docker API. Celoten zagon zato ni bil izveden. |
| SHA-256 obeh SQL datotek | Enaka vsebina ob pregledu. |
| `node --check` za validator, nove teste in Vite konfiguracijo | Vsa tri preverjanja sintakse uspešna. |
| `git diff --check` | Brez napak belin; Git opozarja le na prihodnjo pretvorbo LF v CRLF. |

Odstotka pokritosti ne navajamo, ker ni bil izmerjen. Uspešni testi validatorja niso dokaz pravilnosti glavnega izračuna zrelosti ali avtentikacije. Novih CI rezultatov ni, dokler spremembe niso objavljene in izvedene na GitHubu.

## 6. Scenariji za dokončanje preverjanja

Vsi spodnji scenariji imajo stanje **NI IZVEDENO**. Pri izvedbi zapišite datum, člana, dejanski rezultat in povezavo na dokaz. Uporabljajte izključno testne podatke.

| ID | Koraki | Pričakovani rezultat |
|---|---|---|
| S1 | Svež klon, dokumentirani predpogoji, Compose build/up, ps in oba health naslova | Tri delujoče storitve, brez trajnih napak; oba health odziva uspešna. |
| S2 | Prijava s pravilnim in napačnim geslom | Pravilno geslo omogoči prijavo; napačno je zavrnjeno brez prijavne seje. |
| S3 | Registracija enoličnega uporabnika, odjava, ponovna prijava | Račun se ohrani in se je z njim mogoče ponovno prijaviti. |
| S4 | Administrator pripravi uporabnika/dodelitev; uporabnik odpre dodeljen vprašalnik | Prikazana prava dodelitev in izbrana različica vprašalnika. |
| S5 | Izpolnitev vprašalnika z vnaprej pripravljenimi odgovori | Shranjeni odgovori in rezultat; brez napak API. |
| S6 | Pred oddajo ročno določite pričakovani nivo po izbranih pravilih in ga primerjajte z rezultatom | Doseženi nivo in manjkajoči pogoji ustrezajo konkretnim pravilom. Zabeležite različici in vhodne odgovore. |
| S7 | Navaden uporabnik preveri nedostopnost admin funkcij; z njegovim žetonom preverite tudi zaščiteno API pot | Backend zavrne nedovoljeno operacijo; samo skrit gumb ni zadosten dokaz. |
| S8 | Po shranitvi izvedite down/up brez -v; preverite v novi seji brskalnika | Podatki ostanejo v bazi in so znova dostopni prek API. |
| S9 | Ponovite svežo namestitev na drugem OS, če je na voljo | Zapišite dejanski izid in razlike; ob neizvedbi označite nepreverjeno. |

### Individualna opažanja in skupni povzetek

Vsak član naj samostojno pripravi zapis. Spodnjih praznih mest ne predstavljajte kot opravljeno delo.

| Član | Datum, OS in različice | Začetno stanje | Izvedeni koraki | Neskladja, dejanski rezultati in dokazi |
|---|---|---|---|---|
| Vpiše član 1 | Ni vneseno | Ni vneseno | Ni izvedeno/zabeleženo | Ni vneseno |
| Vpiše član 2 | Ni vneseno | Ni vneseno | Ni izvedeno/zabeleženo | Ni vneseno |
| Dodatni člani po potrebi | Ni vneseno | Ni vneseno | Ni izvedeno/zabeleženo | Ni vneseno |

Skupni povzetek trenutnega pregleda: dokumentacija je vsebovala dejanska konfiguracijska neskladja; najdena neskladja so odpravljena ali izrecno dokumentirana. Testiranje je bilo omejeno na kategorizacijo, zdaj vključuje tudi validator. Pravilnost celotnega sistema in namestitev na različnih OS še nista potrjeni. Po individualnih preizkusih združite ponovljene ugotovitve, ohranite različna opažanja ter dopišite odprte in odpravljene težave.

## 7. Celoten seznam sprememb v tej izvedbi

| Datoteka | Sprememba |
|---|---|
| `README_ZK.md` | Nov dokument: zapis sprememb, ugotovitev, standardov, testiranja, AI in nadaljnjih preverjanj. |
| `README.md` | Relativna SQL povezava, npm ci, povezava na dopolnila ZK. |
| `frontend-README.md` | Popravljena zahtevana različica Node, relativna CSS povezava, npm ci in opis cilja API. |
| `backend-README.md` | Popravljen primer DATABASE_URL, pojasnjeno nalaganje okolja, SQL, libpqxx in omejitev /app. |
| `vite.config.js` | Privzeti lokalni cilj proxy in možnost API_PROXY_TARGET. |
| `docker-compose.yml` | Za frontend nastavljen Docker cilj proxy. |
| `src/utils/validator.js` | Opisna imena in večvrstični bloki po standardu; namen je ohraniti vedenje. |
| `test/validator.test.js` | Šest novih testnih primerov validatorja. |
| `package.json` | Testni ukaz node --test za samodejno odkrivanje testov. |

Obstoječi GitHub Actions že kliče `npm test`, zato bo po objavi uporabil razširjen nabor brez spremembe workflowa. Namestitev je ustvarila tudi začasno nepopolno mapo node_modules in CMake mapo backend/build; obe sta ignorirani v Git in nista del oddaje. Spremembe niso commitane, potisnjene ali objavljene; podatki baze niso bili brisani.

## 8. Uporaba generativne umetne inteligence in oddaja

Uporabljeno orodje: **OpenAI ChatGPT/Codex**. Uporabljeno za pregled repozitorija, primerjavo dokumentacije s konfiguracijo, popravek proxy nastavitev, ureditev izbrane datoteke, pripravo testov in tega poročila. Podagentov nismo uporabili. Rezultati so bili preverjeni z lokalnim izvajanjem testov, pregledom sprememb, preverjanjem sintakse in validacijo Compose; neuspešna oziroma blokirana preverjanja so navedena zgoraj. Pretekle uporabe AI pri Praktikumu II iz kode ni mogoče zanesljivo ugotoviti; vsak član naj jo navede za svoj del.

Pred oddajo ekipa dokonča individualne preizkuse in tabelo scenarijev, pregleda spremembe in predlagane standarde ter preveri zadnji GitHub Actions zagon po objavi sprememb. Oddajte povezavo do repozitorija, tega dokumenta in primerjave sprememb/commita, rezultate CI ter dejanske dokaze o delujoči rešitvi. Za prikaz na vajah pripravite lokalno delujočo aplikacijo. Dokument brez teh dopolnitev ne predstavlja dokončane ekipne oddaje.
