import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_URL = process.env.TASKPILOT_APP_URL || 'http://127.0.0.1:5173';
const TEST_EMAIL = process.env.TASKPILOT_TEST_EMAIL;
const TEST_PASSWORD = process.env.TASKPILOT_TEST_PASSWORD;

async function submitSpaLogin(page) {
  const loginResponse = await Promise.all([
    page.waitForResponse(
      response => response.url().includes('/api/v1/auth/login'),
      { timeout: 30000 }
    ).catch(() => null),
    page.click('button[type="submit"]')
  ]).then(([response]) => response);

  if (loginResponse && loginResponse.status() >= 400) {
    throw new Error(`Login request failed with HTTP ${loginResponse.status()}`);
  }

  await page.waitForFunction(
    () => window.location.pathname !== '/login' || Boolean(localStorage.getItem('taskpilot_access_token')),
    { timeout: 30000 }
  );

  const hasTokenOnLoginPage = await page.evaluate(
    () => window.location.pathname === '/login' && Boolean(localStorage.getItem('taskpilot_access_token'))
  );
  if (hasTokenOnLoginPage) {
    await page.goto(`${APP_URL}/`, { waitUntil: 'networkidle2' });
  }

  await page.waitForSelector('h1, main', { timeout: 30000 });
}

(async () => {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error('Set TASKPILOT_TEST_EMAIL and TASKPILOT_TEST_PASSWORD before running this script.');
  }

  // Lấy route từ tham số dòng lệnh (mặc định là /)
  const targetRoute = process.argv[2] || '/';
  const screenshotName = targetRoute.replace(/\//g, '_') || 'root';
  const outputPath = path.join(__dirname, 'temp', `review-${screenshotName}.png`);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000 });

  try {
    console.log('Logging in...');
    await page.goto(`${APP_URL}/login`, { waitUntil: 'networkidle2' });
    await page.type('input[type="email"]', TEST_EMAIL);
    await page.type('input[type="password"]', TEST_PASSWORD);
    await submitSpaLogin(page);
    
    console.log(`Navigating to route: ${targetRoute}...`);
    await page.goto(`${APP_URL}${targetRoute}`, { waitUntil: 'networkidle2' });
    
    // Đợi 2 giây cho dữ liệu và theme load xong
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Capturing state...');
    await page.screenshot({ path: outputPath });
    console.log(`Screenshot saved as ${outputPath}`);
    
  } catch (error) {
    console.error('Navigation/Capture failed:', error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
