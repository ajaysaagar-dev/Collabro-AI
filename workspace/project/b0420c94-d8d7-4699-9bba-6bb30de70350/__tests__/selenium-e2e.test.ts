import { Builder, By, until } from 'selenium-webdriver';
import { chrome } from 'selenium-webdriver/chrome';
import { firefox } from 'selenium-webdriver/firefox';
import { edge } from 'selenium-webdriver/edge';
import * as fs from 'fs';
import * as path from 'path';

const browser = process.env.BROWSER || 'chrome';

let driver;

async function initBrowser() {
  if (browser === 'chrome') {
    const options = new chrome.Options();
    options.addArguments('--headless');
    options.addArguments('--disable-gpu');
    driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  } else if (browser === 'firefox') {
    const options = new firefox.Options();
    options.addArguments('--headless');
    driver = await new Builder().forBrowser('firefox').setFirefoxOptions(options).build();
  } else if (browser === 'edge') {
    const options = new edge.Options();
    options.addArguments('--headless');
    driver = await new Builder().forBrowser('edge').setEdgeOptions(options).build();
  }
}

async function startBrowser() {
  await initBrowser();
  await driver.get('http://localhost:3000');
  await driver.manage().window().maximize();
  await driver.wait(until.titleIs('COLLABRO AI Universal Software Project'), 10000);
}

async function captureConsoleLogs() {
  const consoleLogs = await driver.manage().logs().get('browser');
  console.log('Console Logs:');
  consoleLogs.forEach(log => {
    console.log(log.getMessage());
  });
}

async function verifyPageLoad() {
  const pageLoad = await driver.wait(until.titleIs('COLLABRO AI Universal Software Project'), 10000);
  console.log('Page Load Successful');
}

async function verifyNavbarPresence() {
  const navbar = await driver.findElement(By.css('nav'));
  console.log('Navbar Present');
}

async function verifyFooterPresence() {
  const footer = await driver.findElement(By.css('footer'));
  console.log('Footer Present');
}

async function verifyFormsPresence() {
  const forms = await driver.findElements(By.css('form'));
  console.log('Forms Present');
}

async function verifyTodoListPresence() {
  const todoList = await driver.findElement(By.css('todo-list'));
  console.log('Todo List Present');
}

async function visitRoutes() {
  await driver.get('http://localhost:3000');
  await driver.get('http://localhost:3000/about');
  await driver.get('http://localhost:3000/contact');
}

async function fillAndSubmitForm() {
  const form = await driver.findElement(By.css('form'));
  const input = await form.findElement(By.css('input'));
  await input.sendKeys('Test Form');
  await form.findElement(By.css('button')).click();
}

async function generateFailureReport(failure) {
  const failureReport = {
    failure: failure,
    browser: browser,
    version: await driver.capabilities.get('browserVersion'),
    os: await driver.capabilities.get('os'),
    osVersion: await driver.capabilities.get('osVersion')
  };
  return JSON.stringify(failureReport, null, 2);
}

async function runTests() {
  try {
    await startBrowser();
    await captureConsoleLogs();
    await verifyPageLoad();
    await verifyNavbarPresence();
    await verifyFooterPresence();
    await verifyFormsPresence();
    await visitRoutes();
    await fillAndSubmitForm();
    console.log('All Tests Passed');
  } catch (error) {
    const failureReport = await generateFailureReport(error);
    console.log('Failure Report:');
    console.log(failureReport);
  } finally {
    await driver.quit();
  }
}

runTests();