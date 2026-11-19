import { randomUUID } from 'node:crypto';
import { expect, test as base } from 'playwright/test';

const admin = {
  username: process.env.E2E_ADMIN_USER || 'admin',
  password: process.env.E2E_ADMIN_PASSWORD || 'password',
};
const adminNavigation = ['Admin panel', 'Form Builder', 'Pravila zrelosti'];

const test = base.extend({
  member: async ({ request }, use) => {
    // Validate cleanup access before creating any test data.
    const login = await request.post('/api/auth/login', { data: admin });
    expect(login.status(), 'Test database admin login for fixture cleanup').toBe(200);
    const { token, user } = await login.json();
    expect(user.role).toBe('admin');
    const headers = { Authorization: `Bearer ${token}` };
    const username = `zk_e2e_${randomUUID().slice(0, 8)}`;
    const account = {
      username,
      email: `${username}@example.invalid`,
      password: randomUUID(),
      id: null,
    };
    await use(account);
    if (account.id) {
      const removed = await request.delete(`/api/users/${account.id}`, { headers });
      expect(removed.status(), 'Remove only the member created by this test').toBe(200);
    }
  },
});

const dashboard = page => page.getByRole('heading', { name: 'Ocenjeni cevovodi' });
const authDialog = page => page.getByRole('dialog', { name: 'Uporabniški račun' });
const versionDialog = page => page.getByRole('dialog', { name: 'Novo ocenjevanje' });
const pipelineName = page => page.getByLabel('Ime cevovoda', { exact: true });
const repository = page => page.getByLabel('Repozitorij (link)', { exact: true });
const category = (page, title) => page.locator('summary').filter({ has: page.getByText(title, { exact: true }) });
const question = (page, id) => page.getByTestId(`question-${id}`);
const checkbox = (within, name) => within.getByRole('checkbox', { name, exact: true });

function responseFor(page, method, pathname) {
  return page.waitForResponse(response =>
    response.request().method() === method && new URL(response.url()).pathname === pathname);
}

function trackWrites(page) {
  const writes = [];
  page.on('request', request => {
    const pathname = new URL(request.url()).pathname;
    if (pathname.startsWith('/api/') && request.method() === 'POST') writes.push(pathname);
  });
  return writes;
}

async function openWithServerConfig(page) {
  const rules = responseFor(page, 'GET', '/api/rules/versions');
  const forms = responseFor(page, 'GET', '/api/questionnaire/versions');
  await page.goto('/');
  for (const response of await Promise.all([rules, forms])) {
    expect(response.status()).toBe(200);
    const versions = (await response.json()).map(entry => entry.version);
    expect(versions).toEqual(expect.arrayContaining(['1.0', '2.0']));
  }
}

async function fillLogin(dialog, username, password) {
  await dialog.getByLabel('Uporabniško ime', { exact: true }).fill(username);
  await dialog.getByLabel('Geslo', { exact: true }).fill(password);
}

async function openLogin(page) {
  await page.getByRole('button', { name: 'Prijava', exact: true }).click();
  return authDialog(page);
}

async function fillRegistration(dialog, member) {
  await dialog.getByLabel('Uporabniško ime *', { exact: true }).fill(member.username);
  await dialog.getByLabel('E-poštni naslov').fill(member.email);
  await dialog.getByLabel('Geslo *', { exact: true }).fill(member.password);
  await dialog.getByLabel('Potrdi geslo *', { exact: true }).fill(member.password);
}

async function submitRegistration(page, member) {
  const registered = responseFor(page, 'POST', '/api/auth/register');
  await authDialog(page).getByRole('button', { name: /Ustvari račun/ }).click();
  const response = await registered;
  expect(response.status()).toBe(201);
  const { user } = await response.json();
  expect(user).toMatchObject({ username: member.username, email: member.email, role: 'member' });
  expect(String(user.id)).toMatch(/^\d+$/);
  member.id = user.id;
  await expect(dashboard(page)).toBeVisible();
}

