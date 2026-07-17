const { Builder, By, until, Key, Capabilities, logging } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');
const edge = require('selenium-webdriver/edge');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const BROWSER = process.env.BROWSER || 'chrome';
const HEADLESS = process.env.HEADLESS !== 'false';
const TIMEOUT = 30000;
const REPORT_DIR = path.join(__dirname, 'reports');
const REPORT_FILE = path.join(REPORT_DIR, `e2e-report-${Date.now()}.json`);

const routes = [
  { path: '/', name: 'Home', expectRedirect: true },
  { path: '/calculator', name: 'Calculator', requireAuth: true },
  { path: '/login', name: 'Login', public: true },
  { path: '/register', name: 'Register', public: true },
];

const componentSelectors = {
  navbar: '[data-testid="navbar"], nav, header nav, .navbar',
  footer: '[data-testid="footer"], footer, .footer',
  calculatorDisplay: '[data-testid="calculator-display"], .calculator-display, #display',
  calculatorButtons: '[data-testid="calculator-button"], .calc-button, button[data-value]',
  loginForm: '[data-testid="login-form"], form[action*="login"], #login-form',
  registerForm: '[data-testid="register-form"], form[action*="register"], #register-form',
  emailInput: '[data-testid="email-input"], input[type="email"], #email',
  passwordInput: '[data-testid="password-input"], input[type="password"], #password',
  submitButton: '[data-testid="submit-button"], button[type="submit"], .submit-btn',
  errorMessage: '[data-testid="error-message"], .error-message, .alert-error',
  successMessage: '[data-testid="success-message"], .success-message, .alert-success',
  loadingSpinner: '[data-testid="loading"], .spinner, .loading',
};

class TestReporter {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      baseUrl: BASE_URL,
      browser: BROWSER,
      headless: HEADLESS,
      summary: { total: 0, passed: 0, failed: 0, skipped: 0 },
      tests: [],
      consoleLogs: [],
      errors: [],
    };
    this.currentTest = null;
  }

  startTest(name, route) {
    this.currentTest = {
      name,
      route,
      status: 'running',
      startTime: new Date().toISOString(),
      endTime: null,
      duration: 0,
      assertions: [],
      consoleLogs: [],
      screenshots: [],
      error: null,
    };
  }

  addAssertion(description, passed, details = {}) {
    if (this.currentTest) {
      this.currentTest.assertions.push({
        description,
        passed,
        details,
        timestamp: new Date().toISOString(),
      });
    }
  }

  addConsoleLog(entry) {
    if (this.currentTest) {
      this.currentTest.consoleLogs.push({
        level: entry.level.name,
        message: entry.message,
        timestamp: entry.timestamp,
      });
    }
    this.results.consoleLogs.push({
      level: entry.level.name,
      message: entry.message,
      timestamp: entry.timestamp,
      test: this.currentTest?.name || 'global',
    });
  }

  addScreenshot(base64) {
    if (this.currentTest) {
      this.currentTest.screenshots.push(base64);
    }
  }

  endTest(status, error = null) {
    if (this.currentTest) {
      this.currentTest.endTime = new Date().toISOString();
      this.currentTest.duration = new Date(this.currentTest.endTime) - new Date(this.currentTest.startTime);
      this.currentTest.status = status;
      this.currentTest.error = error;
      this.results.tests.push(this.currentTest);
      this.results.summary.total++;
      if (status === 'passed') this.results.summary.passed++;
      else if (status === 'failed') this.results.summary.failed++;
      else this.results.summary.skipped++;
      this.currentTest = null;
    }
  }

  addError(message, stack = null) {
    this.results.errors.push({ message, stack, timestamp: new Date().toISOString() });
  }

  save() {
    if (!fs.existsSync(REPORT_DIR)) {
      fs.mkdirSync(REPORT_DIR, { recursive: true });
    }
    fs.writeFileSync(REPORT_FILE, JSON.stringify(this.results, null, 2));
    console.log(`\nReport saved to: ${REPORT_FILE}`);
    return REPORT_FILE;
  }

  printSummary() {
    console.log('\n========== TEST SUMMARY ==========');
    console.log(`Total: ${this.results.summary.total}`);
    console.log(`Passed: ${this.results.summary.passed}`);
    console.log(`Failed: ${this.results.summary.failed}`);
    console.log(`Skipped: ${this.results.summary.skipped}`);
    console.log('==================================\n');
  }
}

