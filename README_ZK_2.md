# ZK – 2. naloga: testiranje enot

Datum: 21. 10. 2026. Projekt: Vprašalnik-Za-CI-CD.

## Izbrane enote in pričakovano delovanje

Izbrane so tri funkcije iz src/utils/validator.js. Specifikacija se nanaša na neposredna vprašanja category.items; rekurzivno preverjanje dreves vprašanj ni del teh funkcij. Produkcijske kode pri tej nalogi nismo spreminjali.

| Enota | Utemeljitev | Pogodba in pričakovano delovanje |
|---|---|---|
| validateRulesAgainstQuestionnaire | Množice ID-jev, primerjava referenc in pogojna vključitev priporočil | Zbere vprašanja in reference iz kriterijev ter improvement_suggestions. Vrne enolične orphanedInRules in missingFromRules. Manjkajoče oziroma null neobvezne zbirke so prazne; objekt namesto zahtevane zbirke je neveljaven in sproži TypeError. |
| getMissingItemsWithMeta | Izbor nepokritih vprašanj in povezovanje s kategorijami | Vrne samo nepokrita vprašanja z id, label, categoryTitle in type iz ustrezne kategorije. Prazni ali povsem pokriti podatki dajo []. Neveljavna zbirka sproži TypeError. Rezultata ne izračunavamo s testirano funkcijo. |
| calculateSectionScore | Izračun deleža, razvejanje glede na pet tipov odgovorov in zaokroževanje | yes_no_na/checkbox štejeta true ali DA; text neprazno besedilo po trim; numeric prisotno neprazno številsko vrednost, tudi 0; multiselect neprazno polje. Nepodprti tipi ne povečujejo imenovalca. Rezultat je najbližje celo število odstotkov; prazen sklop vrne ničle. Neveljaven obvezen argument sproži TypeError. |

Pri oceni answered pomeni število pozitivno oziroma ustrezno izpolnjenih odgovorov, ne vseh podanih odgovorov: NE, false in NA ne štejejo. To je sprejeta delovna pogodba za te teste; ekipa naj potrdi, da ustreza namenu aplikacije. Numeric trenutno uporablja JavaScript pretvorbo isNaN; ne trdimo, da funkcija strogo zavrača vse nenavadne vrednosti, kot so boolean ali neskončnost. Strožja poslovna validacija zahteva ločeno odločitev. Testi pokrivajo dokumentirane običajne in izbrane neveljavne vhode, ne vseh možnih JS objektov.

## Uporaba agenta in specifikacija za generiranje

Orodje: OpenAI ChatGPT/Codex, en agent brez podagentov. Uporabnik je naročil izvedbo druge naloge. Spodaj je dokumentirana specifikacija generiranja in pregleda (ni predstavljena kot dobesedni prepis uporabnikovega ukaza):

> Uporabi obstoječi node:test in node:assert/strict brez novih zunanjih odvisnosti. Za validateRulesAgainstQuestionnaire, getMissingItemsWithMeta in calculateSectionScore pokrij običajne primere, prazne zbirke, robne vrednosti, neveljavne vhode in TypeError za neveljavne obvezne strukture. Pričakovane rezultate določi iz opisane pogodbe in konkretnih primerov, ne s ponovnim klicanjem testirane kode. Nova imena naj sledijo obliki funkcija - pogoj - pričakovani rezultat. Mockov ne uporabljaj: funkcije nimajo baze, omrežja, ure ali drugih zunanjih odvisnosti. Pri getMissingItemsWithMeta uporabi resnični validator, saj je poceni deterministična sodelujoča funkcija. Preverjaj javne rezultate, ne notranjih zank. Produkcijske kode med pisanjem testov ne spreminjaj. Izvedi dve ločeni semantični mutaciji na enoto, shrani rezultate ter preveri nespremenjeno kodo po koncu. Dodaj coverage artifact in obvezno testno opravilo pred gradnjama.