async function startAssessment(page, version) {
  await page.getByRole('button', { name: /Novo ocenjevanje/ }).click();
  const dialog = versionDialog(page);
  await dialog.getByLabel('Vprašalnik (obrazec) *').selectOption(version);
  await dialog.getByLabel('Pravila zrelosti *').selectOption(version);
  await dialog.getByRole('button', { name: /Začni ocenjevanje/ }).click();
  await expect(dialog).toBeHidden();
  await expect(pipelineName(page)).toBeVisible();
}

async function expectNotice(page, trigger, message) {
  await trigger.click();
  const notice = page.getByRole('heading', { name: 'Obvestilo', exact: true });
  await expect(notice).toBeVisible();
  await expect(page.getByText(message, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'V redu', exact: true }).click();
  await expect(notice).toBeHidden();
}

test('TS-01 — registracija, prijava in seja', async ({ page, browser, baseURL, member }) => {
  const writes = trackWrites(page);
  await openWithServerConfig(page);
  const dialog = await openLogin(page);

  await test.step('Prazna prijava, napačno geslo in lokalna validacija registracije', async () => {
    await dialog.getByRole('button', { name: 'Prijava →' }).click();
    await expect(dialog.getByText('Izpolnite vsa polja.')).toBeVisible();
    expect(writes).toEqual([]);

    await fillLogin(dialog, admin.username, `Wrong-${randomUUID()}`);
    const rejected = responseFor(page, 'POST', '/api/auth/login');
    await dialog.getByRole('button', { name: 'Prijava →' }).click();
    expect((await rejected).status()).toBe(401);
    await expect(dialog.getByText('Invalid credentials.')).toBeVisible();

    await dialog.getByRole('button', { name: 'Registracija', exact: true }).click();
    const submit = dialog.getByRole('button', { name: /Ustvari račun/ });
    await submit.click();
    await expect(dialog.getByText('Izpolnite vsa obvezna polja.')).toBeVisible();
    await fillRegistration(dialog, { ...member, password: '12345' });
    await submit.click();
    await expect(dialog.getByText('Geslo mora imeti vsaj 6 znakov.')).toBeVisible();
    await fillRegistration(dialog, member);
    await dialog.getByLabel('Potrdi geslo *').fill('Drugace!2026');
    await submit.click();
    await expect(dialog.getByText('Gesli se ne ujemata.')).toBeVisible();
    expect(writes).toEqual(['/api/auth/login']);
  });

  await test.step('Nastanek računa member, obnova seje in odjava', async () => {
    await dialog.getByLabel('Potrdi geslo *').fill(member.password);
    await submitRegistration(page, member);
    await expect(page.getByRole('navigation').getByText('Nova ocena', { exact: true })).toBeVisible();
    for (const label of adminNavigation) await expect(page.getByText(label, { exact: true })).toBeHidden();
    await page.reload();
    await expect(dashboard(page)).toBeVisible();
    await expect(page.getByText(member.username, { exact: true })).toBeVisible();
    await page.getByText('Odjava', { exact: true }).click();
    await page.reload();
    await expect(page.getByRole('heading', { name: /Ocenite CI\/CD zrelost/ })).toBeVisible();
  });

  await test.step('Zavrnitev dvojnika in ponovna prijava istega člana z Enter', async () => {
    await page.getByRole('button', { name: 'Registracija', exact: true }).click();
    await fillRegistration(dialog, member);
    const duplicate = responseFor(page, 'POST', '/api/auth/register');
    await dialog.getByRole('button', { name: /Ustvari račun/ }).click();
    expect((await duplicate).status()).toBe(409);
    await expect(dialog.getByText('Username is already taken.')).toBeVisible();

    await dialog.getByRole('button', { name: 'Prijava', exact: true }).click();
    await fillLogin(dialog, member.username, member.password);
    const loggedIn = responseFor(page, 'POST', '/api/auth/login');
    const pipelines = responseFor(page, 'GET', '/api/pipelines');
    await dialog.getByLabel('Geslo', { exact: true }).press('Enter');
    const response = await loggedIn;
    expect(response.status()).toBe(200);
    expect((await response.json()).user).toMatchObject({ id: member.id, role: 'member' });
    expect((await pipelines).status()).toBe(200);
    await expect(dashboard(page)).toBeVisible();
    await page.getByText('Odjava', { exact: true }).click();
    await expect(page.getByRole('button', { name: 'Prijava', exact: true })).toBeVisible();
  });

  await test.step('Admin meni v ločenem brskalniškem kontekstu', async () => {
    const adminPage = await browser.newPage({ baseURL });
    try {
      await adminPage.goto('/');
      const adminDialog = await openLogin(adminPage);
      await fillLogin(adminDialog, admin.username, admin.password);
      const loggedIn = responseFor(adminPage, 'POST', '/api/auth/login');
      await adminDialog.getByRole('button', { name: 'Prijava →' }).click();
      const response = await loggedIn;
      expect(response.status()).toBe(200);
      expect((await response.json()).user.role).toBe('admin');
      for (const label of adminNavigation) await expect(adminPage.getByText(label, { exact: true })).toBeVisible();
      await page.reload();
      await expect(page.getByRole('button', { name: /Oceni cevovod zdaj/ })).toBeVisible();
    } finally {
      await adminPage.close();
    }
  });
});

