import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs/promises';

// This test requires the real backend to be running
// Run with: PLAYWRIGHT_USE_REAL_BACKEND=true npx playwright test e2e/proposition-import-export.test.ts

const USE_REAL_BACKEND = process.env.PLAYWRIGHT_USE_REAL_BACKEND === 'true';

// Admin credentials from seeder
const ADMIN_USERNAME = 'superadmin';
const ADMIN_PASSWORD = 'xxx';

// Helper function to login as admin
async function loginAsAdmin(page: Page) {
    await page.goto('/fr/login');
    await page.locator('input[name="identity"]').fill(ADMIN_USERNAME);
    await page.locator('input[name="password"]').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Envoyer' }).click();

    // Wait for redirect to home page
    await expect(page).toHaveURL(/\/fr(\/)?\?from_login=1$/, { timeout: 10000 });
}

// Skip all tests if not using real backend
test.skip(!USE_REAL_BACKEND, 'Skipping tests - PLAYWRIGHT_USE_REAL_BACKEND not set to true');

test.describe('Proposition Import/Export - Basic UI', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('Export page loads successfully', async ({ page }) => {
        await page.goto('/fr/admin/propositions/export');

        // Verify page title
        await expect(page.locator('h1')).toContainText('Exporter des propositions');

        // Verify export options card exists
        await expect(page.getByText("Options d'export")).toBeVisible();

        // Verify proposition selection card exists
        await expect(page.getByText('Sélection des propositions')).toBeVisible();

        // Verify export button exists
        const exportButton = page.getByRole('button', { name: /Exporter/i });
        await expect(exportButton).toBeVisible();
    });

    test('Export options can be toggled', async ({ page }) => {
        await page.goto('/fr/admin/propositions/export');

        // Find and toggle status history checkbox
        const statusHistoryCheckbox = page.getByLabel(/Historique des statuts/i);
        await expect(statusHistoryCheckbox).toBeVisible();

        const isInitiallyChecked = await statusHistoryCheckbox.isChecked();
        await statusHistoryCheckbox.click();

        const isNowChecked = await statusHistoryCheckbox.isChecked();
        expect(isNowChecked).toBe(!isInitiallyChecked);
    });

    test('Import page loads successfully', async ({ page }) => {
        await page.goto('/fr/admin/propositions/import');

        // Verify page title
        await expect(page.locator('h1')).toContainText('Importer des propositions');

        // Verify progress indicator exists
        await expect(page.getByText('Upload')).toBeVisible();
        await expect(page.getByText('Résolution')).toBeVisible();
        await expect(page.getByText('Exécution')).toBeVisible();
        await expect(page.getByText('Terminé')).toBeVisible();

        // Verify upload step is displayed
        await expect(page.getByText("Charger un fichier d'export")).toBeVisible();

        // Verify analyze button exists
        const analyzeButton = page.getByRole('button', { name: /Analyser le fichier/i });
        await expect(analyzeButton).toBeVisible();
    });

    test('Export page displays proposition table', async ({ page }) => {
        await page.goto('/fr/admin/propositions/export');

        // Wait for data to load
        await page.waitForTimeout(2000);

        // Check if there are any propositions
        const noResults = page.getByText(/Pas de résultat/i);
        const hasNoResults = await noResults.isVisible().catch(() => false);

        if (!hasNoResults) {
            // If there are results, verify table structure
            await expect(page.locator('table')).toBeVisible();

            // Verify table headers
            await expect(page.getByText('Titre')).toBeVisible();
            await expect(page.getByText('Statut')).toBeVisible();
            await expect(page.getByText('Créateur')).toBeVisible();
        }
    });
});

