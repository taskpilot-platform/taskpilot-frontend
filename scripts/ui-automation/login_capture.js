import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const outputPath = path.join(__dirname, 'temp', 'dashboard-preview.png');

  try {
    console.log('Accessing login page...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    await page.type('input[type="email"]', 'dangphuthien2005@gmail.com');
    await page.type('input[type="password"]', 'Zengwong2005@');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('Capturing Dashboard screenshot...');
    await page.screenshot({ path: outputPath, fullPage: false });
    console.log(`Screenshot saved as ${outputPath}`);
  } catch (error) {
    console.error('Error during login and capture:', error);
  } finally {
    await browser.close();
  }
})();