Predhodni testi so bili prav tako pripravljeni s pomočjo Codex pri prvi nalogi. Za drugo nalogo je dodanih devet primerov. Agent je preveril asercije, izvedel teste in mutacije. To ni neodvisen pregled človeka: ekipa mora pred oddajo pregledati specifikacijo in rezultate ter navesti svojo dejansko vlogo pri preverjanju kakovosti.

## Kakovost testov: dejansko najdena vrzel in popravek

Obstoječi test za zaokroževanje je preverjal 1/3 = 33 %. Math.round in Math.floor za ta vhod vrneta enak rezultat. Njegovo ime je zato obljubljalo več, kot je dokazoval. Na izolirani kopiji je sprememba round v floor preživela vseh šest starih testov validatorja: izhodna koda 0. Dokaz: [quality-before.tap](evidence/zk2/quality-before.tap).

Dodani test preverja 2/3 = 67 %, zato isto napako zazna. Ločen test za numeric 0 omogoča tudi bolj natančno diagnozo kot zgolj skupen test vseh tipov. Dodani so še več kategorij, prazni/povsem pokriti podatki, podvojene reference, manjkajoči in neveljavni odgovori ter preverjanje izjem. Nekaj mejnih primerov je tabelarično združenih, ker preverjajo isto pravilo; to niso podvojeni testi brez dodatne vrednosti.

V pregledanih testih nismo našli testa brez asercije. Pričakovani objekti in števila so zapisani neposredno; testi ne posnemajo zank implementacije in ne preverjajo klicev notranjih funkcij. Štirih starih testov utils.js nismo predstavljali kot nove teste druge naloge. Prvotnih šest imen v validator.test.js ostaja zaradi sledljivosti; devet novih sledi zgornjemu vzorcu poimenovanja.

## Šest namernih napak in rezultati

Skripta scripts/mutations.mjs za vsak poskus vstavi eno napako v kopijo dejanske enote v začasni mapi in zažene resnične teste. Originalna datoteka v projektu ni prepisana. Pred mutacijami preveri osnovni nabor in po njih znova izvede obnovljeno kopijo. Vsaka mutacija mora povzročiti vsaj en imenovan neuspešen test, ne samo zagonske napake. Če mutacija preživi ali testov ni mogoče pravilno izvesti, skripta vrne napako.

| ID | Enota in namerna sprememba | Test, ki jo zazna | Rezultat |
|---|---|---|---|
| V1 | validateRulesAgainstQuestionnaire: obrnjeno preverjanje obstoja reference | validation distinguishes missing questions and orphaned rule references | Zaznana |
| V2 | validateRulesAgainstQuestionnaire: izpuščene reference iz priporočil | validation distinguishes missing questions and orphaned rule references | Zaznana |
| M1 | getMissingItemsWithMeta: vrne uporabljena namesto manjkajočih vprašanj | missing questions retain their metadata and exclude referenced questions | Zaznana |
| M2 | getMissingItemsWithMeta: napačen categoryTitle | getMissingItemsWithMeta - several categories - preserves each question metadata | Zaznana |
| S1 | calculateSectionScore: Math.floor namesto Math.round | calculateSectionScore - two out of three positive answers - rounds to 67 | Zaznana |
| S2 | calculateSectionScore: numeric 0 napačno zavrnjen | calculateSectionScore - zero numeric answer - counts as valid | Zaznana |

Vseh 6/6 izbranih mutacij je zaznanih, vsaka vrne izhodno kodo 1. Osnovni in obnovljeni nabor validatorja: 15/15 uspešnih. Celoten nabor: 19/19 uspešnih. Rezultat 6/6 velja za teh šest ročno izbranih mutacij; to ni splošna ocena mutacij celotnega programa. Podrobnosti, točne zamenjave in vsi neuspešni testi: [mutations.json](evidence/zk2/mutations.json), dnevniki [V1](evidence/zk2/V1.tap), [V2](evidence/zk2/V2.tap), [M1](evidence/zk2/M1.tap), [M2](evidence/zk2/M2.tap), [S1](evidence/zk2/S1.tap), [S2](evidence/zk2/S2.tap).

## Pokritost in preverjanje ustavitve

