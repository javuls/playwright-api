const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runTask({ url, action, formData = {} }) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  // Block unnecessary resources for performance
  await page.route('**/*', route => {
    const t = route.request().resourceType();
    if (['image', 'media', 'font', 'stylesheet'].includes(t)) {
      route.abort();
    } else {
      route.continue();
    }
  });

  await page.goto(url, { waitUntil: 'networkidle' });

  let result = null;

  if (action === 'screenshot') {
    const fileName = `screen-${Date.now()}.png`;
    const filePath = path.join(__dirname, 'results', fileName);
    await page.screenshot({ path: filePath, fullPage: true });
    result = { screenshot: `/results/${fileName}` };

  } else if (action === 'formSubmit') {
    await page.fill('#firstName', formData.firstName);
    await page.fill('#lastName', formData.lastName);
    await page.click('button[type="submit"]');
    await page.waitForSelector('.confirmation', { timeout: 10000 });
    result = { message: 'Form submitted' };

  } else if (action === 'scrapeData') {
    result = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.item')).map(el => el.textContent.trim());
    });
  }

  await context.storageState({ path: 'results/session.json' });
  await browser.close();
  return result;
}

module.exports = { runTask };
