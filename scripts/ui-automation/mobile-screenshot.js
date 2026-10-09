import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const localLib = '/home/dptn/.local/lib:/home/dptn/.local/lib/x86_64-linux-gnu';
if (!process.env.LD_LIBRARY_PATH?.includes('/home/dptn/.local/lib')) {
  process.env.LD_LIBRARY_PATH = `${localLib}:${process.env.LD_LIBRARY_PATH || ''}`;
}

function getPuppeteer() {
  const possiblePaths = [
    path.resolve(__dirname, '../../../../taskpilot-frontend/package.json'),
    path.resolve(__dirname, '../../../taskpilot-frontend/package.json'),
    path.resolve(__dirname, '../../package.json'),
    path.resolve(process.cwd(), 'taskpilot-frontend/package.json'),
    path.resolve(process.cwd(), 'package.json')
  ];
  for (const pkgPath of possiblePaths) {
    if (fs.existsSync(pkgPath)) {
      try {
        const req = createRequire(pkgPath);
        return req('puppeteer');
      } catch (err) {}
    }
  }
  const defaultReq = createRequire(import.meta.url);
  return defaultReq('puppeteer');
}

const puppeteer = getPuppeteer();
const APP_URL = process.env.TASKPILOT_APP_URL || 'http://127.0.0.1:5173';
const TEST_EMAIL = process.env.TASKPILOT_TEST_EMAIL || 'dangphuthien2005@gmail.com';
const TEST_PASSWORD = process.env.TASKPILOT_TEST_PASSWORD || 'abcdefghijkl';

const ALL_VIEWPORTS = [
  { name: 'iPhone_SE', width: 375, height: 667, deviceScaleFactor: 2, isMobile: true },
  { name: 'iPhone_14_Pro', width: 393, height: 852, deviceScaleFactor: 3, isMobile: true },
  { name: 'Galaxy_S21', width: 360, height: 800, deviceScaleFactor: 3, isMobile: true },
  { name: 'iPad_Mini', width: 768, height: 1024, deviceScaleFactor: 2, isMobile: true },
  { name: 'Desktop', width: 1280, height: 800, deviceScaleFactor: 1, isMobile: false }
];

// Helper: Parse CLI flags
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    route: '/',
    requiresAuth: true,
    theme: 'glass', // default to glass theme
    locale: 'en',   // default to english locale
    wallpaper: '/bg-glass-1.jpg',
    viewports: ALL_VIEWPORTS,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--theme' && args[i + 1]) {
      options.theme = args[++i];
    } else if (arg === '--locale' && args[i + 1]) {
      options.locale = args[++i];
    } else if (arg === '--wallpaper' && args[i + 1]) {
      options.wallpaper = args[++i];
    } else if (arg === '--viewports' && args[i + 1]) {
      const selectedNames = args[++i].split(',').map(s => s.trim().toLowerCase());
      options.viewports = ALL_VIEWPORTS.filter(v =>
        selectedNames.includes(v.name.toLowerCase())
      );
    } else if (arg === '--auth' && args[i + 1]) {
      options.requiresAuth = args[++i] !== 'false';
    } else if (arg === '--no-auth') {
      options.requiresAuth = false;
    } else if (!arg.startsWith('--')) {
      if (!options.routeSet) {
        options.route = arg;
        options.routeSet = true;
      } else {
        options.requiresAuth = arg !== 'false';
      }
    }
  }

  return options;
}

async function submitSpaLogin(page, theme, locale, wallpaper) {
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

  await page.waitForSelector('h1, main, [data-testid]', { timeout: 30000 });
}

// Injects theme, wallpaper, and locale into client
async function applyThemeAndLocale(page, theme, locale, wallpaper) {
  await page.evaluate(({ theme, locale, wallpaper }) => {
    try {
      localStorage.setItem('theme', theme);
      localStorage.setItem('i18nextLng', locale);
      localStorage.setItem('taskpilot-color-theme', 'zinc');
      localStorage.setItem('taskpilot-glass-wallpaper', wallpaper);
    } catch (e) {}

    const root = document.documentElement;
    if (theme === 'glass') {
      root.classList.remove('dark', 'light');
      root.classList.add('glass');
    } else if (theme === 'glass-dark') {
      root.classList.add('glass', 'dark');
      root.classList.remove('light');
    } else if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('glass', 'light');
    } else if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('glass', 'dark');
    }

    if (theme.includes('glass')) {
      root.style.setProperty('--glass-bg-image', `url('${wallpaper}')`);
    }

    if (window.i18n && typeof window.i18n.changeLanguage === 'function') {
      window.i18n.changeLanguage(locale);
    }
  }, { theme, locale, wallpaper });
}

(async () => {
  const options = parseArgs();
  const { route: targetRoute, requiresAuth, theme, locale, wallpaper, viewports } = options;

  console.log(`=======================================================`);
  console.log(` TASKPILOT SCREENSHOT CAPTURE`);
  console.log(` Route:      ${targetRoute}`);
  console.log(` Theme:      ${theme}`);
  console.log(` Locale:     ${locale}`);
  console.log(` Wallpaper:  ${wallpaper}`);
  console.log(` Viewports:  ${viewports.map(v => v.name).join(', ')}`);
  console.log(`=======================================================\n`);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // Set default pre-navigation state
  await page.evaluateOnNewDocument(({ theme, locale, wallpaper }) => {
    try {
      localStorage.setItem('theme', theme);
      localStorage.setItem('i18nextLng', locale);
      localStorage.setItem('taskpilot-color-theme', 'zinc');
      localStorage.setItem('taskpilot-glass-wallpaper', wallpaper);
    } catch (e) {}
  }, { theme, locale, wallpaper });

  try {
    if (requiresAuth && targetRoute !== '/login' && targetRoute !== '/register') {
      console.log(`Logging in with ${TEST_EMAIL}...`);
      await page.goto(`${APP_URL}/login`, { waitUntil: 'networkidle2' });
      await applyThemeAndLocale(page, theme, locale, wallpaper);
      await page.type('input[type="email"]', TEST_EMAIL);
      await page.type('input[type="password"]', TEST_PASSWORD);
      await submitSpaLogin(page, theme, locale, wallpaper);
    }

    // Output directory
    const outputDir = path.resolve(__dirname, 'temp/mobile');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const routeName = targetRoute.replace(/\//g, '_').replace(/^_/, '') || 'root';

    for (const vp of viewports) {
      console.log(`Capturing ${vp.name} (${vp.width}x${vp.height}) [${theme} / ${locale}]...`);
      await page.setViewport({
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: vp.deviceScaleFactor,
        isMobile: vp.isMobile,
        hasTouch: vp.isMobile
      });

      await page.goto(`${APP_URL}${targetRoute}`, { waitUntil: 'networkidle2' });
      await applyThemeAndLocale(page, theme, locale, wallpaper);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for render/animations

      const outputPath = path.join(outputDir, `${routeName}_${theme}_${locale}_${vp.name}.png`);
      await page.screenshot({ path: outputPath, fullPage: true });
      console.log(`   -> Saved: ${outputPath}`);
    }

    console.log(`\nAll screenshots successfully captured in "${theme}" theme and "${locale}" locale!`);

  } catch (error) {
    console.error('Capture failed:', error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
