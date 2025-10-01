const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('Loading app...');
  await page.goto('https://galsened.github.io/roamwise-app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  console.log('\n=== NAVIGATION TEST ===');
  const pages = ['search', 'ai', 'trip', 'map', 'profile'];

  for (const pageName of pages) {
    console.log(`\nClicking ${pageName} tab...`);
    await page.click(`button.nav-btn[data-view="${pageName}"]`);
    await page.waitForTimeout(1000);

    const viewActive = await page
      .locator(`#${pageName}View`)
      .evaluate((el) => el.classList.contains('active'));
    const navActive = await page
      .locator(`button.nav-btn[data-view="${pageName}"]`)
      .evaluate((el) => el.classList.contains('active'));

    console.log(`  View active: ${viewActive}`);
    console.log(`  Nav active: ${navActive}`);
    console.log(`  Result: ${viewActive && navActive ? '✅ PASS' : '❌ FAIL'}`);
  }

  console.log('\n=== TEST COMPLETE ===');
  await browser.close();
})();
