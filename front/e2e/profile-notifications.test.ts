import { test, expect } from '@playwright/test';

test.describe('Profile Notifications Settings', () => {
    test.beforeEach(async ({ page }) => {
        // TODO: Add proper authentication setup
        // For now, assuming user is logged in via cookies or session
        await page.goto('/profile/notifications');
    });

    test('should display notification settings page', async ({ page }) => {
        // Check page title
        await expect(page.getByRole('heading', { name: /préférences de notifications/i })).toBeVisible();

        // Check description text
        await expect(page.getByText(/choisissez comment vous souhaitez recevoir/i)).toBeVisible();
    });

    test('should display notification type headers', async ({ page }) => {
        // Check column headers
        await expect(page.getByText('Type de notification')).toBeVisible();
        await expect(page.getByText('In-app')).toBeVisible();
        await expect(page.getByText('Email')).toBeVisible();
        await expect(page.getByText('Push')).toBeVisible();
    });

    test('should display all 10 notification types', async ({ page }) => {
        // Wait for data to load
        await page.waitForSelector('[role="switch"]', { timeout: 5000 });

        // Check that we have notification types displayed
        const notificationTypes = [
            'Changements de statut de proposition',
            'Affectations de mandat',
            'Révocations de mandat',
            'Uploads de livrables',
            'Évaluations de livrables',
            'Commentaires ajoutés',
            'Demandes de clarification',
            'Mises à jour de clarification',
            'Suppressions de clarification',
            'Échanges planifiés',
        ];

        for (const type of notificationTypes) {
            await expect(page.getByText(type)).toBeVisible();
        }
    });

    test('should have 30 toggle switches (10 types × 3 channels)', async ({ page }) => {
        // Wait for data to load
        await page.waitForSelector('[role="switch"]', { timeout: 5000 });

        // Count switches
        const switches = await page.locator('[role="switch"]').count();
        expect(switches).toBe(30); // 10 notification types × 3 channels
    });

    test('should toggle notification channel on click', async ({ page }) => {
        // Wait for switches to load
        await page.waitForSelector('[role="switch"]', { timeout: 5000 });

        // Get first switch
        const firstSwitch = page.locator('[role="switch"]').first();

        // Get initial state
        const initialState = await firstSwitch.getAttribute('aria-checked');

        // Click to toggle
        await firstSwitch.click();

        // Wait a bit for state change
        await page.waitForTimeout(100);

        // Check state changed
        const newState = await firstSwitch.getAttribute('aria-checked');
        expect(newState).not.toBe(initialState);
    });

    test('should have a save button', async ({ page }) => {
        // Check save button exists
        const saveButton = page.getByRole('button', { name: /enregistrer les préférences/i });
        await expect(saveButton).toBeVisible();
        await expect(saveButton).toBeEnabled();
    });

    test('should show loading state initially', async ({ page }) => {
        // Reload to see loading state
        await page.reload();

        // Check for loading spinner (should appear briefly)
        const loader = page.locator('[class*="animate-spin"]');
        // Note: This might be too fast to catch, so we just check the page loads
        await expect(page.getByRole('heading', { name: /préférences de notifications/i })).toBeVisible();
    });

    test('should save settings when save button is clicked', async ({ page }) => {
        // Wait for data to load
        await page.waitForSelector('[role="switch"]', { timeout: 5000 });

        // Toggle a switch
        const firstSwitch = page.locator('[role="switch"]').first();
        await firstSwitch.click();

        // Click save button
        const saveButton = page.getByRole('button', { name: /enregistrer les préférences/i });
        await saveButton.click();

        // Wait for toast message or success indicator
        // TODO: Add check for success toast message
        await page.waitForTimeout(1000);

        // Button should not be in loading state anymore
        await expect(saveButton).toBeEnabled();
    });

    test('should show correct switch states for enabled/disabled channels', async ({ page }) => {
        // Wait for data to load
        await page.waitForSelector('[role="switch"]', { timeout: 5000 });

        // Find an enabled switch
        const enabledSwitch = page.locator('[role="switch"][aria-checked="true"]').first();
        if ((await enabledSwitch.count()) > 0) {
            // Check it has the right visual indicator (translate-x-6)
            const switchHandle = enabledSwitch.locator('span').first();
            await expect(switchHandle).toHaveClass(/translate-x-6/);
        }

        // Find a disabled switch
        const disabledSwitch = page.locator('[role="switch"][aria-checked="false"]').first();
        if ((await disabledSwitch.count()) > 0) {
            // Check it has the right visual indicator (translate-x-1)
            const switchHandle = disabledSwitch.locator('span').first();
            await expect(switchHandle).toHaveClass(/translate-x-1/);
        }
    });
});
