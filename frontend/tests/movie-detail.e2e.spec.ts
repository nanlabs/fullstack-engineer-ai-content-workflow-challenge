import { test, expect } from '@playwright/test';
import { INCEPTION_ID } from './consts'

const SONG_LABELS = [
  'Time — Hans Zimmer',
  'Why So Serious? — Hans Zimmer & James Newton Howard',
  'Non, Je Ne Regrette Rien — Édith Piaf',
];

test.describe('Movie detail (real backend)', () => {
  test('render + associate song to empty track + update status on filled track', async ({ page }) => {
    // 1) Navigate to Inception detail
    await page.goto(`/movies/${INCEPTION_ID}`);

    // 2) Basic render assertions
    await expect(page.getByTestId('movie-title')).toHaveText('Inception');
    // Ensure we have at least one scene rendered
    await expect(page.getByTestId('scene-section').first()).toBeVisible();

    // =========================
    // Associate song (NO MUTATION)
    // =========================
    // Pick "Truck Flip" scene
    const truckFlip = page
      .getByTestId('scene-section')
      .filter({ has: page.getByRole('heading', { name: 'Truck Flip' }) });

    await expect(truckFlip).toBeVisible();

    // Choose a row that currently has no song assigned
    const emptyTrackRow = truckFlip.getByTestId('track-row').filter({ hasText: 'No song assigned' });
    await expect(emptyTrackRow).toBeVisible();

    // Open associate-song editor
    await emptyTrackRow.getByTestId('track-assoc-btn').click();
    await expect(emptyTrackRow.getByTestId('track-assoc-btn')).toBeHidden();

    // The select should list seeded songs
    const songSelect = emptyTrackRow.getByTestId('track-song-select');
    for (const label of SONG_LABELS) {
      await expect(songSelect).toContainText(label);
    }

    // Selecting a song should enable Save
    await songSelect.selectOption({ label: SONG_LABELS[1] });
    await expect(emptyTrackRow.getByTestId('track-save-song')).toBeEnabled();

    // IMPORTANT: cancel, do not persist
    await emptyTrackRow.getByTestId('track-cancel-assoc').click();

    // Editor should be closed; the associate button should be visible again
    await expect(emptyTrackRow.getByTestId('track-assoc-btn')).toBeVisible();

    // =========================
    // Change status (NO MUTATION)
    // =========================
    // Pick "Dream Within a Dream" scene
    const dreamWithin = page
      .getByTestId('scene-section')
      .filter({ has: page.getByRole('heading', { name: 'Dream Within a Dream' }) });

    // Find row that contains "Time — Hans Zimmer"
    const timeTrackRow = dreamWithin
      .getByTestId('track-row')
      .filter({ hasText: 'Time — Hans Zimmer' });

    await expect(timeTrackRow).toBeVisible();

    // Read current status badge (was seeded APPROVED)
    const statusBadge = timeTrackRow.getByTestId('track-status');
    const initialStatus = (await statusBadge.textContent())?.trim();
    expect(initialStatus).toBeTruthy();

    // Open status editor
    await timeTrackRow.getByTestId('track-change-status').click();

    // Choose a different status to ensure Save enables
    const desired = initialStatus === 'APPROVED' ? 'PENDING' : 'APPROVED';
    await timeTrackRow.getByTestId('track-status-select').selectOption(desired);
    await expect(timeTrackRow.getByTestId('track-save-status')).toBeEnabled();

    // IMPORTANT: cancel, do not persist
    await timeTrackRow.getByTestId('track-cancel-status').click();

    // Editor closed and badge remains unchanged
    await expect(timeTrackRow.getByTestId('track-status')).toHaveText(initialStatus!);
  });
});
