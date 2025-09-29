import { test, expect } from '@playwright/test';
import { acquireMockServer } from './mockServer';

let releaseMockServer: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    releaseMockServer = await acquireMockServer();
});

test.afterAll(async () => {
    await releaseMockServer?.();
});

test.describe('Login flow', () => {
    test('redirects to home and exposes propositions entry', async ({ page }) => {
        await page.goto('/fr/login');

        await page.locator('input[name="identity"]').fill('citoyen.test');
        await page.locator('input[name="password"]').fill('dummy-password');
        await page.getByRole('button', { name: 'Envoyer' }).click();

        await expect(page).toHaveURL(/\/fr(\/)?\?from_login=1$/);

        await expect(page.getByRole('link', { name: 'Propositions' })).toBeVisible();
    });
});
