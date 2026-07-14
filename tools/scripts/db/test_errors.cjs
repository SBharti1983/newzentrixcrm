const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
       console.log(`PAGE ERROR: ${msg.text()}`);
    } else {
       console.log(`[${msg.type()}] ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    console.log(`PAGE EXCEPTION: ${err.message}`);
  });

  page.on('requestfailed', request => {
    console.log(`REQUEST FAILED: ${request.url()} - ${request.failure()?.errorText}`);
  });

  await page.goto('http://localhost:5175/login', { waitUntil: 'networkidle' });
  console.log('Page loaded. Checking for inputs...');
  await page.waitForTimeout(2000);
  await browser.close();
})();