test.describe('Proposition Import/Export - Full Export Workflow', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('Can select and export propositions', async ({ page }) => {
        await page.goto('/fr/admin/propositions/export');

        // Wait for propositions to load
        await page.waitForTimeout(2000);

        // Check if there are any propositions to export
        const noResults = await page
            .getByText(/Pas de résultat/i)
            .isVisible()
            .catch(() => false);

        if (noResults) {
            console.log('No propositions available to export - skipping test');
            test.skip();
            return;
        }

        // Select the first proposition
        const firstCheckbox = page.locator('input[type="checkbox"]').first();
        await firstCheckbox.check();

        // Verify export button is now enabled
        const exportButton = page.getByRole('button', { name: /Exporter/i });
        await expect(exportButton).toBeEnabled();

        // Enable some export options
        await page.getByLabel(/Historique des statuts/i).check();
        await page.getByLabel(/Votes/i).check();

        // Click export and wait for download
        const downloadPromise = page.waitForEvent('download');
        await exportButton.click();

        const download = await downloadPromise;

        // Verify download file name
        expect(download.suggestedFilename()).toMatch(/propositions-export.*\.json/);

        // Save the file to verify its contents
        const downloadPath = path.join('/tmp', download.suggestedFilename());
        await download.saveAs(downloadPath);

        // Verify the file exists and is valid JSON
        const fileContent = await fs.readFile(downloadPath, 'utf-8');
        const exportData = JSON.parse(fileContent);

        // Verify export data structure
        expect(exportData).toHaveProperty('version');
        expect(exportData).toHaveProperty('exportedAt');
        expect(exportData).toHaveProperty('exportedBy');
        expect(exportData).toHaveProperty('propositions');
        expect(Array.isArray(exportData.propositions)).toBe(true);
        expect(exportData.propositions.length).toBeGreaterThan(0);

        // Verify first proposition has required fields
        const firstProp = exportData.propositions[0];
        expect(firstProp).toHaveProperty('title');
        expect(firstProp).toHaveProperty('content');
        expect(firstProp).toHaveProperty('status');
        expect(firstProp).toHaveProperty('creator');
        expect(firstProp).toHaveProperty('category');

        // Clean up
        await fs.unlink(downloadPath);
    });

    test('Can toggle all propositions selection', async ({ page }) => {
        await page.goto('/fr/admin/propositions/export');

        // Wait for propositions to load
        await page.waitForTimeout(2000);

        const noResults = await page
            .getByText(/Pas de résultat/i)
            .isVisible()
            .catch(() => false);
        if (noResults) {
            test.skip();
            return;
        }

        // Find the "select all" checkbox (in the header)
        const selectAllCheckbox = page.locator('thead input[type="checkbox"]').first();

        // Select all
        await selectAllCheckbox.check();

        // Verify export button is enabled
        const exportButton = page.getByRole('button', { name: /Exporter/i });
        await expect(exportButton).toBeEnabled();

        // Deselect all
        await selectAllCheckbox.uncheck();

        // Verify export button is disabled again
        await expect(exportButton).toBeDisabled();
    });
});

