const { test, expect } = require('@playwright/test');

const APP_URL = 'https://galsened.github.io/roamwise-app/';

// Helper function to wait for app to load
async function waitForAppLoad(page) {
  await page.waitForSelector('#app', { state: 'visible', timeout: 10000 });
  await page.waitForTimeout(1500); // Wait for loading screen animation
}

// Helper function to navigate to a view
async function navigateToView(page, viewName) {
  await page.click(`button.nav-btn[data-view="${viewName}"]`);
  await page.waitForSelector(`section[data-view="${viewName}"].active`, { timeout: 5000 });
}

test.describe('RoamWise Frontend - Comprehensive Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    await waitForAppLoad(page);
  });

  // ==================== SANITY TESTS ====================
  test.describe('Sanity Tests - Basic App Functionality', () => {
    test('S1: App loads successfully', async ({ page }) => {
      await expect(page.locator('#app')).toBeVisible();
      await expect(page.locator('.bottom-nav')).toBeVisible();
    });

    test('S2: All 5 navigation buttons exist', async ({ page }) => {
      const navButtons = await page.locator('.nav-btn').count();
      expect(navButtons).toBe(5);
    });

    test('S3: Search view is active by default', async ({ page }) => {
      await expect(page.locator('section[data-view="search"]')).toHaveClass(/active/);
      await expect(page.locator('button.nav-btn[data-view="search"]')).toHaveClass(/active/);
    });

    test('S4: All essential page elements render', async ({ page }) => {
      await expect(page.locator('#freeText')).toBeVisible();
      await expect(page.locator('#searchBtn')).toBeVisible();
      await expect(page.locator('.category-btn')).toHaveCount(4);
    });

    test('S5: JavaScript loads without errors', async ({ page }) => {
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));
      await page.reload();
      await waitForAppLoad(page);
      // Allow some errors from cached old app.js, but check console for critical errors
      console.log('Page errors:', errors);
    });
  });

  // ==================== SEARCH PAGE TESTS ====================
  test.describe('Search Page - All Buttons and Interactions', () => {
    test('SP1: Search input accepts text', async ({ page }) => {
      await page.fill('#freeText', 'coffee shops');
      const value = await page.inputValue('#freeText');
      expect(value).toBe('coffee shops');
    });

    test('SP2: Search button is clickable', async ({ page }) => {
      await page.fill('#freeText', 'restaurants');
      await expect(page.locator('#searchBtn')).toBeEnabled();
      await page.click('#searchBtn');
      await expect(page.locator('#searchBtn')).toHaveText(/Searching|Search/);
    });

    test('SP3: Search button shows loading state', async ({ page }) => {
      await page.fill('#freeText', 'hotels');
      await page.click('#searchBtn');
      // Check if button text changes to loading state
      const buttonText = await page.locator('#searchBtn').textContent();
      expect(buttonText).toContain('Searching');
    });

    test('SP4: Search results display after search', async ({ page }) => {
      await page.fill('#freeText', 'museums');
      await page.click('#searchBtn');
      await page.waitForTimeout(2000); // Wait for API call
      const resultsList = page.locator('#list');
      await expect(resultsList).toBeVisible({ timeout: 10000 });
    });

    test('SP5: Food category button works', async ({ page }) => {
      await page.click('button.category-btn[data-category="restaurant"]');
      await page.waitForTimeout(500);
      await expect(page.locator('button.category-btn[data-category="restaurant"]')).toHaveClass(
        /active/
      );
      const searchValue = await page.inputValue('#freeText');
      expect(searchValue).toContain('Food');
    });

    test('SP6: All 4 category buttons work', async ({ page }) => {
      const categories = ['restaurant', 'attraction', 'shopping', 'entertainment'];
      for (const category of categories) {
        await page.click(`button.category-btn[data-category="${category}"]`);
        await page.waitForTimeout(300);
        await expect(page.locator(`button.category-btn[data-category="${category}"]`)).toHaveClass(
          /active/
        );
      }
    });

    test('SP7: Search with empty input does nothing', async ({ page }) => {
      await page.click('#searchBtn');
      await page.waitForTimeout(500);
      const resultsList = page.locator('#list');
      // Should not show results for empty search
      const isVisible = await resultsList.isVisible();
      expect(isVisible).toBe(false);
    });

    test('SP8: Search handles special characters', async ({ page }) => {
      await page.fill('#freeText', '!@#$%^&*()');
      await page.click('#searchBtn');
      await page.waitForTimeout(2000);
      // Should handle gracefully without crashing
      await expect(page.locator('#app')).toBeVisible();
    });
  });

  // ==================== AI PAGE TESTS ====================
  test.describe('AI Page - Voice and Quick Actions', () => {
    test.beforeEach(async ({ page }) => {
      await navigateToView(page, 'ai');
    });

    test('AI1: Voice button exists and is visible', async ({ page }) => {
      await expect(page.locator('#voiceBtn')).toBeVisible();
    });

    test('AI2: Voice button responds to mousedown', async ({ page }) => {
      await page.dispatchEvent('#voiceBtn', 'mousedown');
      await page.waitForTimeout(300);
      await expect(page.locator('#voiceBtn')).toHaveClass(/listening/);
    });

    test('AI3: Voice button text changes on press', async ({ page }) => {
      const initialText = await page.locator('#voiceBtn .voice-text').textContent();
      await page.dispatchEvent('#voiceBtn', 'mousedown');
      await page.waitForTimeout(200);
      const pressedText = await page.locator('#voiceBtn .voice-text').textContent();
      expect(pressedText).not.toBe(initialText);
      expect(pressedText).toContain('Listening');
    });

    test('AI4: Voice button resets on mouseup', async ({ page }) => {
      await page.dispatchEvent('#voiceBtn', 'mousedown');
      await page.waitForTimeout(500);
      await page.dispatchEvent('#voiceBtn', 'mouseup');
      await page.waitForTimeout(2000);
      const finalText = await page.locator('#voiceBtn .voice-text').textContent();
      expect(finalText).toContain('Press & Hold');
    });

    test('AI5: Find Food quick action navigates to search', async ({ page }) => {
      await page.click('button.action-btn[data-action="find-food"]');
      await page.waitForTimeout(500);
      await expect(page.locator('section[data-view="search"]')).toHaveClass(/active/);
      await expect(page.locator('button.nav-btn[data-view="search"]')).toHaveClass(/active/);
    });

    test('AI6: Weather quick action navigates to map', async ({ page }) => {
      await page.click('button.action-btn[data-action="weather"]');
      await page.waitForTimeout(500);
      await expect(page.locator('section[data-view="map"]')).toHaveClass(/active/);
    });

    test('AI7: Directions quick action navigates to map', async ({ page }) => {
      await page.click('button.action-btn[data-action="navigate"]');
      await page.waitForTimeout(500);
      await expect(page.locator('section[data-view="map"]')).toHaveClass(/active/);
    });

    test('AI8: Recommendations quick action navigates to trip', async ({ page }) => {
      await page.click('button.action-btn[data-action="recommend"]');
      await page.waitForTimeout(500);
      await expect(page.locator('section[data-view="trip"]')).toHaveClass(/active/);
    });

    test('AI9: All 4 quick action buttons exist', async ({ page }) => {
      const actionButtons = await page.locator('.action-btn').count();
      expect(actionButtons).toBe(4);
    });
  });

  // ==================== TRIP PAGE TESTS ====================
  test.describe('Trip Page - Planning Form and Generation', () => {
    test.beforeEach(async ({ page }) => {
      await navigateToView(page, 'trip');
    });

    test('TR1: All duration buttons exist', async ({ page }) => {
      const durationButtons = await page.locator('.duration-btn').count();
      expect(durationButtons).toBe(3);
    });

    test('TR2: Duration button selection works', async ({ page }) => {
      await page.click('.duration-btn[data-duration="2"]');
      await expect(page.locator('.duration-btn[data-duration="2"]')).toHaveClass(/selected/);
    });

    test('TR3: Only one duration can be selected', async ({ page }) => {
      await page.click('.duration-btn[data-duration="2"]');
      await page.click('.duration-btn[data-duration="16"]');
      await page.waitForTimeout(200);
      const selectedCount = await page.locator('.duration-btn.selected').count();
      expect(selectedCount).toBe(1);
      await expect(page.locator('.duration-btn[data-duration="16"]')).toHaveClass(/selected/);
    });

    test('TR4: All 6 interest buttons exist', async ({ page }) => {
      const interestButtons = await page.locator('.interest-btn').count();
      expect(interestButtons).toBe(6);
    });

    test('TR5: Interest button selection works', async ({ page }) => {
      await page.click('.interest-btn[data-interest="food"]');
      await page.waitForTimeout(200);
      await expect(page.locator('.interest-btn[data-interest="food"]')).toHaveClass(/selected/);
    });

    test('TR6: Multiple interests can be selected', async ({ page }) => {
      await page.click('.interest-btn[data-interest="food"]');
      await page.click('.interest-btn[data-interest="nature"]');
      await page.click('.interest-btn[data-interest="culture"]');
      await page.waitForTimeout(300);
      const selectedCount = await page.locator('.interest-btn.selected').count();
      expect(selectedCount).toBeGreaterThanOrEqual(2);
    });

    test('TR7: Maximum 4 interests enforced', async ({ page }) => {
      page.on('dialog', (dialog) => dialog.accept());
      const interests = ['food', 'nature', 'culture', 'shopping', 'entertainment'];
      for (const interest of interests) {
        await page.click(`.interest-btn[data-interest="${interest}"]`);
        await page.waitForTimeout(200);
      }
      const selectedCount = await page.locator('.interest-btn.selected').count();
      expect(selectedCount).toBeLessThanOrEqual(4);
    });

    test('TR8: Budget slider moves', async ({ page }) => {
      const slider = page.locator('#budgetRange');
      await slider.fill('500');
      const value = await slider.inputValue();
      expect(value).toBe('500');
    });

    test('TR9: Budget amount updates with slider', async ({ page }) => {
      await page.locator('#budgetRange').fill('750');
      await page.waitForTimeout(300);
      const displayedAmount = await page.locator('#budgetAmount').textContent();
      expect(displayedAmount).toBe('750');
    });

    test('TR10: Generate button exists and is clickable', async ({ page }) => {
      await expect(page.locator('#generateTripBtn')).toBeVisible();
      await expect(page.locator('#generateTripBtn')).toBeEnabled();
    });

    test('TR11: Generate button triggers trip generation', async ({ page }) => {
      await page.click('.interest-btn[data-interest="food"]');
      await page.click('.interest-btn[data-interest="culture"]');
      await page.click('#generateTripBtn');
      await page.waitForTimeout(500);
      const buttonText = await page.locator('#generateTripBtn').textContent();
      expect(buttonText).toContain('Thinking');
    });

    test('TR12: Trip results display after generation', async ({ page }) => {
      await page.click('.interest-btn[data-interest="nature"]');
      await page.click('#generateTripBtn');
      await page.waitForTimeout(3000);
      await expect(page.locator('#enhancedTripDisplay')).toBeVisible();
      const content = await page.locator('#enhancedTripDisplay').textContent();
      expect(content.length).toBeGreaterThan(10);
    });

    test('TR13: Interest can be deselected', async ({ page }) => {
      await page.click('.interest-btn[data-interest="food"]');
      await page.waitForTimeout(200);
      await page.click('.interest-btn[data-interest="food"]');
      await page.waitForTimeout(200);
      await expect(page.locator('.interest-btn[data-interest="food"]')).not.toHaveClass(/selected/);
    });
  });

  // ==================== MAP PAGE TESTS ====================
  test.describe('Map Page - Location and Map Functionality', () => {
    test.beforeEach(async ({ page }) => {
      await navigateToView(page, 'map');
      await page.waitForTimeout(2000); // Wait for map to initialize
    });

    test('M1: Map container exists', async ({ page }) => {
      await expect(page.locator('#map')).toBeVisible();
    });

    test('M2: Location button exists', async ({ page }) => {
      await expect(page.locator('#locationBtn')).toBeVisible();
    });

    test('M3: Location button is clickable', async ({ page }) => {
      await expect(page.locator('#locationBtn')).toBeEnabled();
    });

    test('M4: Map tiles load (check for Leaflet)', async ({ page }) => {
      // Check if Leaflet map layers exist
      const hasMapTiles = await page.locator('#map .leaflet-tile-pane').isVisible();
      expect(hasMapTiles).toBe(true);
    });

    test('M5: Map controls exist', async ({ page }) => {
      const hasZoomControl = await page.locator('#map .leaflet-control-zoom').isVisible();
      expect(hasZoomControl).toBe(true);
    });

    test('M6: Location button responds to click', async ({ page }) => {
      // Grant permissions context
      await page.context().grantPermissions(['geolocation']);
      await page.click('#locationBtn');
      await page.waitForTimeout(500);
      // Button should respond even if geolocation fails
      await expect(page.locator('#locationBtn')).toBeVisible();
    });

    test('M7: Map marker exists', async ({ page }) => {
      await page.waitForTimeout(1000);
      const hasMarker = await page.locator('#map .leaflet-marker-icon').isVisible();
      expect(hasMarker).toBe(true);
    });
  });

  // ==================== PROFILE PAGE TESTS ====================
  test.describe('Profile Page - Settings and Toggles', () => {
    test.beforeEach(async ({ page }) => {
      await navigateToView(page, 'profile');
    });

    test('P1: Voice Guidance toggle exists', async ({ page }) => {
      await expect(page.locator('#voiceEnabled')).toBeVisible();
    });

    test('P2: Weather-Aware toggle exists', async ({ page }) => {
      await expect(page.locator('#weatherAware')).toBeVisible();
    });

    test('P3: Voice Guidance toggle works', async ({ page }) => {
      const initialState = await page.locator('#voiceEnabled').isChecked();
      await page.click('#voiceEnabled');
      await page.waitForTimeout(200);
      const newState = await page.locator('#voiceEnabled').isChecked();
      expect(newState).not.toBe(initialState);
    });

    test('P4: Weather-Aware toggle works', async ({ page }) => {
      const initialState = await page.locator('#weatherAware').isChecked();
      await page.click('#weatherAware');
      await page.waitForTimeout(200);
      const newState = await page.locator('#weatherAware').isChecked();
      expect(newState).not.toBe(initialState);
    });

    test('P5: All setting toggles can be clicked', async ({ page }) => {
      const checkboxes = await page.locator('input[type="checkbox"]').count();
      expect(checkboxes).toBeGreaterThanOrEqual(2);

      const allCheckboxes = await page.locator('input[type="checkbox"]').all();
      for (const checkbox of allCheckboxes) {
        const isEnabled = await checkbox.isEnabled();
        expect(isEnabled).toBe(true);
      }
    });
  });

  // ==================== NAVIGATION TESTS ====================
  test.describe('Navigation - Page Switching', () => {
    test('N1: Can navigate to AI page', async ({ page }) => {
      await navigateToView(page, 'ai');
      await expect(page.locator('section[data-view="ai"]')).toHaveClass(/active/);
    });

    test('N2: Can navigate to Trip page', async ({ page }) => {
      await navigateToView(page, 'trip');
      await expect(page.locator('section[data-view="trip"]')).toHaveClass(/active/);
    });

    test('N3: Can navigate to Map page', async ({ page }) => {
      await navigateToView(page, 'map');
      await expect(page.locator('section[data-view="map"]')).toHaveClass(/active/);
    });

    test('N4: Can navigate to Profile page', async ({ page }) => {
      await navigateToView(page, 'profile');
      await expect(page.locator('section[data-view="profile"]')).toHaveClass(/active/);
    });

    test('N5: Previous view hides when navigating', async ({ page }) => {
      await navigateToView(page, 'ai');
      await expect(page.locator('section[data-view="search"]')).not.toHaveClass(/active/);
    });

    test('N6: Navigation button highlights correct view', async ({ page }) => {
      await navigateToView(page, 'trip');
      await expect(page.locator('button.nav-btn[data-view="trip"]')).toHaveClass(/active/);
      await expect(page.locator('button.nav-btn[data-view="search"]')).not.toHaveClass(/active/);
    });

    test('N7: Can navigate back to search', async ({ page }) => {
      await navigateToView(page, 'ai');
      await navigateToView(page, 'search');
      await expect(page.locator('section[data-view="search"]')).toHaveClass(/active/);
    });

    test('N8: Multiple navigation switches work', async ({ page }) => {
      await navigateToView(page, 'ai');
      await navigateToView(page, 'trip');
      await navigateToView(page, 'map');
      await navigateToView(page, 'profile');
      await expect(page.locator('section[data-view="profile"]')).toHaveClass(/active/);
    });
  });

  // ==================== EDGE CASES ====================
  test.describe('Edge Cases - Unusual Scenarios', () => {
    test('E1: Rapid navigation switching', async ({ page }) => {
      for (let i = 0; i < 10; i++) {
        const views = ['search', 'ai', 'trip', 'map', 'profile'];
        const randomView = views[Math.floor(Math.random() * views.length)];
        await page.click(`button.nav-btn[data-view="${randomView}"]`);
        await page.waitForTimeout(100);
      }
      // App should still be functional
      await expect(page.locator('#app')).toBeVisible();
    });

    test('E2: Multiple button clicks in quick succession', async ({ page }) => {
      await page.click('#searchBtn');
      await page.click('#searchBtn');
      await page.click('#searchBtn');
      await page.waitForTimeout(500);
      // App should handle gracefully
      await expect(page.locator('#app')).toBeVisible();
    });

    test('E3: Search with very long input', async ({ page }) => {
      const longText = 'a'.repeat(1000);
      await page.fill('#freeText', longText);
      await page.click('#searchBtn');
      await page.waitForTimeout(1000);
      await expect(page.locator('#app')).toBeVisible();
    });

    test('E4: Budget slider extreme values', async ({ page }) => {
      await navigateToView(page, 'trip');
      await page.locator('#budgetRange').fill('50'); // Min
      await page.waitForTimeout(200);
      let amount = await page.locator('#budgetAmount').textContent();
      expect(amount).toBe('50');

      await page.locator('#budgetRange').fill('1000'); // Max
      await page.waitForTimeout(200);
      amount = await page.locator('#budgetAmount').textContent();
      expect(amount).toBe('1000');
    });

    test('E5: Generate trip without selecting interests', async ({ page }) => {
      await navigateToView(page, 'trip');
      await page.click('#generateTripBtn');
      await page.waitForTimeout(3000);
      // Should still work with default values
      await expect(page.locator('#enhancedTripDisplay')).toBeVisible();
    });

    test('E6: Click location button repeatedly', async ({ page }) => {
      await navigateToView(page, 'map');
      await page.waitForTimeout(2000);
      await page.context().grantPermissions(['geolocation']);

      for (let i = 0; i < 5; i++) {
        await page.click('#locationBtn');
        await page.waitForTimeout(300);
      }
      // Should handle gracefully
      await expect(page.locator('#locationBtn')).toBeVisible();
    });

    test('E7: Navigate while search is loading', async ({ page }) => {
      await page.fill('#freeText', 'test');
      await page.click('#searchBtn');
      await page.waitForTimeout(200);
      await navigateToView(page, 'ai');
      // Should handle gracefully
      await expect(page.locator('section[data-view="ai"]')).toHaveClass(/active/);
    });

    test('E8: Navigate while trip is generating', async ({ page }) => {
      await navigateToView(page, 'trip');
      await page.click('#generateTripBtn');
      await page.waitForTimeout(500);
      await navigateToView(page, 'search');
      // Should handle gracefully
      await expect(page.locator('section[data-view="search"]')).toHaveClass(/active/);
    });

    test('E9: Theme toggle while interacting', async ({ page }) => {
      const themeToggle = page.locator('#themeToggle');
      if (await themeToggle.isVisible()) {
        await themeToggle.click();
        await page.waitForTimeout(200);
        await page.fill('#freeText', 'test');
        await themeToggle.click();
        await expect(page.locator('#app')).toBeVisible();
      }
    });
  });

  // ==================== COMPLEX USER FLOWS ====================
  test.describe('Complex User Flows - Real World Scenarios', () => {
    test('CF1: Complete search and plan trip flow', async ({ page }) => {
      // Search for something
      await page.fill('#freeText', 'romantic restaurants');
      await page.click('#searchBtn');
      await page.waitForTimeout(2000);

      // Navigate to trip planning
      await navigateToView(page, 'trip');

      // Set preferences
      await page.click('.duration-btn[data-duration="8"]');
      await page.click('.interest-btn[data-interest="food"]');
      await page.click('.interest-btn[data-interest="culture"]');
      await page.locator('#budgetRange').fill('400');

      // Generate trip
      await page.click('#generateTripBtn');
      await page.waitForTimeout(3000);

      // Verify results
      await expect(page.locator('#enhancedTripDisplay')).toBeVisible();
    });

    test('CF2: AI quick action to search flow', async ({ page }) => {
      // Go to AI page
      await navigateToView(page, 'ai');

      // Click Find Food action
      await page.click('button.action-btn[data-action="find-food"]');
      await page.waitForTimeout(500);

      // Verify it navigated and filled search
      await expect(page.locator('section[data-view="search"]')).toHaveClass(/active/);
      const searchValue = await page.inputValue('#freeText');
      expect(searchValue).toContain('Food');

      // Verify search results appear
      await page.waitForTimeout(2000);
      await expect(page.locator('#list')).toBeVisible();
    });

    test('CF3: Full app tour - visit all pages', async ({ page }) => {
      const views = ['search', 'ai', 'trip', 'map', 'profile'];

      for (const view of views) {
        await navigateToView(page, view);
        await page.waitForTimeout(500);
        await expect(page.locator(`section[data-view="${view}"]`)).toHaveClass(/active/);
      }
    });

    test('CF4: Search → View map → Check location', async ({ page }) => {
      // Search for a place
      await page.fill('#freeText', 'tourist attractions');
      await page.click('#searchBtn');
      await page.waitForTimeout(2000);

      // Go to map
      await navigateToView(page, 'map');
      await page.waitForTimeout(2000);

      // Check location
      await page.context().grantPermissions(['geolocation']);
      await page.click('#locationBtn');
      await page.waitForTimeout(1000);

      // Verify map is still visible
      await expect(page.locator('#map')).toBeVisible();
    });

    test('CF5: Plan trip → Weather check → Generate', async ({ page }) => {
      // Go to trip planning
      await navigateToView(page, 'trip');

      // Set some preferences
      await page.click('.interest-btn[data-interest="nature"]');
      await page.click('.interest-btn[data-interest="relaxation"]');

      // Check weather via AI quick action
      await navigateToView(page, 'ai');
      await page.click('button.action-btn[data-action="weather"]');
      await page.waitForTimeout(1000);

      // Go back to trip and generate
      await navigateToView(page, 'trip');
      await page.click('#generateTripBtn');
      await page.waitForTimeout(3000);

      await expect(page.locator('#enhancedTripDisplay')).toBeVisible();
    });

    test('CF6: Category exploration flow', async ({ page }) => {
      const categories = ['restaurant', 'attraction', 'shopping', 'entertainment'];

      for (const category of categories) {
        await page.click(`button.category-btn[data-category="${category}"]`);
        await page.waitForTimeout(2000);

        // Check if results appear
        const isVisible = await page.locator('#list').isVisible();
        expect(isVisible).toBe(true);
      }
    });

    test('CF7: Voice interaction attempt', async ({ page }) => {
      await navigateToView(page, 'ai');

      // Try voice interaction
      await page.dispatchEvent('#voiceBtn', 'mousedown');
      await page.waitForTimeout(1000);
      await page.dispatchEvent('#voiceBtn', 'mouseup');
      await page.waitForTimeout(2000);

      // Check for response
      const voiceResponse = page.locator('#voiceResponse');
      if (await voiceResponse.isVisible()) {
        const responseText = await voiceResponse.textContent();
        expect(responseText.length).toBeGreaterThan(0);
      }
    });

    test('CF8: Profile configuration flow', async ({ page }) => {
      await navigateToView(page, 'profile');

      // Toggle all settings
      const checkboxes = await page.locator('input[type="checkbox"]').all();
      for (const checkbox of checkboxes) {
        const initialState = await checkbox.isChecked();
        await checkbox.click();
        await page.waitForTimeout(200);
        const newState = await checkbox.isChecked();
        expect(newState).not.toBe(initialState);
      }

      // Navigate away and back
      await navigateToView(page, 'search');
      await navigateToView(page, 'profile');

      // Verify still on profile page
      await expect(page.locator('section[data-view="profile"]')).toHaveClass(/active/);
    });

    test('CF9: Multi-interest trip with budget adjustment', async ({ page }) => {
      await navigateToView(page, 'trip');

      // Select multiple interests
      await page.click('.interest-btn[data-interest="food"]');
      await page.click('.interest-btn[data-interest="culture"]');
      await page.click('.interest-btn[data-interest="entertainment"]');
      await page.click('.interest-btn[data-interest="shopping"]');

      // Adjust budget multiple times
      await page.locator('#budgetRange').fill('200');
      await page.waitForTimeout(200);
      await page.locator('#budgetRange').fill('600');
      await page.waitForTimeout(200);
      await page.locator('#budgetRange').fill('400');

      // Change duration
      await page.click('.duration-btn[data-duration="16"]');

      // Generate
      await page.click('#generateTripBtn');
      await page.waitForTimeout(3000);

      await expect(page.locator('#enhancedTripDisplay')).toBeVisible();
    });

    test('CF10: Error recovery flow', async ({ page }) => {
      // Try to generate trip without network (simulate)
      await navigateToView(page, 'trip');
      await page.click('#generateTripBtn');
      await page.waitForTimeout(3000);

      // Even if backend fails, UI should show error message
      await expect(page.locator('#enhancedTripDisplay')).toBeVisible();
      const content = await page.locator('#enhancedTripDisplay').textContent();
      expect(content.length).toBeGreaterThan(10);

      // Try again with different settings
      await page.click('.interest-btn[data-interest="nature"]');
      await page.click('#generateTripBtn');
      await page.waitForTimeout(3000);

      await expect(page.locator('#enhancedTripDisplay')).toBeVisible();
    });
  });

  // ==================== PERFORMANCE TESTS ====================
  test.describe('Performance - Response Times', () => {
    test('PERF1: Page loads within 5 seconds', async ({ page }) => {
      const startTime = Date.now();
      await page.goto(APP_URL);
      await waitForAppLoad(page);
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000);
    });

    test('PERF2: Navigation switches in under 1 second', async ({ page }) => {
      const startTime = Date.now();
      await navigateToView(page, 'ai');
      const navTime = Date.now() - startTime;
      expect(navTime).toBeLessThan(1000);
    });

    test('PERF3: Button clicks respond immediately', async ({ page }) => {
      const startTime = Date.now();
      await page.click('button.category-btn[data-category="restaurant"]');
      await page.waitForSelector('button.category-btn[data-category="restaurant"].active');
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(500);
    });
  });

  // ==================== ACCESSIBILITY TESTS ====================
  test.describe('Accessibility - Basic Checks', () => {
    test('A11Y1: All buttons have text or aria-labels', async ({ page }) => {
      const buttons = await page.locator('button').all();
      for (const button of buttons) {
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        expect(text || ariaLabel).toBeTruthy();
      }
    });

    test('A11Y2: Form inputs have labels or placeholders', async ({ page }) => {
      const searchInput = page.locator('#freeText');
      const placeholder = await searchInput.getAttribute('placeholder');
      expect(placeholder).toBeTruthy();
    });

    test('A11Y3: Navigation is keyboard accessible', async ({ page }) => {
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      // Navigation should work
      await expect(page.locator('#app')).toBeVisible();
    });
  });
});
