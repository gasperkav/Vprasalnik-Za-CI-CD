# Specifikacija pred izvedbo (ZK 4)

Ta načrt je zapisan pred prvo obremenitveno izvedbo. Vsak rezultat vsebuje kopijo
`plan.json`, SHA-256 načrta in skript ter čas začetka v UTC. Pragov po meritvi ne
prilagajamo. Popravki testnega ogrodja so razvidni iz različnih SHA-256.

## Obseg in orodje

Testiramo dejanski lokalni C++ HTTP API in PostgreSQL, brez mockov in brez offline
fallbacka iz `src/api.js`. React računa zrelost lokalno (`api.evaluate`), zato tudi
test uporablja isto čisto funkcijo `evaluateAssessment` iz `src/utils/assessment.js`.
DOM, izris Reacta, TLS, Caddy, WAN in več strežniških replik niso vključeni.
`POST /api/assessment/evaluate` je dodatno preverjen pred testom; ni del običajnega
trenutnega toka Reacta, zato ni del merjene uporabniške poti.

Uporabimo priloženo orodje **Node.js HTTP runner** (`run.mjs`, standardni moduli,
Node >=20), ker je Node že nameščen. k6 ni nameščen; namestitev autocannona iz npm
je bila zavrnjena z EACCES, Docker API pa je nedostopen. To je izvedljiva izbira za
to omejeno okolje, ne trditev, da lastno ogrodje na splošno presega k6/autocannon.
k6 ima vgrajene VU profile, pragove in odprti model s prihodi; autocannon ima
optimiziran HTTP generator in histograme, vendar zahteva npm odvisnosti. Naš
runner podpira odvisne klice, vsebinsko preverjanje in sledljiv zapis vsake zahteve,
vendar je treba posebej preverjati omejitve generatorja in zaprtega modela.

## Scenarij enega cikla

Pred merjenjem registriramo en sintetični račun `zk_perf_*` (ali uporabimo njegov
lokalno shranjeni profil), opravimo prijavo in preverimo začetno stanje. Uporabniški
račun je skupen VU-jem; vsak VU uporablja lastno povezavo in unikatno ime cevovoda.
To simulira sočasne seje istega računa; ne meri raznolikosti uporabniških podatkov.
Ne uporablja se noben obstoječi uporabniški račun. JWT ni zapisan v rezultate.

| Vrstni red | Zahteva | Preverjanje |
|---|---|---|
| 1 | `GET /api/questionnaire/versions/1.0` | 200, neprazni razdelki, zahtevana različica |
| 2 | `GET /api/rules/versions/1.0` | 200, neprazni nivoji |
| 3 | `GET /api/pipelines` z JWT | 200, polje |
| – | Lokalni `evaluateAssessment(answers, sections, levels)` | realni odgovori: checkbox, numeric, multiselect, text, kjer obstajajo |
| 4 | `POST /api/pipelines` z JWT in celotnimi odgovori | 201, ID, ime in odgovori |
| 5 | `GET /api/pipelines/:id` z JWT | 200, ujemanje ID, imena, repozitorija, nivoja, različice in vseh odgovorov |
| 6 | `DELETE /api/pipelines/:id` z JWT | 204; čiščenje je del merjene obremenitve |

Odgovori nastanejo iz dejanskih identifikatorjev prenesenega vprašalnika, ne iz
izmišljenih ključev. Numerični odgovori so 85, checkboxi so true, multiselecti
vsebujejo prvi največ dve veljavni možnosti, besedilo je sintetično. Primer
celotnega POST payloada je v `fixture.json` vsake izvedbe. Kjer možnosti ni,
je multiselect prazen. HTTP odgovori so JSON razčlenjeni in vsebinsko preverjeni;
200 z napačnim telesom šteje kot napaka.

`score` se preveri ločeno pred obremenitvijo: shema nima stolpca za rezultat in
`_row_to_pipeline` ob ponovnem branju vrača 0. To obstoječo funkcionalno pomanjkljivost
zabeležimo; ne enačimo je z izgubo odgovorov pod obremenitvijo. V merjenem preverjanju
integritete zahtevamo pravilne odgovore, nivo, ime, repozitorij in različico.

## Profili

**ST-01, obremenitveni test:** preveriti odzivnost pri predpostavljeni študijski
uporabi petih sočasnih sej. Meritev uporabe v produkciji ne obstaja. Stopničasti
ramp-up 1/3/5 VU po 5 s (15 s), steady 5 VU 60 s, ramp-down 5/3/1 VU po 5 s (15 s).
Vsak VU po ciklu počaka 1000 ms. Skupaj 90 s načrtovanega aktivnega prometa.

**ST-02, stres in okrevanje:** isti tok brez premora, 5/10/20/40/80/160 VU po 20 s
(120 s), nato 5 VU in 1000 ms premora 30 s za preverjanje okrevanja. Skupaj 150 s.
Začetek vsake faze počaka zaključek že začetih ciklov prejšnje faze; to ni neprekinjena
rampa. Čas praznjenja se izmeri in vključi v efektivno trajanje in prepustnost faze.
Med testoma je 10 s premora. Na začetku se izvede nemerjen smoke 3 s.