test('TS-02 — gost, konfiguracija in navigacija', async ({ page }) => {
  const writes = trackWrites(page);
  const openGuest = page.getByRole('button', { name: /Oceni cevovod zdaj/ });
  const newAssessment = page.getByRole('button', { name: /Novo ocenjevanje/ });
  const guestAssessment = page.getByRole('row').filter({ hasText: 'QA-ZK-GOST' });
  const maturityResult = page.getByRole('heading', { level: 4, name: /^Stopnja / });

  await openWithServerConfig(page);
  const guestPipelines = responseFor(page, 'GET', '/api/pipelines');
  await openGuest.click();
  expect((await guestPipelines).status()).toBe(401);
  await expect(page.getByText(/Gost ·/)).toBeVisible();
  for (const label of adminNavigation) await expect(page.getByText(label, { exact: true })).toBeHidden();
  await expect(dashboard(page)).toBeVisible();
  await newAssessment.click();
  await versionDialog(page).getByRole('button', { name: 'Prekliči' }).click();
  await expect(versionDialog(page)).toBeHidden();
  await expect(dashboard(page)).toBeVisible();
  expect(writes).toEqual([]);

  await test.step('Q1/R1, izračun stopnje in prepoved shranjevanja gosta', async () => {
    await startAssessment(page, '1.0');
    for (const title of ['Build', 'Unit Testing', 'Deploy', 'Drugo']) {
      await expect(category(page, title)).toBeVisible();
    }
    await expect(repository(page)).toBeVisible();
    await pipelineName(page).fill('QA-ZK-GOST');
    await page.getByRole('button', { name: 'Izračunaj zrelost' }).click();
    await expect(maturityResult).toHaveText(/^Stopnja 1 \(Nivo 1 [-–] Regresiven\)$/);
    await expectNotice(page, page.getByRole('button', { name: /Shrani ocenjevanje/ }),
      'Za shranjevanje se morate prijaviti.');
    await expect(dashboard(page)).toBeVisible();
    await expect(guestAssessment).toHaveCount(0);
    expect(writes).toEqual([]);
  });

  await test.step('Q2/R2 in priporočilo iz pravil Agile', async () => {
    await startAssessment(page, '2.0');
    for (const title of ['Planiranje sprinta (Sprint Planning)', 'Dnevni sestanek (Daily Scrum)',
      'Retrospektiva sprinta (Sprint Retrospective)']) {
      await expect(category(page, title)).toBeVisible();
    }
    await expect(category(page, 'Build')).toHaveCount(0);
    await page.getByRole('button', { name: 'Izračunaj zrelost' }).click();
    await expect(maturityResult).toHaveText(/^Stopnja 1 \(Nivo 1 [-–] Ad-hoc \/ Kaotičen\)$/);
    await expect(page.getByRole('heading', { name: 'Priporočila za stopnjo 2 (2)' })).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: /planning_present/ })).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: /daily_present/ })).toBeVisible();
    await page.getByRole('button', { name: 'Zapri okence' }).click();
    await expect(dashboard(page)).toBeVisible();
  });

  await test.step('Stranska navigacija in tema po osvežitvi', async () => {
    const nav = page.getByRole('navigation').getByText('Nadzorna plošča', { exact: true });
    await page.getByTitle('Preklopi na svetel način').click();
    await expect(page.locator('html')).toHaveClass(/\blight\b/);
    await expect(page.getByRole('button', { name: /Temen način/ })).toBeVisible();
    await page.getByTitle('Zapri stransko vrstico').click();
    await expect(nav).not.toBeInViewport();
    await page.getByTitle('Odpri stransko vrstico').click();
    await expect(nav).toBeInViewport();
    await page.reload();
    await openGuest.click();
    await expect(page.getByText(/Gost ·/)).toBeVisible();
    await expect(page.locator('html')).toHaveClass(/\blight\b/);
    await page.getByTitle('Preklopi na temen način').click();
    await expect(page.locator('html')).not.toHaveClass(/\blight\b/);
    await expect(guestAssessment).toHaveCount(0);
    expect(writes).toEqual([]);
  });
});