Lokalno uporabljeno okolje: Node.js 20.19.6 na Windows. Vgrajeni Node test runner in V8 coverage ne potrebujeta npm namestitve. Pokritost je izmerjena z --experimental-test-coverage in reporterjema TAP ter LCOV.

| Datoteka | Vrstice | Veje | Funkcije |
|---|---:|---:|---:|
| src/utils/validator.js | 100 % | 100 % | 100 % |
| src/utils.js | 8,47 % | 100 %* | 8,33 % |

*Številka za veje utils.js je izpis V8 za evidentirane veje, ne dokaz testiranosti neizvedenih funkcij. Veliko funkcij in vrstic utils.js sploh ni izvedenih. Skupna izpisana pokritost vključuje tudi testne datoteke in ni odstotek pokritosti celotne aplikacije. Backend in React komponente niso zajeti. 100 % validatorja ne dokazuje pravilnosti vseh vhodov ali celotne poslovne logike.

Dokazi lokalnega uspešnega izvajanja: [coverage.tap](evidence/zk2/coverage.tap) in [lcov.info](evidence/zk2/lcov.info). Lokalni izvoz se po vsakem zagonu ustvari še v coverage/; ta mapa je ignorirana v Git. Dokazila v evidence/zk2 so namensko del oddaje.

Dodatno je bil coverage ukaz izveden na kopiji z napako zaokroževanja. Vrnil je izhodno kodo 1 in vseeno ustvaril LCOV poročilo. Dokaza: [failure-gate.json](evidence/zk2/failure-gate.json) in [failure-gate.tap](evidence/zk2/failure-gate.tap). To potrjuje prenos neuspeha testov skozi skripto; oddaljeno izvajanje GitHub Actions še ni bilo izvedeno.

## CI in uporaba

V .github/workflows/ci.yml je novo opravilo unit-tests. Izvede pokritost in šest mutacij, nato z always() naloži coverage/ ter evidence/zk2/ kot artifact unit-test-results. Obe gradnji imata needs: unit-tests, zato neuspešen test ali preživela mutacija prepreči njuno izvajanje. Upload poročila se sme izvesti tudi ob neuspehu; gradnji se ne smeta. continue-on-error ni uporabljen. Za teste ni potreben npm ci, ker uporabljajo samo standardno knjižnico Node; frontend ga pred svojo gradnjo še vedno izvede.

Lokalni ukazi:

~~~sh
npm test
npm run test:coverage
npm run test:mutations
~~~

Za oddajo objavite spremembe v repozitorij in preverite nov GitHub Actions zagon. V njegovih rezultatih prenesite artifact unit-test-results in preverite LCOV ter TAP dnevnike. Oddajte povezavo do tega dokumenta, kode testov in konkretnega CI izvajanja. Spremembe v tej seji niso objavljene, zato ne trdimo, da oddaljeni cevovod že uspešno deluje.

## Seznam sprememb za drugo nalogo

- test/validator.test.js: devet dodatnih primerov; skupaj petnajst za validator in štirje obstoječi za utils.js.
- scripts/coverage.mjs: izvajanje testov, TAP/LCOV poročili in ohranitev neuspešne izhodne kode.
- scripts/mutations.mjs: šest ponovljivih ločenih mutacij na izoliranih kopijah in obnovitveni preizkus.
- package.json: nova ukaza test:coverage in test:mutations; brez novih odvisnosti.
- .github/workflows/ci.yml: obvezno testno opravilo pred obema gradnjama in nalaganje artifacta tudi ob neuspehu.
- .gitignore: ignoriranje ustvarjene coverage/ mape.
- evidence/zk2/: dejanski dnevniki, poročilo mutacij, LCOV in dokaz izhodne kode neuspešnih testov.
- README_ZK_2.md: izbor enot, pogodbe, AI specifikacija, pregled kakovosti, rezultati in navodila za oddajo.
- README.md: povezava na ta dokument.

Ta dokument dopolnjuje README_ZK.md iz prve naloge; njegovi zgodovinski rezultati desetih testov niso posodobljeni za nazaj. Za drugo nalogo veljajo rezultati tega dokumenta.
