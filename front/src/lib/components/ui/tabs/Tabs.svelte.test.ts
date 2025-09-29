import '@testing-library/jest-dom/vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import TabsTestWrapper from './TabsTestWrapper.svelte';

describe('Tabs component', () => {
    it('emits change event when selecting a tab', async () => {
        const { getByRole } = render(TabsTestWrapper, {
            items: [
                { id: 'overview', label: 'Overview' },
                { id: 'details', label: 'Details' },
            ],
            value: 'overview',
        });

        const detailsTab = getByRole('tab', { name: 'Details' });
        await fireEvent.click(detailsTab);
        expect(detailsTab).toHaveAttribute('aria-selected', 'true');
    });

    it('respects disabled state', async () => {
        const { getByRole } = render(TabsTestWrapper, {
            items: [
                { id: 'overview', label: 'Overview' },
                { id: 'locked', label: 'Locked', disabled: true },
            ],
            value: 'overview',
        });

        const lockedTab = getByRole('tab', { name: 'Locked' });
        expect(lockedTab).toHaveAttribute('aria-disabled', 'true');
        await fireEvent.click(lockedTab);
        expect(lockedTab).toHaveAttribute('aria-selected', 'false');
        const overviewTab = getByRole('tab', { name: 'Overview' });
        expect(overviewTab).toHaveAttribute('aria-selected', 'true');
    });
});
