# ZK – nova postavitev testiranja enot

Datum: 16. 11. 2026.

## Ogrodje in zagon

Uporabljamo vgrajeni **Node.js test runner (`node:test`)**, stroge trditve `node:assert/strict`, native `mock.fn` in V8-merjenje pokritosti. Za teste ni potrebna namestitev paketov, baza, Docker, omrežje ali brskalnik. Lokalno preverjeno z Node.js 20.19.6; CI uporablja Node.js 22. Priporočen je Node.js 22.

Vitest je bil prvotna izbira, vendar je okolje zavrnilo dostop do registra npm (`EACCES`), lokalni predpomnilnik pa ga nima. Zato nova postavitev uporablja dejansko razpoložljivo ogrodje. Paketov Vitest ni v `package.json`; lockfile ostaja veljaven. To niso predelani stari testi: vsi testni scenariji so napisani na novo.

Iz korenske mape projekta:

```sh
npm test
npm run test:coverage
npm run test:watch
```

Posamezna enota ali scenarij:

```sh
node --test tests/unit/checkCriterion.test.js
node --test --test-name-pattern="should round" tests/unit/evaluateAssessment.test.js
```

`npm ci` je potreben za razvoj in gradnjo frontenda, za te teste pa ne. Lokalni poskus namestitve projektnih odvisnosti brez omrežja ni uspel, ker paket `tapable` ni v predpomnilniku. Gradnje frontenda zato v tem okolju ni bilo mogoče potrditi.

## Odstranjeno staro stanje

- `test/utils.test.js` in `test/validator.test.js`.
- `scripts/coverage.mjs` in `scripts/mutations.mjs`.
- Stara lokalna `coverage/lcov.info` in `coverage/test-results.tap`.
- Stari npm ukaz `test:mutations` in pripadajoči CI korak.
- Stari opis testiranja v tem dokumentu je nadomeščen s trenutno specifikacijo.

Datoteke v `evidence/zk2/` so bile izbrisane že pred začetkom tega posega; nismo jih obnavljali ali predstavljali kot rezultate novih testov. `README_ZK.md` ostaja zgodovinski zapis prve naloge.

## Izbrane enote in pogodbe

Funkcije so javno dostopne prek `src/utils.js`, implementacija izračunov je v `src/utils/assessment.js`. Premik ohranja obstoječe uvoze aplikacije. Dodatna enota je v `src/utils/clipboard.js`.

| Enota | Zakaj ni trivialna | Vhod, izhod in meje |
|---|---|---|
| `checkCriterion` | Več operatorjev, normalizacija logičnih odgovorov, članstvo in številske meje. | Vhod: objekt odgovorov in kriterij z nepraznim nizom `item_id`, neobveznim `operator` ter `value`. Izhod: boolean. Privzeti operator je `=`. `true` ustreza `true`/`DA`; `false` ustreza `false`/`NE`/manjkajočemu odgovoru/null/praznemu nizu. Druge enakosti so stroge. `includes` išče cel element polja ali z vejico ločen niz, ne podniza. Številske primerjave sprejmejo končna števila in neprazne številske nize; 0 in negativna števila sta veljavna. Boolean, polja, objekti, NaN in neskončnost niso števila. Neznan operator ali neveljaven številski operand vrne false. Napačna struktura argumentov ali ID sproži TypeError. |
| `evaluateAssessment` | Rekurzivni izračun odstotka, dve obliki pravil, izbira stopnje in priporočila. | Vhod: objekt odgovorov, kategorije in pravila. Izhod: `{ score, level, levelName, missing }`. Odstotek je zaokrožen na celo število 0–100; priporočil je največ 15 skupaj z uvodno vrstico. Pri kriterijih mora stopnja izpolniti vse pogoje, izbere pa se najvišja izpolnjena stopnja neodvisno od vrstnega reda in izpolnjenosti nižjih stopenj. Podvprašanja štejejo le ob pritrdilnem staršu. |
| `getMaxScore` | Rekurzivno prehaja več kategorij in poljubno gnezdenje, ločuje pet tipov vprašanj. | Za vsak `yes_no_na`, `checkbox`, `text`, `numeric` in `multiselect` prišteje 10. Neodvisno od odgovorov prešteje tudi podvprašanja. Nepodprti tipi ne prispevajo točk, njihove otroke pa preišče. Brez točkovanih vprašanj vrne 100; rezultat je lahko večji od 100. null/undefined kategorije ali items pomenijo prazno zbirko; napačne strukture sprožijo TypeError. |
| `copyToClipboard` | Asinhroni primarni API, rezervni DOM postopek, napake in čiščenje. | Sprejme niz, tudi prazen. Vrne Promise<boolean>. V varnem kontekstu najprej poskusi Clipboard API. Ob zavrnitvi, odsotnosti API-ja ali nevarnem kontekstu uporabi rezervni postopek. Ob napaki vrne false in odstrani začasni element. Nenizovni vhodi vrnejo false brez klicev zunanjih API-jev. |

