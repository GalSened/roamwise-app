const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('❌ Console Error:', msg.text());
      errors.push(msg.text());
    }
  });

  page.on('pageerror', (error) => {
    console.log('❌ Page Error:', error.message);
    errors.push(error.message);
  });

  console.log('Loading app...');
  await page.goto('https://galsened.github.io/roamwise-app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  console.log('\n=== JAVASCRIPT ERRORS ===');
  if (errors.length === 0) {
    console.log('✅ No errors detected');
  } else {
    console.log(`Found ${errors.length} errors`);
  }

  console.log('\n=== TRYING TO CLICK AI TAB ===');
  try {
    await page.click('button.nav-btn[data-view="ai"]');
    await page.waitForTimeout(1000);

    const viewActive = await page
      .locator('#aiView')
      .evaluate((el) => el.classList.contains('active'));
    console.log('AI View active:', viewActive);
  } catch (e) {
    console.log('Error clicking AI tab:', e.message);
  }

  await browser.close();
})();
