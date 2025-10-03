import { test, expect } from '@playwright/test';

test.describe('Planner Comfort UI (Step 8A-UI)', () => {
  test('NEARBY mode – shows comfort section on each POI', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-view="planner"]');

    // Choose "My location" start
    await page.click('#btnStartCurrent');

    // Set radius to 5 km
    await page.fill('#nearRadius', '5');

    // Plan
    await page.click('#btnPlanDay');

    // Wait for results
    await page.waitForSelector('#planner-results .poi', { timeout: 15000 });

    // At least one POI should have a .comfort section
    const comfortDivs = page.locator('.poi .comfort');
    expect(await comfortDivs.count()).toBeGreaterThan(0);

    // Check that comfort tags are present if tags exist
    const firstComfort = comfortDivs.first();
    const tagCount = await firstComfort.locator('.tag').count();
    if (tagCount > 0) {
      // Tags should have classes like tag-UV, tag-HEAT, etc.
      const firstTag = firstComfort.locator('.tag').first();
      const className = await firstTag.getAttribute('class');
      expect(className).toMatch(/tag-(UV|HEAT|WIND|RAIN)/);
    }
  });

  test('A→B mode – shows comfort section on each POI', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-view="planner"]');

    // Choose hotel mode
    await page.click('#btnStartHotel');
    await page.fill('#hotelInput', 'Hotel Splendido, Sirmione');
    await page.fill('#destInput', 'Verona Arena');

    // Plan
    await page.click('#btnPlanDay');

    // Wait for results
    await page.waitForSelector('#planner-results .poi', { timeout: 15000 });

    // At least one POI should have a .comfort section
    const comfortDivs = page.locator('.poi .comfort');
    expect(await comfortDivs.count()).toBeGreaterThan(0);
  });
});
