import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium-mobile",
      use: { ...devices["iPhone 15 Pro"], defaultBrowserType: "chromium" },
    },
    { name: "webkit-mobile", use: { ...devices["iPhone 15 Pro"] } },
    {
      name: "webkit-iphone-landscape",
      testMatch: "**/mobile.spec.ts",
      use: {
        ...devices["iPhone 15 Pro landscape"],
        viewport: { width: 852, height: 393 },
      },
    },
    {
      name: "desktop",
      testIgnore: "**/mobile.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run preview -- --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
  },
});