test('TS-03 — pogojni obrazec in ohranitev vnosov', async ({ page, member }) => {
  await openWithServerConfig(page);
  await page.getByRole('button', { name: 'Registracija', exact: true }).click();
  await fillRegistration(authDialog(page), member);
  const pipelines = responseFor(page, 'GET', '/api/pipelines');
  await submitRegistration(page, member);
  expect((await pipelines).status()).toBe(200);
  const writes = trackWrites(page);
  await startAssessment(page, '1.0');

  const name = 'QA-ZK-OBRAZEC';
  const link = 'https://github.com/Timotejlipic/Vprasalnik-Za-CI-CD';
  const build = category(page, 'Build');
  const buildYes = checkbox(build, 'DA');
  const buildNa = checkbox(build, '/');
  const triggers = question(page, 'build_other_triggers');
  const push = checkbox(triggers, 'Push');
  const pullRequest = checkbox(triggers, 'Pull Request');
  const other = question(page, 'build_other');
  const buildNote = other.getByRole('textbox');
  const artifacts = checkbox(question(page, 'build_artifacts_stored'), 'DA');
  const versioning = checkbox(question(page, 'build_artifact_versioning'), 'DA');
  const tracking = checkbox(question(page, 'unit_test_coverage_tracking'), 'DA');
  const coverage = question(page, 'unit_test_coverage_percent').getByRole('spinbutton');
  const extraNote = question(page, 'other_description').getByRole('textbox');
  const note = 'Gradnja s šumniki: čšž';
  const previous = page.getByRole('button', { name: 'Prejšnja kategorija' });
  const next = page.getByRole('button', { name: 'Naslednja kategorija' });

  await test.step('Odvisnosti, več izbir in pomoč v skrčljivih temah', async () => {
    await pipelineName(page).fill(name);
    await repository(page).fill(link);
    await expectNotice(page, build.getByText('Build', { exact: true }),
      'Najprej morate označiti "DA", da je "Build" prisoten v cevovodu, če želite urejati podrobnosti.');
    await expect(triggers).toBeHidden();
    await buildYes.check();
    await expect(buildNa).not.toBeChecked();
    await expect(triggers).toBeVisible();
    await push.check();
    await pullRequest.check();
    await expect(push).toBeChecked();
    await expect(pullRequest).toBeChecked();
    await pullRequest.uncheck();
    await expect(push).toBeChecked();
    await expect(pullRequest).not.toBeChecked();

    await buildNote.fill(note);
    const description = page.getByText(/Opišite morebitne dodatne lastnosti build koraka/);
    await other.getByText('?', { exact: true }).click();
    await expect(description).toBeVisible();
    await other.getByText('?', { exact: true }).click();
    await expect(description).toBeHidden();
    await expect(buildNote).toHaveValue(note);

    await expect(versioning).toBeDisabled();
    await artifacts.check();
    await expect(versioning).toBeEnabled();
    await versioning.check();
    await artifacts.uncheck();
    await expect(versioning).toBeDisabled();
    await artifacts.check();
    await expect(versioning).toBeChecked();
    await buildNa.check();
    await expect(buildYes).not.toBeChecked();
    await expect(triggers).toBeHidden();
    await buildYes.check();
    await expect(buildNa).not.toBeChecked();
    await expect(versioning).toBeChecked();
    await expect(push).toBeChecked();
    await expect(buildNote).toHaveValue(note);
  });

  await test.step('Številski vnos in karakterizacija trenutnega obsega', async () => {
    await checkbox(category(page, 'Unit Testing'), 'DA').check();
    await expect(coverage).toBeDisabled();
    await tracking.check();
    for (const value of ['0', '60', '', '-1', '101', '60']) {
      await coverage.fill(value);
      await expect(coverage).toHaveValue(value);
    }
    await category(page, 'Drugo').getByText('Drugo', { exact: true }).click();
    await extraNote.fill('QA opomba 2026');
  });

  await test.step('Preklop pogledov ohrani metapodatke in vse odgovore', async () => {
    await page.getByRole('button', { name: 'Stranski zavihki' }).click();
    await expect(pipelineName(page)).toHaveValue(name);
    await expect(repository(page)).toHaveValue(link);
    await expect(previous).toBeDisabled();
    await expect(push).toBeChecked();
    await expect(pullRequest).not.toBeChecked();
    await expect(buildNote).toHaveValue(note);
    await expect(versioning).toBeChecked();

    await next.click();
    const unit = page.getByRole('heading', { name: /^Unit Testing/ });
    const unitYes = checkbox(unit, 'DA');
    await expect(coverage).toHaveValue('60');
    await unitYes.uncheck();
    await expect(coverage).toBeDisabled();
    await unitYes.check();
    await expect(coverage).toBeEnabled();
    await expect(coverage).toHaveValue('60');
    await next.click();
    await expect(page.getByRole('heading', { name: /^Deploy/ })).toBeVisible();
    await next.click();
    await expect(next).toBeDisabled();
    await expect(extraNote).toHaveValue('QA opomba 2026');
    await previous.click();
    await expect(page.getByRole('heading', { name: /^Deploy/ })).toBeVisible();
    await previous.click();
    await expect(coverage).toHaveValue('60');
    await previous.click();
    await expect(buildNote).toHaveValue(note);
    await expect(previous).toBeDisabled();

    await page.getByRole('button', { name: 'Skrčljive teme' }).click();
    await expect(pipelineName(page)).toHaveValue(name);
    await expect(repository(page)).toHaveValue(link);
    await expect(buildNote).toHaveValue(note);
    await expect(push).toBeChecked();
    await expect(versioning).toBeChecked();
    await category(page, 'Unit Testing').getByText('Unit Testing', { exact: true }).click();
    await expect(coverage).toHaveValue('60');
    await category(page, 'Drugo').getByText('Drugo', { exact: true }).click();
    await expect(extraNote).toHaveValue('QA opomba 2026');
    await page.getByRole('button', { name: 'Nazaj' }).click();
    await expect(dashboard(page)).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: name })).toHaveCount(0);
    expect(writes).toEqual([]);
  });
});
