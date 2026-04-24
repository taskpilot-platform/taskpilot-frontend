import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

(async () => {
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
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    await page.type('input[type="email"]', 'dangphuthien2005@gmail.com');
    await page.type('input[type="password"]', 'Zengwong2005@');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);
    
    console.log(`Navigating to route: ${targetRoute}...`);
    await page.goto(`http://localhost:5173${targetRoute}`, { waitUntil: 'networkidle2' });
    
    // Đợi 2 giây cho dữ liệu và theme load xong
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Capturing state...');
    await page.screenshot({ path: outputPath });
    console.log(`Screenshot saved as ${outputPath}`);
    
  } catch (error) {
    console.error('Navigation/Capture failed:', error);
  } finally {
    await browser.close();
  }
})();
