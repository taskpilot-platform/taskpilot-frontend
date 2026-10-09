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

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    route: '/',
    requiresAuth: true,
    theme: 'glass',
    locale: 'en',
    wallpaper: '/bg-glass-1.jpg',
    viewport: { width: 1280, height: 800, name: 'Desktop' },
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--theme' && args[i + 1]) {
      options.theme = args[++i];
    } else if (arg === '--locale' && args[i + 1]) {
      options.locale = args[++i];
    } else if (arg === '--mobile') {
      options.viewport = { width: 393, height: 852, name: 'iPhone_14_Pro' };
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
  const { route: targetRoute, requiresAuth, theme, locale, wallpaper, viewport } = options;

  console.log(`\n=======================================================`);
  console.log(` TASKPILOT CONTRAST & ACCESSIBILITY AUDIT`);
  console.log(` Route:      ${targetRoute}`);
  console.log(` Theme:      ${theme}`);
  console.log(` Locale:     ${locale}`);
  console.log(` Viewport:   ${viewport.name} (${viewport.width}x${viewport.height})`);
  console.log(`=======================================================\n`);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  await page.setViewport(viewport);

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

    console.log(`Auditing route: ${APP_URL}${targetRoute}...`);
    await page.goto(`${APP_URL}${targetRoute}`, { waitUntil: 'networkidle2' });
    await applyThemeAndLocale(page, theme, locale, wallpaper);
    await new Promise(resolve => setTimeout(resolve, 2500)); // Allow hydration and layout to settle

    // Run contrast audit in browser context
    const auditResults = await page.evaluate(({ theme }) => {
      // Color conversion & blending helpers
      function parseRgba(colorStr) {
        if (!colorStr || colorStr === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
        const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (!match) return { r: 0, g: 0, b: 0, a: 1 };
        return {
          r: parseInt(match[1], 10),
          g: parseInt(match[2], 10),
          b: parseInt(match[3], 10),
          a: match[4] !== undefined ? parseFloat(match[4]) : 1
        };
      }

      function rgbToHex({ r, g, b }) {
        return "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
      }

      // Alpha blend: fg over bg
      function blendColor(fg, bg) {
        const a = fg.a + bg.a * (1 - fg.a);
        if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
        const r = Math.round((fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a);
        const g = Math.round((fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a);
        const b = Math.round((fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a);
        return { r, g, b, a };
      }

      // Relative luminance per WCAG 2.1
      function getLuminance({ r, g, b }) {
        const a = [r, g, b].map(v => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
      }

      function getContrastRatio(fgRgb, bgRgb) {
        const l1 = getLuminance(fgRgb);
        const l2 = getLuminance(bgRgb);
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
      }

      // Find effective background by traversing up the DOM
      function getEffectiveBackground(el) {
        // Fallback canvas background depending on theme
        const baseCanvas = theme.includes('dark') 
          ? { r: 9, g: 9, b: 11, a: 1 }    // #09090b
          : { r: 248, g: 250, b: 252, a: 1 }; // #f8fafc (glass light)

        let curr = el;
        const layers = [];

        while (curr && curr !== document.documentElement) {
          const style = window.getComputedStyle(curr);
          const bg = parseRgba(style.backgroundColor);
          if (bg.a > 0) {
            layers.unshift(bg); // Add layer
          }
          curr = curr.parentElement;
        }

        // Composite layers on top of base canvas
        let blended = baseCanvas;
        for (const layer of layers) {
          blended = blendColor(layer, blended);
        }
        return blended;
      }

      // Collect candidate elements
      const candidates = [];
      const selectors = [
        'h1', 'h2', 'h3', 'h4', 'h5',
        'p', 'label', 'li', 'td', 'th',
        'button', 'a', '[role="button"]',
        'input:not([type="hidden"])', 'textarea', 'select',
        '[data-testid]', '.badge', '[data-slot="badge"]'
      ];

      const elements = Array.from(document.querySelectorAll(selectors.join(',')));
      const seenTexts = new Set();

      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) continue;

        let text = el.innerText ? el.innerText.trim() : '';
        if (!text && el.tagName === 'INPUT') {
          text = el.placeholder || el.value || '(input)';
        }
        if (!text || text.length > 80) text = text.substring(0, 77) + '...';
        
        // Deduplicate similar items
        const dedupeKey = `${el.tagName}:${text}`;
        if (seenTexts.has(dedupeKey)) continue;
        seenTexts.add(dedupeKey);

        const fg = parseRgba(style.color);
        const bg = getEffectiveBackground(el);
        const ratio = getContrastRatio(fg, bg);

        const fontSize = parseFloat(style.fontSize);
        const fontWeight = parseInt(style.fontWeight, 10) || 400;
        const isLarge = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
        const minRequired = isLarge ? 3.0 : 4.5;
        const pass = ratio >= minRequired;
        const passAAA = isLarge ? ratio >= 4.5 : ratio >= 7.0;

        let category = 'Body Text';
        if (/^H[1-6]$/.test(el.tagName)) category = 'Heading';
        else if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button' || el.tagName === 'A') category = 'Button / Action';
        else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') category = 'Input Form';
        else if (el.classList.contains('badge') || el.getAttribute('data-slot') === 'badge') category = 'Badge';

        candidates.push({
          tag: el.tagName.toLowerCase(),
          text,
          category,
          fontSize: `${Math.round(fontSize)}px`,
          fontWeight,
          fgHex: rgbToHex(fg),
          bgHex: rgbToHex(bg),
          ratio: parseFloat(ratio.toFixed(2)),
          minRequired,
          pass,
          passAAA,
          isLarge
        });
      }

      return candidates;
    }, { theme });

    // Output directory
    const outputDir = path.resolve(__dirname, 'temp/contrast');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const routeName = targetRoute.replace(/\//g, '_').replace(/^_/, '') || 'root';

    // Summary calculations
    const total = auditResults.length;
    const passed = auditResults.filter(r => r.pass).length;
    const failed = auditResults.filter(r => !r.pass).length;
    const score = total > 0 ? ((passed / total) * 100).toFixed(1) : 100;

    console.log(`---------------------------------------------------------------------------------------------------`);
    console.log(` %-16s | %-24s | %-8s | %-8s | %-8s | %-8s`, "Category", "Element Sample", "FG Color", "BG Color", "Ratio", "WCAG AA");
    console.log(`---------------------------------------------------------------------------------------------------`);

    for (const r of auditResults) {
      const sample = r.text.length > 24 ? r.text.substring(0, 21) + '...' : r.text;
      const statusStr = r.passAAA ? 'PASS (AAA)' : r.pass ? 'PASS (AA)' : 'FAIL';
      console.log(` %-16s | %-24s | %-8s | %-8s | %-8s | %-8s`,
        r.category,
        sample,
        r.fgHex,
        r.bgHex,
        `${r.ratio}:1`,
        statusStr
      );
    }
    console.log(`---------------------------------------------------------------------------------------------------\n`);

    console.log(`▶ KẾT QUẢ KIỂM TOÁN TƯƠNG PHẢN [${theme.toUpperCase()} THEME / ${locale.toUpperCase()}]:`);
    console.log(`  - Tổng số phần tử kiểm tra:  ${total}`);
    console.log(`  - Đạt chuẩn WCAG AA:          ${passed} (${score}%)`);
    console.log(`  - Không đạt chuẩn (<4.5:1):    ${failed}`);

    const reportPath = path.join(outputDir, `contrast_${routeName}_${theme}_${locale}.json`);
    fs.writeFileSync(reportPath, JSON.stringify({
      route: targetRoute,
      theme,
      locale,
      viewport: viewport.name,
      total,
      passed,
      failed,
      score: `${score}%`,
      elements: auditResults
    }, null, 2), 'utf8');

    console.log(`  - Đã lưu báo cáo chi tiết:     ${reportPath}\n`);

    if (failed > 0) {
      console.log(`⚠️  CÁC PHẦN TỬ CẦN TỐI ƯU THÊM ĐỘ TƯƠNG PHẢN:`);
      auditResults.filter(r => !r.pass).forEach(f => {
        console.log(`   * [${f.category}] "${f.text}" (${f.fgHex} trên ${f.bgHex}) -> ${f.ratio}:1 (Yêu cầu >= ${f.minRequired}:1)`);
      });
      console.log();
    } else {
      console.log(`✅ TUYỆT VỜI! 100% CÁC THÀNH PHẦN TRÊN TRANG ĐỀU ĐẠT TIÊU CHUẨN TƯƠNG PHẢN WCAG AA!\n`);
    }

  } catch (error) {
    console.error('Contrast audit failed:', error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
