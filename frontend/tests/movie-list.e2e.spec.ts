import { test, expect } from '@playwright/test';
import { INCEPTION_ID, THE_DARK_KNIGHT_ID } from './consts'

test.describe('Movies list (real backend)', () => {
  test('renders seeded movies with stable ids', async ({ page }) => {
    // Go to the UI
    await page.goto('/');

    // Wait for the list container to appear
    const list = page.getByTestId('movies-list');
    await expect(list).toBeVisible();

    const m1Item = page.getByTestId(`movie-item-${INCEPTION_ID}`);
    const m2Item = page.getByTestId(`movie-item-${THE_DARK_KNIGHT_ID}`);

    // Items exists
    await expect(m1Item).toBeVisible();
    await expect(m2Item).toBeVisible();

    // Check link text inside each item
    await expect(m1Item.getByRole('link')).toHaveText('Inception');
    await expect(m2Item.getByRole('link')).toHaveText('The Dark Knight');
  });
});