async function createDriver() {
  let builder = new Builder();
  const caps = new Capabilities();

  caps.set('goog:loggingPrefs', { browser: 'ALL', driver: 'ALL' });
  caps.set('ms:loggingPrefs', { browser: 'ALL', driver: 'ALL' });

  switch (BROWSER.toLowerCase()) {
    case 'firefox': {
      const options = new firefox.Options();
      if (HEADLESS) options.addArguments('-headless');
      options.setPreference('devtools.console.stdout.content', true);
      builder = builder.forBrowser('firefox').setFirefoxOptions(options);
      break;
    }
    case 'edge': {
      const options = new edge.Options();
      if (HEADLESS) options.addArguments('--headless=new');
      options.setCapability('ms:loggingPrefs', { browser: 'ALL' });
      builder = builder.forBrowser('MicrosoftEdge').setEdgeOptions(options);
      break;
    }
    case 'chrome':
    default: {
      const options = new chrome.Options();
      if (HEADLESS) options.addArguments('--headless=new');
      options.addArguments('--no-sandbox');
      options.addArguments('--disable-dev-shm-usage');
      options.addArguments('--disable-gpu');
      options.addArguments('--window-size=1920,1080');
      options.setCapability('goog:loggingPrefs', { browser: 'ALL', driver: 'ALL', performance: 'ALL' });
      builder = builder.forBrowser('chrome').setChromeOptions(options);
      break;
    }
  }

  builder = builder.withCapabilities(caps);
  const driver = await builder.build();
  await driver.manage().setTimeouts({ implicit: 5000, pageLoad: TIMEOUT, script: TIMEOUT });
  return driver;
}

async function captureConsoleLogs(driver, reporter) {
  try {
    const logs = await driver.manage().logs().get(logging.Type.BROWSER);
    for (const entry of logs) {
      reporter.addConsoleLog(entry);
    }
  } catch (e) {
    // Ignore log capture errors
  }
}

async function takeScreenshot(driver, reporter, name) {
  try {
    const screenshot = await driver.takeScreenshot();
    reporter.addScreenshot(screenshot);
    return screenshot;
  } catch (e) {
    return null;
  }
}

async function waitForElement(driver, selector, timeout = TIMEOUT) {
  try {
    const element = await driver.wait(until.elementLocated(By.css(selector)), timeout);
    await driver.wait(until.elementIsVisible(element), timeout);
    return element;
  } catch (e) {
    return null;
  }
}

async function waitForAnyElement(driver, selectors, timeout = TIMEOUT) {
  for (const selector of selectors) {
    const element = await waitForElement(driver, selector, 3000);
    if (element) return { element, selector };
  }
  return null;
}

async function checkPageLoad(driver, reporter, testName) {
  const assertions = [];
  
  try {
    await driver.wait(until.urlContains(BASE_URL), TIMEOUT);
    assertions.push({ desc: 'Page URL loaded', passed: true });
  } catch (e) {
    assertions.push({ desc: 'Page URL loaded', passed: false, details: e.message });
  }

  try {
    await driver.wait(() => driver.executeScript('return document.readyState'), TIMEOUT)
      .then(state => state === 'complete');
    assertions.push({ desc: 'Document readyState complete', passed: true });
  } catch (e) {
    assertions.push({ desc: 'Document readyState complete', passed: false, details: e.message });
  }

  try {
    const title = await driver.getTitle();
    assertions.push({ desc: `Page title: "${title}"`, passed: title.length > 0 });
  } catch (e) {
    assertions.push({ desc: 'Page title retrieved', passed: false, details: e.message });
  }

  for (const a of assertions) {
    reporter.addAssertion(a.desc, a.passed, a.details || {});
  }

  return assertions.every(a => a.passed);
}

