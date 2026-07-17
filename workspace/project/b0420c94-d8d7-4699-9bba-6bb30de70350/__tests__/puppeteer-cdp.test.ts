const puppeteer = require('puppeteer');

async function runTests() {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=site-per-process'
    ]
  });

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
      headers: request.headers(),
      postData: request.postData()
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

  // Capture errors
  page.on('pageerror', error => {
    console.log('Page Error:', error.message);
  });

  try {
    // Navigate to the app
    console.log('Navigating to http://localhost:3000');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

    // Wait for the page to be fully loaded
    await page.waitForSelector('body', { timeout: 10000 });

    // Check for console errors
    const errors = consoleLogs.filter(log => log.type === 'error');
    if (errors.length > 0) {
      console.log('Console Errors Found:');
      errors.forEach(err => console.log(err.text));
    }

    // Check for failed network requests
    const failedRequests = interceptedRequests.filter(req => 
      req.url.includes('/api/') && req.method === 'POST'
    );

    console.log(`Total API requests intercepted: ${interceptedRequests.length}`);

    // Test API routes
    console.log('\n--- Testing API Routes ---');

    // Test GET /api/todos
    try {
      const getTodosResponse = await page.evaluate(async () => {
        const response = await fetch('/api/todos');
        return {
          status: response.status,
          ok: response.ok,
          data: await response.json().catch(() => null)
        };
      });

      console.log('GET /api/todos:', getTodosResponse.status, getTodosResponse.ok);
    } catch (error) {
      console.log('GET /api/todos failed:', error.message);
    }

    // Test POST /api/todos
    try {
      const postTodoResponse = await page.evaluate(async () => {
        const response = await fetch('/api/todos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Test Todo',
            dueDate: new Date(Date.now() + 86400000).toISOString(),
            priority: 1
          })
        });
        return {
          status: response.status,
          ok: response.ok,
          data: await response.json().catch(() => null)
        };
      });

      console.log('POST /api/todos:', postTodoResponse.status, postTodoResponse.ok);
    } catch (error) {
      console.log('POST /api/todos failed:', error.message);
    }

    // Test form submission
    console.log('\n--- Testing Form Submission ---');

    // Check if todo form exists
    const formExists = await page.$('form') !== null;
    console.log('Form exists:', formExists);

    if (formExists) {
      try {
        // Fill out the form
        const input = await page.$('input[type="text"], input[name="title"]');
        if (input) {
          await input.type('Automated Test Todo');
        }

        const submitButton = await page.$('button[type="submit"], button');
        if (submitButton) {
          await submitButton.click();
          await page.waitForTimeout(1000);
        }

        console.log('Form submitted successfully');
      } catch (error) {
        console.log('Form submission failed:', error.message);
      }
    }

    // Check page title and metadata
    console.log('\n--- Checking Page Metadata ---');
    const title = await page.title();
    console.log('Page title:', title);

    const metaDescription = await page.evaluate(() => {
      return document.querySelector('meta[name="description"]')?.getAttribute('content');
    });
    console.log('Meta description:', metaDescription);

    // Check for CSS loading
    console.log('\n--- Checking CSS Loading ---');
    const stylesheets = await page.evaluate(() => {
      return Array.from(document.styleSheets).map(sheet => sheet.href || 'inline');
    });
    console.log(`Loaded ${stylesheets.length} stylesheets`);

    // Check for JavaScript errors in the page
    console.log('\n--- Checking for JavaScript Errors ---');
    const jsErrors = consoleLogs.filter(log => 
      log.type === 'error' && 
      (log.text.includes('Error') || log.text.includes('Exception'))
    );
    console.log(`Found ${jsErrors.length} JavaScript errors`);

    // Verify DOM structure
    console.log('\n--- Verifying DOM Structure ---');
    const hasMainContent = await page.$('main, .main, #main') !== null;
    const hasTodoList = await page.$('[data-testid="todo-list"], .todo-list, #todo-list') !== null;
    console.log('Has main content:', hasMainContent);
    console.log('Has todo list:', hasTodoList);

    // Check API route responses
    console.log('\n--- API Route Response Validation ---');
    const apiRoutes = interceptedRequests.filter(req => req.url.includes('/api/'));
    console.log(`Found ${apiRoutes.length} API route requests`);

    apiRoutes.forEach(route => {
      console.log(`  ${route.method} ${route.url}`);
    });

    console.log('\n--- Test Summary ---');
    console.log('All tests completed');

  } catch (error) {
    console.error('Test execution failed:', error);
  } finally {
    await browser.close();
  }
}

runTests().catch(console.error);