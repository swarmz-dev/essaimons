import { test, expect, type Page } from '@playwright/test';
import { acquireMockServer, USE_REAL_BACKEND } from './mockServer';

const SEEDED_IDENTITY = process.env.E2E_SEEDED_IDENTITY ?? 'admin';
const SEEDED_PASSWORD = process.env.E2E_SEEDED_PASSWORD ?? 'xxx';
const REAL_BACKEND_ORIGIN = process.env.PLAYWRIGHT_REAL_BACKEND_ORIGIN ?? 'http://127.0.0.1:3333';

async function login(page: Page, identity: string, password: string) {
    if (USE_REAL_BACKEND) {
        const response = await page.request.post(`${REAL_BACKEND_ORIGIN}/api/auth`, {
            form: {
                identity,
                password,
            },
        });

        await expect(response).toBeOK();

        const data = await response.json();
        await page.context().addCookies([
            {
                name: 'user',
                value: JSON.stringify(data.user),
                domain: 'localhost',
                path: '/',
                httpOnly: true,
                sameSite: 'Lax',
            },
            {
                name: 'token',
                value: data.token.token,
                domain: 'localhost',
                path: '/',
                httpOnly: true,
                sameSite: 'Lax',
            },
            {
                name: 'PARAGLIDE_LOCALE',
                value: 'fr',
                domain: 'localhost',
                path: '/',
            },
        ]);

        return;
    }

    await page.goto('/fr/login');

    const identityInput = page.locator('input[name="identity"]');
    await identityInput.waitFor({ state: 'visible' });
    await identityInput.fill(identity);

    const passwordInput = page.locator('input[name="password"]');
    await passwordInput.fill(password);

    await page.getByRole('button', { name: 'Envoyer' }).click();
}

let releaseMockServer: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    releaseMockServer = await acquireMockServer();
});

test.afterAll(async () => {
    await releaseMockServer?.();
});

test.describe('Proposition categories dropdown (mocked API)', () => {
    test.skip(USE_REAL_BACKEND, 'Mocked test disabled when hitting the real backend');

    test('allows selecting a single category during creation flow', async ({ page }) => {
        await login(page, 'playwright-user', 'dummy-password');

        await page.goto('/fr/propositions/create');

        await expect(page.getByRole('heading', { name: 'Créer une proposition' })).toBeVisible();

        const categoryTrigger = page.getByRole('button', { name: 'Sélectionnez une ou plusieurs catégories' }).first();
        await expect(categoryTrigger).toBeVisible();
        await categoryTrigger.click();

        await page.getByText('Démocratie liquide', { exact: true }).first().click();

        await expect(page.getByRole('button', { name: 'Retirer Démocratie liquide' })).toBeVisible();
        await expect(page.getByText('Sélectionnez une ou plusieurs catégories')).not.toBeVisible();
    });
});

test.describe('Proposition categories dropdown (real backend)', () => {
    const requiredCategories = ['Démocratie liquide', 'Outils numériques', 'Mobilisation citoyenne', 'Communication citoyenne', 'Formation & accompagnement', 'Suivi & évaluation'];

    test.skip(!USE_REAL_BACKEND, 'Set PLAYWRIGHT_USE_REAL_BACKEND=true to enable this suite');
    test.skip(process.env.TEST_LOGIN_BYPASS === 'true', 'Requires TEST_LOGIN_BYPASS=false to authenticate against the backend');

    test('renders seeded categories and existing propositions', async ({ page }) => {
        await login(page, SEEDED_IDENTITY, SEEDED_PASSWORD);

        await page.goto('/fr/propositions/create');
        await expect(page.getByRole('heading', { name: 'Créer une proposition' })).toBeVisible();

        for (const label of requiredCategories) {
            await expect(page.getByText(label, { exact: true })).toBeVisible();
        }

        await page.getByRole('button', { name: 'Démocratie liquide' }).first().click();
        await expect(page.getByRole('button', { name: 'Retirer Démocratie liquide' })).toBeVisible();
    });
});
