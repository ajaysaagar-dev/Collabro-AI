const { lighthouse } = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const URL = `http://localhost:${PORT}`;

const LH_CONFIG = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance', 'seo', 'accessibility'],
    skipAudits: [],
    formFactor: 'desktop',
    screenEmulation: {
      mobile: false,
      width: 1350,
      height: 900,
      deviceScaleFactor: 1,
      disabled: false
    }
  }
};

async function runLighthouseAudit(url, port) {
  let chrome;
  try {
    chrome = await chromeLauncher.launch({
      chromeFlags: [
        '--headless',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-client-side-detection',
        '--disable-features=site-per-process',
        '--disable-har-overrides',
        '--disable-low-res-tiles',
        '--disable-software-rasterizer',
        '--metrics-recording-only',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-backgrounding-occluded-windows'
      ]
    });

    const options = {
      logLevel: 'info',
      output: 'json',
      onlyCategories: ['performance', 'seo', 'accessibility'],
      port: chrome.port,
      chromeFlags: chrome.chromeFlags
    };

    const runnerResult = await lighthouse(url, options, LH_CONFIG);

    if (!runnerResult.lhr) {
      throw new Error('Lighthouse result is empty');
    }

    const scores = {
      performance: runnerResult.lhr.categories.performance.score * 100,
      seo: runnerResult.lhr.categories.seo.score * 100,
      accessibility: runnerResult.lhr.categories.accessibility.score * 100
    };

    return { scores, runnerResult };
  } finally {
    if (chrome) {
      await chrome.kill();
    }
  }
}

async function validateScores(scores) {
  const results = {
    passed: true,
    failures: []
  };

  const thresholds = {
    performance: 90,
    seo: 90,
    accessibility: 90
  };

  for (const [category, score] of Object.entries(scores)) {
    if (score < thresholds[category]) {
      results.passed = false;
      results.failures.push({
        category,
        score,
        threshold: thresholds[category],
        message: `${category} score ${score.toFixed(2)} is below threshold ${thresholds[category]}`
      });
    }
  }

  return results;
}

async function main() {
  console.log('Starting Lighthouse audit...');
  console.log(`Target URL: ${URL}`);

  try {
    const { scores, runnerResult } = await runLighthouseAudit(URL, PORT);

    console.log('\n=== Lighthouse Audit Results ===');
    console.log(`Performance: ${scores.performance.toFixed(2)}`);
    console.log(`SEO: ${scores.seo.toFixed(2)}`);
    console.log(`Accessibility: ${scores.accessibility.toFixed(2)}`);

    const validation = await validateScores(scores);

    if (validation.passed) {
      console.log('\n✓ All scores meet the minimum threshold of 90');
      process.exit(0);
    } else {
      console.error('\n✗ Some scores are below the minimum threshold:');
      validation.failures.forEach(failure => {
        console.error(`  - ${failure.message}`);
      });
      process.exit(1);
    }
  } catch (error) {
    console.error('Lighthouse audit failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runLighthouseAudit, validateScores };</arg_value></tool_call>