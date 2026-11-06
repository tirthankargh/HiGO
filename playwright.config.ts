import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser', fullyParallel:false, workers:1, timeout:60_000,
  expect:{timeout:10_000}, reporter:'list',
  use:{baseURL:'http://127.0.0.1:3100',browserName:'chromium',trace:'retain-on-failure',screenshot:'only-on-failure'},
  webServer:{command:'node --import tsx scripts/test-server.ts',url:'http://127.0.0.1:3100',reuseExistingServer:false,timeout:120_000},
});