### Podrobnosti ocenjevanja

- Pri pravilih s kriteriji šteje vsako aktivno vprašanje navedenih petih tipov 10 možnih točk. Checkbox/yes_no_na sta izpolnjena le ob true/DA, besedilo ob nepraznem nizu po trim, numeric ob končni številski vrednosti, multiselect ob nepraznem polju. `NA` v tem načinu ostaja neizpolnjeno vprašanje v imenovalcu.
- Pri starem načinu s `minScore` štejejo samo neposredna vprašanja yes_no_na, checkbox in text; `NA` pri yes_no_na se izloči iz imenovalca. To namenoma ohranja obstoječi ločeni način, ne uvaja nove poslovne definicije starega vprašalnika. Izbere se najvišji doseženi prag, ne glede na vrstni red pravil.
- Prazni/null/undefined kategorije in pravila so prazne zbirke. S praznimi odgovori vrnejo 0 točk, stopnjo 1, ime `Začetna` in prazen seznam priporočil. Odgovori morajo biti objekt; napačne strukture, neveljavni elementi in kriteriji sprožijo TypeError, tudi v neaktivnih podvprašanjih.
- Prazna ali manjkajoča zbirka kriterijev pomeni brezpogojno stopnjo v kriterijskem načinu. Če nobena stopnja ne ustreza, ostane stopnja 1 oziroma najnižja konfigurirana stopnja, če stopnje 1 ni.
- Priporočila vsebujejo le neizpolnjene pogoje naslednje številčne stopnje. Uporabijo namensko besedilo priporočila ali opis pogoja. Vhodi se ne spreminjajo.
- Validacija preverja strukture, ki jih enote potrebujejo; ne nadomešča popolne validacije sheme vprašalnika (npr. unikatnosti ID-jev ali poslovnih omejitev posameznih numeričnih vprašanj).

## Testi in izolacija

| Datoteka | Vsebina |
|---|---|
| `tests/unit/checkCriterion.test.js` | Enakost, članstvo, vse štiri numerične primerjave pod/na/nad mejo, napačni tipi in izjeme. |
| `tests/unit/getMaxScore.test.js` | Vsi podprti tipi, gnezdenje, več kategorij, prazen vhod, napačne strukture, vrstni red in nespremenjenost podatkov. |
| `tests/unit/evaluateAssessment.test.js` | Oba načina, vsi tipi odgovorov, dva negativna odgovora, starši/otroci/vnuki, pragi in zaokroževanje, priporočila, omejitev 15, nespremenjenost vhodov, neveljavni vhodi. |
| `tests/unit/clipboard.test.js` | Mocki navigator/window/document; uspeh, prazen niz, zavrnitev Promise, HTTP, odsoten API, neuspeh in izjema rezervnega postopka, čiščenje DOM. |

Izračuni so deterministični in brez zunanjih odvisnosti, zato jih ne mockamo. Brskalniške odvisnosti odložišča nadomestimo v celoti in prvotne globalne objekte obnovimo po vsakem testu. Testi ne dostopajo do uporabnikovega odložišča, baze, omrežja ali datotečnega sistema. Skripta za poročila seveda zapisuje rezultate na disk.

`tests/helpers/cases.js` registrira vsako vrstico podatkov kot ločen native test; ne izvaja lastnih trditev. `assertFields.js` s strogo enakostjo primerja izbrana javna polja rezultata. Pričakovane vrednosti niso izračunane z enoto, ki jo testiramo.

