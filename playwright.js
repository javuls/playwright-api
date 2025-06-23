const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runTask({ url, action, formData = {}, script = [] }) {
  const browser = await chromium.launch({ headless: false }); // Run visibly to reduce detection
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  // Stealth tweaks
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });
  await context.setDefaultUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117 Safari/537.36');

  const page = await context.newPage();

  // Block unnecessary resources
  await page.route('**/*', route => {
    const t = route.request().resourceType();
    if (['image', 'media', 'font', 'stylesheet'].includes(t)) {
      route.abort();
    } else {
      route.continue();
    }
  });

  await page.goto(url, { waitUntil: 'networkidle' });

  // 👇 Simulate mouse movement (basic pattern)
  await simulateHumanMouse(page);

  let result = null;

  if (action === 'screenshot') {
    const fileName = `screen-${Date.now()}.png`;
    const filePath = path.join(__dirname, 'results', fileName);
    await page.screenshot({ path: filePath, fullPage: true });
    result = { screenshot: `/results/${fileName}` };

  } else if (action === 'formSubmit') {
    await page.fill('#firstName', formData.firstName);
    await simulateHumanMouse(page);
    await page.fill('#lastName', formData.lastName);
    await simulateHumanMouse(page);
    await page.click('button[type="submit"]');
    await page.waitForSelector('.confirmation', { timeout: 10000 });
    result = { message: 'Form submitted' };

  } else if (action === 'scrapeData') {
    result = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.item')).map(el => el.textContent.trim());
    });

  } else if (action === 'customScript' && Array.isArray(script)) {
    for (const step of script) {
      if (step.type === 'goto') {
        await page.goto(step.selector);
      } else if (step.type === 'click') {
        await simulateHumanMouse(page);
        await page.click(step.selector);
      } else if (step.type === 'fill') {
        await page.fill(step.selector, step.value);
      } else if (step.type === 'waitForSelector') {
        await page.waitForSelector(step.selector);
      }
    }
    result = { message: 'Script executed' };
  }

  await context.storageState({ path: 'results/session.json' });
  await browser.close();
  return result;
}

// 👇 Basic mouse movement simulation
async function simulateHumanMouse(page) {
  const steps = 10;
  const startX = Math.floor(Math.random() * 200 + 100);
  const startY = Math.floor(Math.random() * 200 + 100);
  for (let i = 0; i < steps; i++) {
    await page.mouse.move(
      startX + Math.random() * 50,
      startY + Math.random() * 50,
      { steps: 3 }
    );
    await page.waitForTimeout(Math.floor(Math.random() * 100) + 50);
  }
}

module.exports = { runTask };