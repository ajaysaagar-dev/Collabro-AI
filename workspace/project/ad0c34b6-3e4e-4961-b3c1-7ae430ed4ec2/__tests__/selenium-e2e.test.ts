const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');

class SeleniumE2ETestSuite {
  constructor() {
    this.driver = null;
    this.testResults = [];
    this.baseUrl = 'http://localhost:3000';
  }

  async setup() {
    const options = new chrome.Options();
    options.addArguments('--headless');
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.setPerfLoggingPrefs({
      'enableNetwork': true,
      'level': 'ALL'
    });

    this.driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    await this.driver.manage().setTimeouts({ implicit: 10000 });
    console.log('✅ Browser initialized successfully');
  }

  async captureConsoleLogs() {
    try {
      const logs = await this.driver.manage().logs().get('browser');
      const errors = logs.filter(log => log.level === 'SEVERE');
      return errors;
    } catch (error) {
      console.error('Failed to capture console logs:', error);
      return [];
    }
  }

  async checkPageLoadSuccess(url) {
    try {
      await this.driver.get(url);
      await this.driver.wait(until.titleIsNot(''), 10000);
      
      const currentUrl = await this.driver.getCurrentUrl();
      const pageLoaded = currentUrl.includes(url.replace('http://localhost:3000', '')) || 
                         currentUrl.includes(url.replace('https://localhost:3000', ''));
      
      return {
        success: pageLoaded,
        url: currentUrl,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async checkDOMComponent(selector, componentName) {
    try {
      const element = await this.driver.wait(
        until.elementLocated(By.css(selector)),
        5000
      );
      
      if (element) {
        const isVisible = await element.isDisplayed();
        return {
          success: isVisible,
          component: componentName,
          selector: selector,
          timestamp: new Date().toISOString()
        };
      }
      
      return {
        success: false,
        component: componentName,
        selector: selector,
        error: 'Element not found',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        component: componentName,
        selector: selector,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async testHomePage() {
    console.log('🧪 Testing Home Page...');
    
    const result = await this.checkPageLoadSuccess(this.baseUrl);
    if (!result.success) {
      this.testResults.push({
        test: 'Home Page Load',
        success: false,
        details: result
      });
      return;
    }

    const navbar = await this.checkDOMComponent('nav, .navbar, header', 'Navbar');
    const footer = await this.checkDOMComponent('footer, .footer', 'Footer');

    this.testResults.push({
      test: 'Home Page Load',
      success: result.success,
      details: result
    });

    this.testResults.push({
      test: 'Navbar Presence',
      success: navbar.success,
      details: navbar
    });

    this.testResults.push({
      test: 'Footer Presence',
      success: footer.success,
      details: footer
    });
  }

  async testTaskListPage() {
    console.log('🧪 Testing Task List Page...');
    
    const result = await this.checkPageLoadSuccess(`${this.baseUrl}/tasks`);
    if (!result.success) {
      this.testResults.push({
        test: 'Task List Page Load',
        success: false,
        details: result
      });
      return;
    }

    const taskList = await this.checkDOMComponent('[data-testid="task-list"], .task-list, #task-list', 'Task List');
    const taskItems = await this.checkDOMComponent('[data-testid="task-item"], .task-item', 'Task Items');

    this.testResults.push({
      test: 'Task List Page Load',
      success: result.success,
      details: result
    });

    this.testResults.push({
      test: 'Task List Component',
      success: taskList.success,
      details: taskList
    });

    this.testResults.push({
      test: 'Task Items Component',
      success: taskItems.success,
      details: taskItems
    });
  }

  async testTaskForm() {
    console.log('🧪 Testing Task Form...');
    
    const result = await this.checkPageLoadSuccess(`${this.baseUrl}/tasks/new`);
    if (!result.success) {
      this.testResults.push({
        test: 'Task Form Page Load',
        success: false,
        details: result
      });
      return;
    }

    const form = await this.checkDOMComponent('form, [data-testid="task-form"]', 'Task Form');
    const titleInput = await this.checkDOMComponent('input[name="title"], #title', 'Title Input');
    const submitButton = await this.checkDOMComponent('button[type="submit"], [data-testid="submit-button"]', 'Submit Button');

    this.testResults.push({
      test: 'Task Form Page Load',
      success: result.success,
      details: result
    });

    this.testResults.push({
      test: 'Task Form Component',
      success: form.success,
      details: form
    });

    this.testResults.push({
      test: 'Title Input Field',
      success: titleInput.success,
      details: titleInput
    });

    this.testResults.push({
      test: 'Submit Button',
      success: submitButton.success,
      details: submitButton
    });

    try {
      const titleInputElement = await this.driver.findElement(By.css('input[name="title"], #title'));
      await titleInputElement.sendKeys('Test Task from Selenium');
      
      const submitButtonElement = await this.driver.findElement(By.css('button[type="submit"], [data-testid="submit-button"]'));
      await submitButtonElement.click();

      await this.driver.wait(until.urlContains('/tasks'), 10000);
      
      this.testResults.push({
        test: 'Task Form Submission',
        success: true,
        details: { message: 'Form submitted successfully' }
      });
    } catch (error) {
      this.testResults.push({
        test: 'Task Form Submission',
        success: false,
        details: { error: error.message }
      });
    }
  }

  async testNavigation() {
    console.log('🧪 Testing Navigation...');
    
    try {
      const navLinks = await this.driver.findElements(By.css('nav a, .navbar a, header a'));
      
      for (const link of navLinks) {
        const href = await link.getAttribute('href');
        if (href && href.includes('localhost:3000')) {
          await link.click();
          await this.driver.wait(until.urlIs(href), 5000);
          
          this.testResults.push({
            test: 'Navigation Link',
            success: true,
            details: { href: href }
          });
        }
      }
    } catch (error) {
      this.testResults.push({
        test: 'Navigation',
        success: false,
        details: { error: error.message }
      });
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Selenium E2E Test Suite...\n');

    try {
      await this.setup();

      await this.testHomePage();
      await this.testTaskListPage();
      await this.testTaskForm();
      await this.testNavigation();

      const consoleErrors = await this.captureConsoleLogs();
      if (consoleErrors.length > 0) {
        this.testResults.push({
          test: 'Console Errors',
          success: false,
          details: consoleErrors
        });
      }

      await this.generateReport();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      await this.generateReport();
    } finally {
      if (this.driver) {
        await this.driver.quit();
      }
    }
  }

  async generateReport() {
    const failedTests = this.testResults.filter(t => !t.success);
    const report = {
      summary: {
        total: this.testResults.length,
        passed: this.testResults.filter(t => t.success).length,
        failed: failedTests.length,
        timestamp: new Date().toISOString()
      },
      failures: failedTests,
      allResults: this.testResults
    };

    const reportPath = path.join(__dirname, 'selenium-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n📊 Test Report Generated: selenium-test-report.json');
    console.log(`📈 Summary: ${report.summary.passed}/${report.summary.total} tests passed`);
    
    if (failedTests.length > 0) {
      console.log('\n❌ Failed Tests:');
      failedTests.forEach(test => {
        console.log(`  - ${test.test}: ${JSON.stringify(test.details)}`);
      });
    }
  }
}

const suite = new SeleniumE2ETestSuite();
suite.runAllTests().catch(console.error);

module.exports = { SeleniumE2ETestSuite };