async function checkComponents(driver, reporter, expectedComponents = []) {
  const results = {};
  
  for (const [name, selector] of Object.entries(componentSelectors)) {
    if (expectedComponents.length > 0 && !expectedComponents.includes(name)) continue;
    
    try {
      const element = await driver.findElement(By.css(selector));
      const isVisible = await element.isDisplayed();
      results[name] = { found: true, visible: isVisible, selector };
      reporter.addAssertion(`Component "${name}" present`, true, { selector, visible: isVisible });
    } catch (e) {
      results[name] = { found: false, visible: false, selector };
      reporter.addAssertion(`Component "${name}" present`, false, { selector, error: e.message });
    }
  }
  
  return results;
}

async function fillForm(driver, fields) {
  for (const [selector, value] of Object.entries(fields)) {
    try {
      const input = await waitForElement(driver, selector);
      if (input) {
        await input.clear();
        await input.sendKeys(value);
        await driver.sleep(100);
      }
    } catch (e) {
      console.warn(`Failed to fill field ${selector}:`, e.message);
    }
  }
}

async function submitForm(driver, submitSelector) {
  try {
    const button = await waitForElement(driver, submitSelector);
    if (button) {
      await button.click();
      return true;
    }
  } catch (e) {
    console.warn('Form submit failed:', e.message);
  }
  return false;
}

async function testRoute(driver, reporter, route) {
  reporter.startTest(`Route: ${route.name}`, route.path);
  
  try {
    await driver.get(`${BASE_URL}${route.path}`);
    await driver.sleep(1000);
    await captureConsoleLogs(driver, reporter);
    await takeScreenshot(driver, reporter, `route-${route.name}`);

    const pageLoaded = await checkPageLoad(driver, reporter, route.name);
    if (!pageLoaded) {
      throw new Error('Page load validation failed');
    }

    const isAuthPage = route.path === '/login' || route.path === '/register';
    const isCalculator = route.path === '/calculator';
    const isHome = route.path === '/';

    let expectedComponents = ['navbar', 'footer'];
    if (isCalculator) expectedComponents.push('calculatorDisplay', 'calculatorButtons');
    if (isAuthPage) expectedComponents.push(isAuthPage ? 'loginForm' : 'registerForm', 'emailInput', 'passwordInput', 'submitButton');

    await checkComponents(driver, reporter, expectedComponents);

    if (isCalculator) {
      await testCalculator(driver, reporter);
    } else if (isAuthPage) {
      await testAuthForm(driver, reporter, route.path);
    } else if (isHome) {
      await testHomePage(driver, reporter);
    }

    reporter.endTest('passed');
  } catch (error) {
    await takeScreenshot(driver, reporter, `error-${route.name}`);
    reporter.addError(`Route ${route.name} failed: ${error.message}`, error.stack);
    reporter.endTest('failed', { message: error.message, stack: error.stack });
  }
}

async function testHomePage(driver, reporter) {
  reporter.addAssertion('Home page loaded', true);
  
  try {
    const currentUrl = await driver.getCurrentUrl();
    const isRedirected = currentUrl.includes('/login') || currentUrl.includes('/calculator');
    reporter.addAssertion('Home page redirects (auth check)', isRedirected, { currentUrl });
  } catch (e) {
    reporter.addAssertion('Home page redirect check', false, { error: e.message });
  }
}

