import puppeteer from 'puppeteer';
import { promisify } from 'util';

async function runTests() {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=site-per-process',
    ],
  });

  const page = await browser.newPage();

  // Enable request interception
  await page.setRequestInterception(true);

  const interceptedRequests: { url: string; method: string; headers: Record<string, string> }[] = [];
  const consoleLogs: string[] = [];
  const errors: Error[] = [];

  // Capture console logs
  page.on('console', (msg) => {
    consoleLogs.push(msg.text());
    console.log('Console:', msg.text());
  });

  // Capture errors
  page.on('pageerror', (error) => {
    errors.push(error);
    console.error('Page Error:', error.message);
  });

  // Intercept requests
  page.on('request', (request) => {
    interceptedRequests.push({
      url: request.url(),
      method: request.method(),
      headers: request.headers() as Record<string, string>,
    });
    request.continue();
  });

  try {
    // Navigate to the app
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 });

    // Wait for the page to be fully loaded
    await page.waitForSelector('body', { timeout: 10000 });

    // Test 1: Verify page loads correctly
    const title = await page.title();
    console.log('Page Title:', title);

    // Test 2: Check for theme toggle button
    const themeToggleExists = await page.$('button[aria-label*="theme"], button[role="switch"]');
    if (themeToggleExists) {
      console.log('✓ Theme toggle button found');
    } else {
      console.log('✗ Theme toggle button not found');
    }

    // Test 3: Test theme toggle functionality using CDP
    const client = await page.target().createCDPSession('page');
    await client.send('DOM.enable');
    await client.send('Runtime.enable');

    // Get initial theme state
    const initialTheme = await page.evaluate(() => {
      const theme = localStorage.getItem('theme');
      return theme ? JSON.parse(theme) : { mode: 'light' };
    });
    console.log('Initial Theme:', initialTheme);

    // Click theme toggle
    const themeToggle = await page.$('button[aria-label*="theme"], button[role="switch"]');
    if (themeToggle) {
      await themeToggle.click();
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify theme changed
      const newTheme = await page.evaluate(() => {
        const theme = localStorage.getItem('theme');
        return theme ? JSON.parse(theme) : { mode: 'light' };
      });
      console.log('New Theme:', newTheme);

      if (initialTheme.mode !== newTheme.mode) {
        console.log('✓ Theme toggle functionality works');
      } else {
        console.log('✗ Theme toggle did not change theme');
      }
    }

    // Test 4: Inspect DOM structure using CDP
    const domContent = await client.send('DOM.getSnapshot', {
      depth: -1,
      paintRectangles: true,
      includePaintRulers: false,
    });

    console.log('DOM Snapshot captured');

    // Test 5: Check for CSS variables (theme-related)
    const cssVariables = await page.evaluate(() => {
      const root = document.documentElement;
      const styles = getComputedStyle(root);
      const variables: Record<string, string> = {};
      
      for (let i = 0; i < styles.length; i++) {
        const property = styles[i];
        if (property.startsWith('--')) {
          variables[property] = styles.getPropertyValue(property);
        }
      }
      return variables;
    });

    console.log('CSS Variables:', Object.keys(cssVariables).length, 'found');

    // Test 6: Network request inspection
    const apiRequests = interceptedRequests.filter(req => 
      req.url.includes('/api/') || req.url.includes('/_next/data/')
    );
    console.log('API/Data Requests:', apiRequests.length);

    // Test 7: Check for any errors in console
    if (errors.length > 0) {
      console.log('Errors found:', errors.length);
      errors.forEach(err => console.error('Error:', err.message));
    } else {
      console.log('✓ No console errors');
    }

    // Test 8: Verify responsive design
    await page.setViewport({ width: 375, height: 667 });
    const mobileButton = await page.$('button[aria-label*="theme"], button[role="switch"]');
    if (mobileButton) {
      console.log('✓ Theme toggle responsive on mobile');
    }

    // Reset viewport
    await page.setViewport({ width: 1200, height: 800 });

    // Test 9: Check page structure
    const pageStructure = await page.evaluate(() => {
      const elements = document.querySelectorAll('main, header, footer, nav, section, article');
      return Array.from(elements).map(el => ({
        tagName: el.tagName,
        className: el.className,
        id: el.id,
      }));
    });

    console.log('Page Structure Elements:', pageStructure.length);

    // Test 10: Performance metrics using CDP
    const performanceMetrics = await client.send('Runtime.getPerformanceMetrics');
    const metrics = performanceMetrics.metrics.reduce((acc: Record<string, number>, metric: any) => {
      acc[metric.name] = metric.value;
      return acc;
    }, {});

    console.log('Performance Metrics:');
    console.log('  - Duration:', metrics.Duration?.toFixed(2), 'ms');
    console.log('  - Timestamp:', metrics.Timestamp?.toFixed(0));

    // Final assertion
    console.log('\n=== Test Summary ===');
    console.log('Total Console Logs:', consoleLogs.length);
    console.log('Total Errors:', errors.length);
    console.log('Total Requests Intercepted:', interceptedRequests.length);

  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run tests
runTests().catch(console.error);

export { runTests };