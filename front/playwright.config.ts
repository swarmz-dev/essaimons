import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: 'e2e',
    use: {
        baseURL: 'http://localhost:4173',
        trace: 'retain-on-failure',
    },
    webServer: {
        command: 'bash -lc "npm run build && TEST_LOGIN_BYPASS=true npm run preview -- --host 0.0.0.0 --port 4173"',
        port: 4173,
        reuseExistingServer: true,
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
            TEST_LOGIN_BYPASS: 'true',
        },
        timeout: 120000,
    },
});