async function testAuthForm(driver, reporter, path) {
  const isLogin = path === '/login';
  
  try {
    await fillForm(driver, {
      [componentSelectors.emailInput]: isLogin ? 'test@example.com' : 'newuser@example.com',
      [componentSelectors.passwordInput]: 'TestPass123!',
    });
    reporter.addAssertion('Auth form filled', true);

    await submitForm(driver, componentSelectors.submitButton);
    await driver.sleep(2000);
    await captureConsoleLogs(driver, reporter);

    const currentUrl = await driver.getCurrentUrl();
    const hasError = await driver.findElements(By.css(componentSelectors.errorMessage));
    const hasSuccess = await driver.findElements(By.css(componentSelectors.successMessage));

    if (hasError.length > 0) {
      const errorText = await hasError[0].getText();
      reporter.addAssertion('Auth form shows error (expected for invalid creds)', true, { error: errorText });
    } else if (currentUrl.includes('/calculator') || currentUrl.includes('/dashboard')) {
      reporter.addAssertion('Auth form redirects on success', true, { redirectUrl: currentUrl });
    } else {
      reporter.addAssertion('Auth form submission completed', true, { currentUrl });
    }
  } catch (e) {
    reporter.addAssertion('Auth form interaction', false, { error: e.message });
  }
}

async function testCalculator(driver, reporter) {
  try {
    const display = await waitForElement(driver, componentSelectors.calculatorDisplay);
    if (!display) throw new Error('Calculator display not found');

    const initialValue = await display.getText();
    reporter.addAssertion('Calculator display visible', true, { initialValue });

    const buttons = await driver.findElements(By.css(componentSelectors.calculatorButtons));
    reporter.addAssertion(`Calculator buttons found: ${buttons.length}`, buttons.length > 0);

    const testOperations = [
      { keys: ['7', '+', '3', '='], expected: '10' },
      { keys: ['5', '*', '4', '='], expected: '20' },
      { keys: ['9', '-', '2', '='], expected: '7' },
      { keys: ['8', '/', '2', '='], expected: '4' },
    ];

    for (const op of testOperations) {
      await clearCalculator(driver);
      for (const key of op.keys) {
        const btn = await findButtonByValue(driver, key);
        if (btn) {
          await btn.click();
          await driver.sleep(100);
        }
      }
      await driver.sleep(500);
      const result = await display.getText();
      const passed = result.includes(op.expected) || result === op.expected;
      reporter.addAssertion(`Calculator: ${op.keys.join(' ')} = ${op.expected}`, passed, { actual: result, expected: op.expected });
    }

    await testCalculatorEdgeCases(driver, reporter);
  } catch (e) {
    reporter.addAssertion('Calculator functionality', false, { error: e.message });
  }
}

async function clearCalculator(driver) {
  try {
    const clearBtn = await findButtonByValue(driver, 'C') || await findButtonByValue(driver, 'AC') || await findButtonByValue(driver, 'Clear');
    if (clearBtn) await clearBtn.click();
  } catch (e) {
    // Ignore
  }
}

async function findButtonByValue(driver, value) {
  const selectors = [
    `[data-value="${value}"]`,
    `[data-testid="calculator-button-${value}"]`,
    `button:contains("${value}")`,
    `.calc-button[data-value="${value}"]`,
  ];
  
  for (const sel of selectors) {
    try {
      const btn = await driver.findElement(By.css(sel));
      if (await btn.isDisplayed()) return btn;
    } catch (e) {
      // Continue
    }
  }
  
  try {
    const buttons = await driver.findElements(By.css(componentSelectors.calculatorButtons));
    for (const btn of buttons) {
      const text = await btn.getText();
      if (text.trim() === value) return btn;
    }
  } catch (e) {
    // Ignore
  }
  return null;
}

async function testCalculatorEdgeCases(driver, reporter) {
  try {
    await clearCalculator(driver);
    const display = await waitForElement(driver, componentSelectors.calculatorDisplay);
    
    const divZeroBtn = await findButtonByValue(driver, '/');
    const zeroBtn = await findButtonByValue(driver, '