Gre za **zaprt model**: VU začne naslednji cikel šele po zaključku prejšnjega.
RPS je rezultat, ne nespremenljiv dotok. Pri zasičenju se dotok zmanjša (coordinated
omission); percentili ne napovedujejo zakasnitve odprtega sistema pri fiksnem RPS.
Vsak VU ima največ eno zahtevo v teku, HTTP/1.1 keep-alive, brez pipelininga in retryjev.
Odzivni čas vključuje čakanje na povezavo, prenos celotnega telesa in JSON validacijo.
Timeout je absoluten, 5000 ms od začetka zahteve, brez samodejne ponovitve.

## Meritve in vnaprejšnja merila

Za vsako zahtevo zapišemo UTC čas, fazo, metodo, normalizirano pot, status, trajanje,
velikost odgovora in napako; JWT in gesel ne beležimo. Povprečje in nearest-rank
p95/p99 izračunamo iz vseh merjenih zahtev, tudi neuspešnih/timeoutov. Percentilov
faz ne povprečimo; zbirni percentili so iz združenih vzorcev. Prepustnost je število
končanih zahtev / dejanski čas faze (vključno s praznjenjem), uspešna prepustnost
šteje samo vsebinsko pravilne odgovore. Napaka je nepričakovan status, napačna
vsebina, timeout ali transportna napaka; napaka na zahtevi se šteje le enkrat.

Merimo tudi trajanje in stopnjo napak celotnih ciklov, metrike po endpointih,
health vsako sekundo, CPU/RSS in event-loop p99 **generatorja** ter razpoložljivi
RAM gostitelja. CPU/pomnilnik C++ in PostgreSQL ter restart števec zahtevajo dostop
do Dockerja; če dostopa ni, so označeni kot N/A, nikoli nadomeščeni z Node meritvami.

| Merilo | ST-01 | ST-02 |
|---|---|---|
| HTTP p95 / p99 | <200 / <500 ms v celoti, steady in vsaka merjena pot v steady | enaka meja za identifikacijo prve faze prek SLO; obvezna v recovery |
| Napake zahtev in ciklov | vsaka stopnja <1 % | recovery: vsaka <1 % |
| Prepustnost | steady >=15 uspešnih req/s (6 klicev/cikel) | izmeriti po vsaki stopnji; brez vnaprej izmišljene kapacitete |
| Integriteta merjenih podatkov | 0 vsebinskih neskladij | 0 vsebinskih neskladij |
| Dosegljivost in čiščenje | 0 neuspešnih health, 0 preostalih testnih cevovodov | enako, tudi po okrevanju |
| Kakovost vzorca | >=30 zahtev v vsaki fazi steady/recovery/stress | enako |
| Generator | CPU <90 % enega jedra in event-loop p99 <100 ms v merjenih fazah | enako; preseganje pomeni omejeno veljavnost |

ST-02 uspe, če dosežemo izmerjeno mejo SLO ali plato, ohranimo integriteto in
dosegljivost ter izpolnimo recovery SLO. Plato definiramo kot <20 % višjo prepustnost
ob podvojitvi VU in vsaj 50 % višji p95. Kršitev odzivnostnega SLO v stresni fazi je
pričakovan dokaz meje; ni sama po sebi FAIL testa okrevanja. Če do 160 VU ni niti
kršitve SLO niti platoja, je iskanje zasičenja INCONCLUSIVE, ne izmišljena kapaciteta.
Če je generator preobremenjen, kapaciteta strežnika ostane nepotrjena.

Zaradi omejene dolžine in odsotnosti telemetrije ciljnih procesov **ne trdimo, da
ni puščanja pomnilnika**. Prav tako uspešen `/health` ne dokazuje pripravljenosti DB;
to dodatno preverijo uspešni GET/POST in ponovni odčitki odgovorov.

## Varovala in ponovljivost

Dovoljeni so samo loopback naslovi. Največ 160 VU, brez neskončnega ponavljanja.
Po treh zaporednih neuspešnih health preverjanjih test ustavi nove cikle; po fazi
s >=5 % napak se preskoči višje stopnje in izvede okrevanje. Po vsakem ciklu se
izbriše samo pravkar ustvarjeni cevovod tega sintetičnega računa. Dodatno čiščenje
zajema le ID-je, ki jih je ustvaril ta runner, in imena s pripadajočo predpono.
Testni račun ostane za ponovljive zagone; lokalni profil z geslom se ne verzionira.
Preostali podatki aplikacije se ne čistijo. Zagon preveri, da isti runner že ne teče.

Okolje se zajame neposredno pred testi (`environment.json`): OS, CPU, RAM, različica
Node, git commit/stanje, SHA-256 virov, čas, cilj. Različice C++/PostgreSQL in Docker
se poskušajo odčitati; neuspešen dostop je izrecno zabeležen. Za sveže izolirano
okolje uporabimo dodatni `compose.yml`; obstoječi podatkovni nosilec se ne briše.
