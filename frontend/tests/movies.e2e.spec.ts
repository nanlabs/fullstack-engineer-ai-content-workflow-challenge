import { test, expect } from '@playwright/test';

const M1 = '11111111-1111-1111-1111-111111111111'; // Inception
const M2 = '22222222-2222-2222-2222-222222222222'; // The Dark Knight

test.describe('Movies list (real backend)', () => {
  test('renders seeded movies with stable ids', async ({ page }) => {
    // Go to the UI
    await page.goto('/');

    // Wait for the list container to appear
    const list = page.getByTestId('movies-list');
    await expect(list).toBeVisible();

    const m1Item = page.getByTestId(`movie-item-${M1}`);
    const m2Item = page.getByTestId(`movie-item-${M2}`);

    // Item exists
    await expect(m1Item).toBeVisible();
    await expect(m2Item).toBeVisible();

    // Check link text inside each item (robusto)
    await expect(m1Item.getByRole('link')).toHaveText('Inception');
    await expect(m2Item.getByRole('link')).toHaveText('The Dark Knight');
  });
});
