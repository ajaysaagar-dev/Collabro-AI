const puppeteer = require('puppeteer');

async function runTests() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Enable request interception
    await page.setRequestInterception(true);

    const interceptedRequests = [];
    const consoleLogs = [];

    // Intercept requests
    page.on('request', request => {
      interceptedRequests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers()
      });
      request.continue();
    });

    // Capture console logs
    page.on('console', msg => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      });
    });

    // Navigate to the app
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

    // Wait for the page to be fully loaded
    await page.waitForSelector('body', { timeout: 10000 });

    // Test 1: Verify page loads and has correct title
    const pageTitle = await page.title();
    console.log('Page Title:', pageTitle);

    // Test 2: Check for calculator elements
    const hasCalculator = await page.$('[data-testid="calculator"], .calculator, #calculator');
    console.log('Calculator element found:', !!hasCalculator);

    // Test 3: Test calculator input
    const numberButtons = await page.$$('button[data-value], button[data-key]');
    console.log('Number buttons found:', numberButtons.length);

    // Test 4: Test basic calculation
    const displayElement = await page.$('[data-testid="display"], .display, input[type="text"]');
    if (displayElement) {
      const displayValue = await displayElement.evaluate(el => el.value || el.textContent);
      console.log('Initial display value:', displayValue);
    }

    // Test 5: Click on number buttons
    const buttons = await page.$$('button');
    for (const button of buttons) {
      const buttonText = await button.evaluate(el => el.textContent?.trim());
      if (buttonText && ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(buttonText)) {
        await button.click();
        await new Promise(resolve => setTimeout(resolve, 100));
        break;
      }
    }

    // Test 6: Check for error handling
    const errorElements = await page.$$('.error, [role="alert"]');
    console.log('Error elements found:', errorElements.length);

    // Test 7: Verify network requests
    const apiRequests = interceptedRequests.filter(req => req.url.includes('/api/'));
    console.log('API requests made:', apiRequests.length);

    // Test 8: Check for console errors
    const consoleErrors = consoleLogs.filter(log => log.type === 'error');
    console.log('Console errors:', consoleErrors.length);

    // Test 9: Test form submission if exists
    const forms = await page.$$('form');
    if (forms.length > 0) {
      const form = forms[0];
      const submitButton = await form.$('button[type="submit"], input[type="submit"]');
      if (submitButton) {
        await submitButton.click();
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Test 10: Verify page structure
    const htmlContent = await page.content();
    const hasMain = htmlContent.includes('<main') || htmlContent.includes('role="main"');
    const hasHeader = htmlContent.includes('<header') || htmlContent.includes('role="banner"');
    const hasFooter = htmlContent.includes('<footer') || htmlContent.includes('role="contentinfo"');
    console.log('Page structure - main:', hasMain, 'header:', hasHeader, 'footer:', hasFooter);

    // CDP: Get DOM tree structure
    const client = await page.target().createCDPSession();
    await client.send('DOM.enable');

    const { result: domTree } = await client.send('DOM.getFlattenedDocument');
    console.log('DOM nodes count:', domTree.nodes.length);

    // CDP: Check for specific elements in DOM
    const { result: buttonNodes } = await client.send('DOM.querySelectorAll', {
      nodeId: domTree.nodes[0].nodeId,
      selector: 'button'
    });
    console.log('Buttons in DOM:', buttonNodes.nodeIds.length);

    // CDP: Get page metrics
    const { result: metrics } = await client.send('Page.getMetrics');
    console.log('Page metrics available:', Object.keys(metrics).length);

    // CDP: Check for JavaScript errors
    await client.send('Runtime.enable');
    const jsErrors = [];
    client.on('Runtime.consoleAPICalled', (msg) => {
      if (msg.args && msg.args.length > 0) {
        jsErrors.push(msg.args[0].value);
      }
    });

    // Test 11: Verify calculator functionality
    const calcButtons = await page.$$('button');
    let calcInput = '';
    for (const btn of calcButtons) {
      const text = await btn.evaluate(el => el.textContent?.trim());
      if (text === 'C' || text === 'clear') {
        await btn.click();
        break;
      }
    }

    // Test 12: Check for responsive design
    const viewport = await page.viewport();
    console.log('Viewport:', viewport.width, 'x', viewport.height);

    // Test 13: Verify CSS is loaded
    const stylesheets = await page.$$('link[rel="stylesheet"]');
    console.log('Stylesheets loaded:', stylesheets.length);

    // Test 14: Check for images
    const images = await page.$$('img');
    console.log('Images found:', images.length);

    // Test 15: Final verification
    const finalHtml = await page.content();
    console.log('Final page HTML length:', finalHtml.length);

    console.log('\n=== All Tests Completed ===');

  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

runTests().catch(console.error);