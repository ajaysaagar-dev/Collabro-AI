import { chromium } from 'puppeteer';
import { CDPSession } from 'puppeteer-core';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const cdpSession = await page.target().createCDPSession();

  // Navigate to the page
  await page.goto('http://localhost:3000');

  // Get the page's DOM tree
  const domTree = await cdpSession.send('DOM.getTree');
  console.log(domTree);

  // Get the page's console logs
  const consoleLogs = await cdpSession.send('Runtime.consoleAPICalled');
  console.log(consoleLogs);

  // Get the page's network requests
  const networkRequests = await cdpSession.send('Network.getRequests');
  console.log(networkRequests);

  // Get the page's cookies
  const cookies = await cdpSession.send('Network.getCookies');
  console.log(cookies);

  // Get the page's storage
  const storage = await cdpSession.send('Storage.getDOMStorageItems');
  console.log(storage);

  // Get the page's performance metrics
  const performanceMetrics = await cdpSession.send('Performance.getMetrics');
  console.log(performanceMetrics);

  // Close the browser
  await browser.close();
})();