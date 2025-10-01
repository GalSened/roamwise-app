import { test, expect } from '@playwright/test';

test('app boots and renders a body', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
  // Optional: if you have a title/brand element, assert it softly:
  const title = page.locator('title');
  await expect(title).toHaveCount(1);
});
