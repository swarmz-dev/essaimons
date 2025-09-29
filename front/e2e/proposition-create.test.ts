import { test, expect } from '@playwright/test';
import { acquireMockServer, USE_REAL_BACKEND } from './mockServer';

const title = `Test proposition ${Date.now()}`;

async function login(page) {
    await page.goto('/fr/login');
    await page.locator('input[name="identity"]').fill('playwright-user');
    await page.locator('input[name="password"]').fill('dummy-password');
    await page.getByRole('button', { name: 'Envoyer' }).click();
    await expect(page).toHaveURL(/\/fr\/?/); // login bypass redirects to /fr
}

let releaseMockServer: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    releaseMockServer = await acquireMockServer();
});

test.afterAll(async () => {
    await releaseMockServer?.();
});

test.describe('Proposition creation flow', () => {
    test.skip(USE_REAL_BACKEND, 'Mock creation relies on fake bootstrap data');
    test('fills mandatory fields and submits successfully', async ({ page }) => {
        await login(page);

        await page.goto('/fr/propositions/create');

        await expect(page.getByText('Créer une proposition')).toBeVisible();

        await page.getByLabel('Titre').fill(title);
        await page.locator('[data-editor="detailedDescription"] .ql-editor').fill('Description détaillée Playwright.');
        await page.locator('[data-editor="smartObjectives"] .ql-editor').fill('Objectifs SMART Playwright.');
        const categoryButton = page.getByRole('button', { name: /Sélectionnez une ou plusieurs catégories/ });
        await categoryButton.click();
        await page
            .getByRole('option', { name: /Démocratie liquide/ })
            .first()
            .click();
        await page.locator('body').click({ position: { x: 5, y: 5 } });

        await page.getByRole('button', { name: 'Suivant' }).click();

        await page.getByLabel('Résumé (ou contexte)').fill('Résumé automatisé Playwright.');
        await page.locator('[data-editor="mandatesDescription"] .ql-editor').fill('Mandats détaillés Playwright.');
        await page.locator('input[name="clarificationDeadline"]').fill('2030-01-10');
        await page.locator('input[name="improvementDeadline"]').fill('2030-01-20');
        await page.locator('input[name="voteDeadline"]').fill('2030-02-01');
        await page.locator('input[name="mandateDeadline"]').fill('2030-03-01');
        await page.locator('input[name="evaluationDeadline"]').fill('2030-04-01');

        await page.getByRole('button', { name: 'Suivant' }).click();

        await page.locator('textarea[name="impacts"]:visible').fill('Impacts Playwright.');
        const rescueButton = page.getByRole('button', { name: /Rechercher un initiateur/ });
        await rescueButton.click();
        await page.getByRole('option').first().click();
        await page.keyboard.press('Escape');

        await page.getByRole('button', { name: 'Publier la proposition' }).click();

        await expect(page).toHaveURL(/\/fr\/?/);
        await expect(page.getByText('créée avec succès', { exact: false })).toBeVisible();
    });
});
