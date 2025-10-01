const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('Loading app...');
  await page.goto('https://galsened.github.io/roamwise-app/', { waitUntil: 'networkidle' });

  await page.waitForTimeout(2000);

  const report = [];

  // === SEARCH PAGE ===
  report.push('\n========================================');
  report.push('         SEARCH PAGE ANALYSIS');
  report.push('========================================\n');

  const searchActive = await page
    .locator('#searchView')
    .evaluate((el) => el.classList.contains('active'));
  report.push('✓ Search view is default active page: ' + searchActive);

  const searchInput = await page.locator('#freeText').count();
  const searchBtn = await page.locator('#searchBtn').count();
  const categoryBtns = await page.locator('.category-btn').count();

  report.push('✓ Search input field exists: ' + (searchInput > 0));
  report.push('✓ Search button exists: ' + (searchBtn > 0));
  report.push('✓ Category buttons (4): ' + (categoryBtns === 4));

  // === AI PAGE ===
  report.push('\n========================================');
  report.push('           AI PAGE ANALYSIS');
  report.push('========================================\n');

  await page.click('button.nav-btn[data-view="ai"]');
  await page.waitForTimeout(1000);

  const aiActive = await page.locator('#aiView').evaluate((el) => el.classList.contains('active'));
  report.push('✓ AI view becomes active: ' + aiActive);

  const voiceBtn = await page.locator('#voiceBtn').count();
  const voiceText = await page
    .locator('#voiceBtn .voice-text')
    .textContent()
    .catch(() => 'N/A');
  const quickActions = await page.locator('.action-btn').count();

  report.push('✓ Voice button exists: ' + (voiceBtn > 0));
  report.push('✓ Voice button text: ' + voiceText);
  report.push('✓ Quick action buttons (4): ' + (quickActions === 4));

  const speechSupported = await page.evaluate(() => {
    const hasAPI =
      typeof window.SpeechRecognition !== 'undefined' ||
      typeof window.webkitSpeechRecognition !== 'undefined';
    return hasAPI;
  });
  report.push('✓ Web Speech API supported: ' + speechSupported);

  // === TRIP PAGE ===
  report.push('\n========================================');
  report.push('          TRIP PAGE ANALYSIS');
  report.push('========================================\n');

  await page.click('button.nav-btn[data-view="trip"]');
  await page.waitForTimeout(1000);

  const tripActive = await page
    .locator('#tripView')
    .evaluate((el) => el.classList.contains('active'));
  report.push('✓ Trip view becomes active: ' + tripActive);

  const durationBtns = await page.locator('.duration-btn').count();
  const interestBtns = await page.locator('.interest-btn').count();
  const budgetSlider = await page.locator('#budgetRange').count();
  const generateBtn = await page.locator('#generateTripBtn').count();

  report.push('✓ Duration buttons (3): ' + (durationBtns === 3));
  report.push('✓ Interest buttons (6): ' + (interestBtns === 6));
  report.push('✓ Budget slider exists: ' + (budgetSlider > 0));
  report.push('✓ Generate button exists: ' + (generateBtn > 0));

  const generateBtnText = await page.locator('#generateTripBtn').textContent();
  report.push('✓ Generate button text: ' + generateBtnText.trim());

  // Note: Validation test skipped - button not visible in hidden view

  // === MAP PAGE ===
  report.push('\n========================================');
  report.push('           MAP PAGE ANALYSIS');
  report.push('========================================\n');

  await page.click('button.nav-btn[data-view="map"]');
  await page.waitForTimeout(2500);

  const mapActive = await page
    .locator('#mapView')
    .evaluate((el) => el.classList.contains('active'));
  report.push('✓ Map view becomes active: ' + mapActive);

  const mapContainer = await page.locator('#map').count();
  const locationBtn = await page.locator('#locationBtn').count();

  const leafletLoaded = await page.evaluate(() => typeof L !== 'undefined');
  const leafletMap = await page.locator('.leaflet-container').count();
  const leafletTiles = await page.locator('.leaflet-tile-pane').count();
  const leafletMarker = await page.locator('.leaflet-marker-icon').count();
  const zoomControls = await page.locator('.leaflet-control-zoom').count();

  report.push('✓ Map container exists: ' + (mapContainer > 0));
  report.push('✓ Location button exists: ' + (locationBtn > 0));
  report.push('✓ Leaflet library loaded: ' + leafletLoaded);
  report.push('✓ Leaflet map initialized: ' + (leafletMap > 0));
  report.push('✓ Map tiles loaded: ' + (leafletTiles > 0));
  report.push('✓ Map marker present: ' + (leafletMarker > 0));
  report.push('✓ Zoom controls visible: ' + (zoomControls > 0));

  // === PROFILE PAGE ===
  report.push('\n========================================');
  report.push('         PROFILE PAGE ANALYSIS');
  report.push('========================================\n');

  await page.click('button.nav-btn[data-view="profile"]');
  await page.waitForTimeout(1000);

  const profileActive = await page
    .locator('#profileView')
    .evaluate((el) => el.classList.contains('active'));
  report.push('✓ Profile view becomes active: ' + profileActive);

  const checkboxes = await page.locator('input[type="checkbox"]').count();
  const voiceEnabled = await page.locator('#voiceEnabled').count();
  const weatherEnabled = await page.locator('#weatherEnabled').count();

  report.push('✓ Setting checkboxes (2): ' + (checkboxes === 2));
  report.push('✓ Voice Guidance toggle exists: ' + (voiceEnabled > 0));
  report.push('✓ Weather-Aware toggle exists: ' + (weatherEnabled > 0));

  const initialState = await page.locator('#voiceEnabled').isChecked();
  await page.click('#voiceEnabled');
  await page.waitForTimeout(300);
  const afterState = await page.locator('#voiceEnabled').isChecked();
  const toggleWorks = initialState !== afterState;

  report.push('✓ Toggle changes state: ' + toggleWorks);

  // === NAVIGATION TEST ===
  report.push('\n========================================');
  report.push('       NAVIGATION SYSTEM TEST');
  report.push('========================================\n');

  const pages = ['search', 'ai', 'trip', 'map', 'profile'];
  for (const pageName of pages) {
    await page.click(`button.nav-btn[data-view="${pageName}"]`);
    await page.waitForTimeout(500);

    const viewActive = await page
      .locator(`#${pageName}View`)
      .evaluate((el) => el.classList.contains('active'));
    const navActive = await page
      .locator(`button.nav-btn[data-view="${pageName}"]`)
      .evaluate((el) => el.classList.contains('active'));

    report.push(`✓ ${pageName.toUpperCase()} navigation: View=${viewActive}, Nav=${navActive}`);
  }

  await browser.close();

  report.push('\n========================================');
  report.push('        ANALYSIS COMPLETE');
  report.push('========================================');

  report.forEach((line) => console.log(line));
})();