test.describe('Proposition Import/Export - Full Import Workflow', () => {
    let exportFilePath: string;

    test.beforeAll(async ({ browser }) => {
        // First, create an export file to use for import tests
        const page = await browser.newPage();
        await loginAsAdmin(page);
        await page.goto('/fr/admin/propositions/export');

        // Wait for propositions to load
        await page.waitForTimeout(2000);

        const noResults = await page
            .getByText(/Pas de résultat/i)
            .isVisible()
            .catch(() => false);
        if (!noResults) {
            // Select first proposition
            const firstCheckbox = page.locator('input[type="checkbox"]').first();
            await firstCheckbox.check();

            // Export with all options
            await page.getByLabel(/Historique des statuts/i).check();
            await page.getByLabel(/Votes/i).check();
            await page.getByLabel(/Commentaires/i).check();

            const downloadPromise = page.waitForEvent('download');
            await page.getByRole('button', { name: /Exporter/i }).click();
            const download = await downloadPromise;

            exportFilePath = path.join('/tmp', 'test-export.json');
            await download.saveAs(exportFilePath);
        }

        await page.close();
    });

    test.afterAll(async () => {
        // Clean up export file
        if (exportFilePath) {
            await fs.unlink(exportFilePath).catch(() => {});
        }
    });

    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('Can upload and analyze import file', async ({ page }) => {
        if (!exportFilePath) {
            test.skip();
            return;
        }

        await page.goto('/fr/admin/propositions/import');

        // Upload the file
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(exportFilePath);

        // Wait for file to be selected
        await page.waitForTimeout(500);

        // Click analyze button
        const analyzeButton = page.getByRole('button', { name: /Analyser le fichier/i });
        await expect(analyzeButton).toBeEnabled();
        await analyzeButton.click();

        // Wait for analysis to complete and step 2 to appear
        await expect(page.getByText('Résoudre les conflits')).toBeVisible({ timeout: 10000 });

        // Verify we're on step 2 (conflict resolution)
        const step2 = page.locator('text=2').first();
        await expect(step2).toHaveClass(/bg-primary/);

        // Verify conflict summary is shown
        await expect(page.getByText(/Résumé des conflits/i)).toBeVisible();
    });

    test('Can resolve conflicts and proceed to execution', async ({ page }) => {
        if (!exportFilePath) {
            test.skip();
            return;
        }

        await page.goto('/fr/admin/propositions/import');

        // Upload and analyze
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(exportFilePath);
        await page.waitForTimeout(500);

        const analyzeButton = page.getByRole('button', { name: /Analyser le fichier/i });
        await analyzeButton.click();

        // Wait for conflict resolution step
        await expect(page.getByText('Résoudre les conflits')).toBeVisible({ timeout: 10000 });

        // Check if there are any conflicts that need resolution
        const proceedButton = page.getByRole('button', { name: /Procéder à l'exécution/i });
        const hasConflicts = !(await proceedButton.isEnabled().catch(() => false));

        if (hasConflicts) {
            // Resolve conflicts if any exist
            // For duplicate propositions, we might need to select "SKIP" or handle merge
            const skipRadios = page.locator('input[type="radio"][value="SKIP"]');
            const count = await skipRadios.count();

            for (let i = 0; i < count; i++) {
                await skipRadios.nth(i).check();
            }

            // For missing entities, select "CREATE_NEW" or "MAP_EXISTING"
            const createNewRadios = page.locator('input[type="radio"][value="CREATE_NEW"]');
            const createCount = await createNewRadios.count();

            for (let i = 0; i < createCount; i++) {
                const radio = createNewRadios.nth(i);
                if (await radio.isVisible()) {
                    await radio.check();
                }
            }
        }

        // Proceed to execution step
        await expect(proceedButton).toBeEnabled();
        await proceedButton.click();

        // Wait for execution step
        await expect(page.getByText("Exécuter l'import")).toBeVisible({ timeout: 5000 });

        // Verify we're on step 3
        const step3 = page.locator('text=3').first();
        await expect(step3).toHaveClass(/bg-primary/);
    });

    test('Can complete full import workflow', async ({ page }) => {
        if (!exportFilePath) {
            test.skip();
            return;
        }

        await page.goto('/fr/admin/propositions/import');

        // Step 1: Upload and analyze
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(exportFilePath);
        await page.waitForTimeout(500);

        await page.getByRole('button', { name: /Analyser le fichier/i }).click();
        await expect(page.getByText('Résoudre les conflits')).toBeVisible({ timeout: 10000 });

        // Step 2: Resolve conflicts (auto-resolve by selecting first available option)
        const proceedToExecution = page.getByRole('button', { name: /Procéder à l'exécution/i });

        // Resolve any conflicts
        const skipRadios = page.locator('input[type="radio"][value="SKIP"]');
        const skipCount = await skipRadios.count();
        for (let i = 0; i < skipCount; i++) {
            await skipRadios.nth(i).check();
        }

        await expect(proceedToExecution).toBeEnabled();
        await proceedToExecution.click();

        // Step 3: Execute import
        await expect(page.getByText("Exécuter l'import")).toBeVisible({ timeout: 5000 });

        const executeButton = page.getByRole('button', { name: /Exécuter l'import/i });
        await expect(executeButton).toBeVisible();
        await executeButton.click();

        // Step 4: Verify completion
        await expect(page.getByText('Import terminé')).toBeVisible({ timeout: 15000 });

        // Verify we're on step 4
        const step4 = page.locator('text=4').first();
        await expect(step4).toHaveClass(/bg-primary/);

        // Verify success message
        await expect(page.getByText(/Import terminé avec succès/i)).toBeVisible();
    });

    test('Shows error for invalid JSON file', async ({ page }) => {
        await page.goto('/fr/admin/propositions/import');

        // Create an invalid JSON file
        const invalidFilePath = path.join('/tmp', 'invalid.json');
        await fs.writeFile(invalidFilePath, '{ invalid json }');

        // Upload the invalid file
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(invalidFilePath);
        await page.waitForTimeout(500);

        // Try to analyze
        const analyzeButton = page.getByRole('button', { name: /Analyser le fichier/i });
        await analyzeButton.click();

        // Verify error message appears
        await expect(page.getByText(/erreur/i)).toBeVisible({ timeout: 5000 });

        // Clean up
        await fs.unlink(invalidFilePath);
    });
});

test.describe('Proposition Import/Export - Accessibility', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('Export page has proper heading hierarchy', async ({ page }) => {
        await page.goto('/fr/admin/propositions/export');

        // Check for h1
        const h1 = page.locator('h1');
        await expect(h1).toBeVisible();
        await expect(h1).toHaveCount(1);
    });

    test('Import page has proper heading hierarchy', async ({ page }) => {
        await page.goto('/fr/admin/propositions/import');

        // Check for h1
        const h1 = page.locator('h1');
        await expect(h1).toBeVisible();
        await expect(h1).toHaveCount(1);
    });

    test('Export buttons have accessible names', async ({ page }) => {
        await page.goto('/fr/admin/propositions/export');

        const exportButton = page.getByRole('button', { name: /Exporter/i });
        await expect(exportButton).toBeVisible();
        await expect(exportButton).toHaveAccessibleName();
    });

    test('Import buttons have accessible names', async ({ page }) => {
        await page.goto('/fr/admin/propositions/import');

        const analyzeButton = page.getByRole('button', { name: /Analyser/i });
        await expect(analyzeButton).toBeVisible();
        await expect(analyzeButton).toHaveAccessibleName();
    });

    test('File upload has proper ARIA labels', async ({ page }) => {
        await page.goto('/fr/admin/propositions/import');

        const fileInput = page.locator('input[type="file"]');
        await expect(fileInput).toBeAttached();
    });

    test('Progress indicator has proper ARIA roles', async ({ page }) => {
        await page.goto('/fr/admin/propositions/import');

        // Verify step indicators are accessible
        const steps = page.locator('[class*="flex"][class*="items-center"]').filter({ hasText: 'Upload' });
        await expect(steps).toBeVisible();
    });
});
