import { test, expect } from '@playwright/test';

test.describe('Login flow', () => {
    test('redirects to home and exposes propositions entry', async ({ page }) => {
        await page.goto('/fr/login');

        await page.getByLabel("Email ou nom d'utilisateur").fill('citoyen.test');
        await page.getByLabel('Mot de passe').fill('dummy-password');
        await page.getByRole('button', { name: 'Envoyer' }).click();

        await expect(page).toHaveURL(/\/fr(\/)?\?from_login=1$/);

        await expect(page.getByRole('link', { name: 'Créer une proposition' })).toBeVisible();
    });
});
