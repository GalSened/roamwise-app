const { test, expect } = require('@playwright/test');

const APP_URL = 'https://galsened.github.io/roamwise-app/';

test.describe('Complete App Navigation Review', () => {
  test('Navigate through all pages and capture screenshots', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });

    // 1. SEARCH PAGE
    console.log('\n=== SEARCH PAGE ===');
    await page.goto(APP_URL);
    await page.waitForSelector('#app', { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'screenshots/01-search-page.png', fullPage: true });

    // Check elements
    const searchInput = await page.locator('#freeText').isVisible();
    const searchBtn = await page.locator('#searchBtn').isVisible();
    const categoryButtons = await page.locator('.category-btn').count();

    console.log('Search Input:', searchInput);
    console.log('Search Button:', searchBtn);
    console.log('Category Buttons:', categoryButtons);

    // Test search functionality
    await page.fill('#freeText', 'coffee shops');
    await page.screenshot({ path: 'screenshots/02-search-with-input.png', fullPage: true });

    await page.click('#searchBtn');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/03-search-results.png', fullPage: true });

    const resultsVisible = await page.locator('#list').isVisible();
    console.log('Search Results Visible:', resultsVisible);

    // 2. AI PAGE
    console.log('\n=== AI PAGE ===');
    await page.click('button.nav-btn[data-view="ai"]');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/04-ai-page.png', fullPage: true });

    const voiceBtn = await page.locator('#voiceBtn').isVisible();
    const actionButtons = await page.locator('.action-btn').count();

    console.log('Voice Button:', voiceBtn);
    console.log('Quick Action Buttons:', actionButtons);

    // Hover over voice button
    await page.hover('#voiceBtn');
    await page.screenshot({ path: 'screenshots/05-ai-voice-hover.png', fullPage: true });

    // Test quick action
    await page.click('button.action-btn[data-action="find-food"]');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/06-ai-quick-action-result.png', fullPage: true });

    // 3. TRIP PAGE
    console.log('\n=== TRIP PAGE ===');
    await page.click('button.nav-btn[data-view="trip"]');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/07-trip-page.png', fullPage: true });

    const durationButtons = await page.locator('.duration-btn').count();
    const interestButtons = await page.locator('.interest-btn').count();
    const budgetSlider = await page.locator('#budgetRange').isVisible();
    const generateBtn = await page.locator('#generateTripBtn').isVisible();

    console.log('Duration Buttons:', durationButtons);
    console.log('Interest Buttons:', interestButtons);
    console.log('Budget Slider:', budgetSlider);
    console.log('Generate Button:', generateBtn);

    // Test validation - generate without interests
    await page.click('#generateTripBtn');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/08-trip-validation-error.png', fullPage: true });

    const validationMessage = await page.locator('#enhancedTripDisplay').textContent();
    console.log('Validation Message:', validationMessage.substring(0, 100));

    // Select interests and generate
    await page.click('.interest-btn[data-interest="food"]');
    await page.click('.interest-btn[data-interest="culture"]');
    await page.screenshot({ path: 'screenshots/09-trip-interests-selected.png', fullPage: true });

    // Adjust budget
    await page.locator('#budgetRange').fill('500');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/10-trip-budget-adjusted.png', fullPage: true });

    // Generate trip
    await page.click('#generateTripBtn');
    await page.waitForTimeout(4000);
    await page.screenshot({ path: 'screenshots/11-trip-generated.png', fullPage: true });

    const tripResults = await page.locator('#enhancedTripDisplay').isVisible();
    console.log('Trip Results Visible:', tripResults);

    // 4. MAP PAGE
    console.log('\n=== MAP PAGE ===');
    await page.click('button.nav-btn[data-view="map"]');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/12-map-page.png', fullPage: true });

    const mapContainer = await page.locator('#map').isVisible();
    const locationBtn = await page.locator('#locationBtn').isVisible();
    const mapTiles = await page.locator('#map .leaflet-tile-pane').isVisible();
    const mapMarker = await page.locator('#map .leaflet-marker-icon').isVisible();
    const zoomControls = await page.locator('#map .leaflet-control-zoom').isVisible();

    console.log('Map Container:', mapContainer);
    console.log('Location Button:', locationBtn);
    console.log('Map Tiles Loaded:', mapTiles);
    console.log('Map Marker:', mapMarker);
    console.log('Zoom Controls:', zoomControls);

    // 5. PROFILE PAGE
    console.log('\n=== PROFILE PAGE ===');
    await page.click('button.nav-btn[data-view="profile"]');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/13-profile-page.png', fullPage: true });

    const checkboxes = await page.locator('input[type="checkbox"]').count();
    console.log('Setting Checkboxes:', checkboxes);

    // Toggle a setting
    const voiceEnabledInitial = await page.locator('#voiceEnabled').isChecked();
    await page.click('#voiceEnabled');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/14-profile-toggle-changed.png', fullPage: true });
    const voiceEnabledAfter = await page.locator('#voiceEnabled').isChecked();

    console.log('Voice Enabled Initial:', voiceEnabledInitial);
    console.log('Voice Enabled After Toggle:', voiceEnabledAfter);

    // 6. NAVIGATION TEST - Tour all pages
    console.log('\n=== NAVIGATION FLOW ===');
    const pages = ['search', 'ai', 'trip', 'map', 'profile'];

    for (const pageName of pages) {
      await page.click(`button.nav-btn[data-view="${pageName}"]`);
      await page.waitForTimeout(500);

      const isActive = await page.locator(`section[data-view="${pageName}"]`).getAttribute('class');
      const navActive = await page
        .locator(`button.nav-btn[data-view="${pageName}"]`)
        .getAttribute('class');

      console.log(
        `${pageName.toUpperCase()} - View Active: ${isActive.includes('active')}, Nav Active: ${navActive.includes('active')}`
      );
    }

    await page.screenshot({ path: 'screenshots/15-final-state.png', fullPage: true });

    console.log('\n=== REVIEW COMPLETE ===');
  });
});
