import path from 'node:path';
import { defineConfig } from 'playwright/test';

function localOrigin(value, name) {
  const url = new URL(value);
  if (url.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(url.hostname)
      || url.origin + '/' !== url.href) {
    throw new Error(`${name} must be a local HTTP origin.`);
  }
  return url.origin;
}

const existingFrontend = process.env.E2E_FRONTEND_URL;
const baseURL = localOrigin(existingFrontend || 'http://127.0.0.1:4173', 'E2E_FRONTEND_URL');
const api = localOrigin(process.env.E2E_API_URL || 'http://127.0.0.1:18083', 'E2E_API_URL');
const artifacts = process.env.E2E_ARTIFACTS_DIR || 'artifacts/e2e';

export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: !!process.env.CI,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 5_000 },
  outputDir: path.join(artifacts, 'failures'),
  reporter: [
    ['list'],
    ['html', { outputFolder: path.join(artifacts, 'html'), open: 'never' }],
    ['junit', { outputFile: path.join(artifacts, 'junit.xml') }],
    ['json', { outputFile: path.join(artifacts, 'results.json') }],
  ],
  use: {
    baseURL,
    browserName: 'chromium',
    channel: process.env.E2E_BROWSER_CHANNEL || undefined,
    headless: true,
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: existingFrontend ? undefined : {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    env: { API_PROXY_TARGET: api },
    url: baseURL + '/health',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