## Popravki produkcijske kode

Testi preverjajo pogodbo, ne ohranjajo napačnega obnašanja. Popravili smo:

- Pretvarjanje boolean, polj, praznih presledkov in neskončnosti v veljavne številske odgovore.
- Štetje `true` kot veljavnega odgovora za besedilo ali multiselect.
- Sesutje starega ocenjevanja ob nenizovnem besedilnem odgovoru.
- Odvisnost izbire starega praga od vrstnega reda pravil.
- Nenadzorovane napake pri neveljavnih strukturah in obravnavo praznih pravil.
- Začasni DOM element, ki je ob izjemi ostal pripet, ter sprejemanje nenizovnih vhodov za odložišče.

## Pokritost in CI/CD

`npm run test:coverage` uporablja native V8/LCOV reporter. `scripts/test-coverage.mjs` izbere zapisa za oba ciljna modula, pripravi HTML z označenimi vrsticami, JSON in Markdown ter preveri pragove za vsak modul: **90 % vrstic, 85 % vej in 90 % funkcij**. Napaka testa ali nedosežen prag vrneta exit code 1; manjkajoče metrike povzročijo napako. Poročila nastanejo tudi ob navadnem neuspešnem testu.

Rezultati so v:

- `coverage/index.html` – pregled in povezavi do izvorne kode z označenimi vrsticami;
- `coverage/lcov.info` – standardni strojno berljiv format;
- `coverage/coverage-summary.json` in `coverage/summary.md` – metrike in pragovi;
- `coverage/test-results.txt` – rezultat zagona.

To je pokritost izbranih modulov, **ne celotne aplikacije**. React UI, API, preostale pomožne funkcije, validator in C++ backend niso vključeni v pragove. Native izpis lahko vsebuje tudi uvožene datoteke in teste; omejen povzetek na koncu ter artefakti jasno določajo dejanski obseg. V8-jeva branch metrika ni dokaz, da so preverjene vse možne kombinacije pogojev; zato posebej testiramo mejne vrednosti.

Workflow `.github/workflows/ci.yml` teče ob push, pull request in ročno. Opravilo `unit-tests` izvede teste s pokritostjo. Opravili `frontend` in `backend` imata `needs: unit-tests`, zato ob neuspehu ne stečeta. Diagnostični prenos poročila z `if: always()` ostane dovoljen tudi ob neuspehu in ga ne spremeni v uspeh.

Na GitHubu: **Actions → CI Pipeline → izbrani zagon → Artifacts → unit-test-coverage**. Po prenosu razširi ZIP in odpri `index.html`. Povzetek je tudi v zavihku Summary in konzoli. Artefakt se hrani 14 dni. Dejanski oddaljeni zagon bo izveden ob pushu; spremembe niso bile samodejno pushane.

## Pregled kakovosti in preverjanje

- Lokalni osnovni zagon: **179 testov, 179 uspešnih, brez preskočenih**.
- Pregledane so konkretne pričakovane vrednosti, smiselnost trditev, neodvisnost testov, obnova mockov in razlikovanje mejnih scenarijev. Tabelarični primeri imajo različne vhodne razrede; niso kopije istega preverjanja.
- Tri začasne semantične napake so morale povzročiti neuspeh testov: `>=` spremenjen v `>`, `Math.round` v `Math.floor`, utež 10 v 5. Izvorna koda se po preverjanju obnovi.
- Začasni namerno neuspešen test preveri, da celoten ukaz za pokritost vrne exit code 1 in vseeno ustvari poročilo. Test se nato odstrani in izvede se končni zeleni zagon.
- Lokalni izmerjeni vrednosti: assessment 99,24 % vrstic / 99,38 % vej / 100 % funkcij; clipboard 100 % vrstic / 92,86 % vej / 100 % funkcij. Metrike se lahko med različicami Node/V8 razlikujejo; veljavni so rezultati konkretnega zagona.
- Gradnja frontenda in oddaljeni GitHub Actions zagon v tem okolju nista potrjena. Testi enot so preverjeni lokalno in ne potrebujejo frontend odvisnosti.
