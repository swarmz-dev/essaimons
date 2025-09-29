import { defineConfig } from '@playwright/test';

const TEST_LOGIN_BYPASS = process.env.TEST_LOGIN_BYPASS ?? 'true';
const USE_REAL_BACKEND = process.env.PLAYWRIGHT_USE_REAL_BACKEND === 'true';
const MOCK_API_PORT = process.env.PLAYWRIGHT_MOCK_API_PORT ?? '3337';
const REAL_BACKEND_ORIGIN = process.env.PLAYWRIGHT_REAL_BACKEND_ORIGIN ?? 'http://127.0.0.1:3333';
const API_BASE_URI = USE_REAL_BACKEND ? REAL_BACKEND_ORIGIN : `http://127.0.0.1:${MOCK_API_PORT}`;

export default defineConfig({
    testDir: 'e2e',
    use: {
        baseURL: 'http://localhost:4173',
        trace: 'retain-on-failure',
    },
    globalSetup: './e2e/global-setup.ts',
    globalTeardown: './e2e/global-teardown.ts',
    webServer: {
        command: `bash -lc "npm run build && TEST_LOGIN_BYPASS=${TEST_LOGIN_BYPASS} PUBLIC_API_BASE_URI=${API_BASE_URI} npm run preview -- --host 0.0.0.0 --port 4173"`,
        port: 4173,
        reuseExistingServer: true,
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
            TEST_LOGIN_BYPASS,
            PLAYWRIGHT_MOCK_API_PORT: MOCK_API_PORT,
            PUBLIC_API_BASE_URI: API_BASE_URI,
        },
        timeout: 120000,
    },
});
