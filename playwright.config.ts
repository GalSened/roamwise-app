import { defineConfig } from '@playwright/test';
import fs from 'node:fs';

function hasScript(name: string) {
  try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    return pkg.scripts && pkg.scripts[name];
  } catch {
    return false;
  }
}

const usePreview = hasScript('preview');
const command = usePreview ? 'npm run preview' : 'npx http-server . -p 5173 -c-1';
const port = 5173;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command,
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
