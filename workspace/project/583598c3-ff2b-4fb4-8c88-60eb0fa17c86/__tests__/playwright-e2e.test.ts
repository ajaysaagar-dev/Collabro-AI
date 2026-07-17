import { chromium } from 'playwright';
import { captureScreenshot, captureVideo, captureNetworkLogs } from './utils';

const baseUrl = 'http://localhost:3000';

async function runTest(testName: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(baseUrl);

    // Test specific actions
    await page.click('button');
    await page.waitForSelector('h1');
    await page.screenshot({ path: `./screenshots/${testName}.png` });

    // Capture video
    await page.waitForSelector('video');
    await page.click('video');
    await page.waitForTimeout(5000);
    await captureVideo(page, 'video');

    // Capture network logs
    await page.waitForSelector('body');
    await captureNetworkLogs(page);

    await browser.close();
  } catch (error) {
    console.error(`Test ${testName} failed: ${error}`);
    await browser.close();
  }
}

// Example test cases
runTest('Login');
runTest('Create Task');
runTest('View Task');
runTest('Delete Task');

```

**Explanation:**

1. **Import necessary modules:**
   - `chromium` from `playwright` for browser automation.
   - `captureScreenshot`, `captureVideo`, `captureNetworkLogs` from `./utils` for capturing screenshots, videos, and network logs.

2. **Define `baseUrl`:**
   - Set the base URL of your application.

3. **`runTest` function:**
   - Takes a `testName` as input.
   - Launches a Chromium browser instance.
   - Creates a new page.
   - Navigates to the `baseUrl`.
   - Performs specific actions (e.g., clicks, waits for elements).
   - Captures screenshots using `page.screenshot`.
   - Captures video using `page.waitForSelector('video')` and `page.click('video')`.
   - Captures network logs using `page.waitForSelector('body')` and `captureNetworkLogs`.
   - Closes the browser.

4. **Example test cases:**
   - `runTest('Login')`, `runTest('Create Task')`, etc. - Replace these with your actual test cases.

**Important Notes:**

- **`./utils`:** You need to create a `./utils` directory and add the `captureScreenshot`, `captureVideo`, and `captureNetworkLogs` functions.
- **Test Naming:** Use descriptive test names for clarity.
- **Test Cases:** Replace the example test cases with your actual test scenarios.
- **Error Handling:** Implement proper error handling to catch and log any errors during the test execution.
- **Screenshots:** Adjust the `path` parameter in `page.screenshot` to save the screenshots in the desired location.
- **Videos:** Use `page.waitForSelector('video')` to wait for the video element before capturing it.
- **Network Logs:** Use `page.waitForSelector('body')` to wait for the body element before capturing network logs.