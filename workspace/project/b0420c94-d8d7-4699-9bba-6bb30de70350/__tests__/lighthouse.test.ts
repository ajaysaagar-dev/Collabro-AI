const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const URL = `http://localhost:${PORT}`;

const LH_CONFIG = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance', 'seo', 'accessibility'],
    skipAudits: ['uses-rel-preconnect', 'uses-rel-preload'],
  },
};

async function launchChromeAndRunLighthouse(url, config, port) {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'],
    port: port,
  });

  const options = {
    logLevel: 'info',
    output: 'json',
    onlyCategories: ['performance', 'seo', 'accessibility'],
    port: port,
  };

  try {
    const runnerResult = await lighthouse(url, options, config);
    return runnerResult;
  } finally {
    await chrome.kill();
  }
}

function generateReport(lhr) {
  const reportDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(reportDir, `lighthouse-report-${timestamp}.json`);
  const htmlReportPath = path.join(reportDir, `lighthouse-report-${timestamp}.html`);

  fs.writeFileSync(reportPath, JSON.stringify(lhr, null, 2));

  const htmlReport = lighthouse.generateReport(lhr, LH_CONFIG);
  fs.writeFileSync(htmlReportPath, htmlReport);

  return { jsonReportPath, htmlReportPath };
}

function validateScores(lhr) {
  const categories = lhr.lhr.categories;
  const results = {};

  for (const category of categories) {
    const score = category.score;
    const name = category.id;
    results[name] = score;

    if (score !== null && score < 0.9) {
      console.error(`❌ ${name.toUpperCase()} score is ${Math.round(score * 100)} - Expected >= 90`);
    } else {
      console.log(`✅ ${name.toUpperCase()} score: ${Math.round(score * 100)}`);
    }
  }

  return results;
}

async function runAudit() {
  console.log('🚀 Starting Lighthouse audit...');
  console.log(`🎯 Target URL: ${URL}`);

  const port = 9222;

  try {
    const runnerResult = await launchChromeAndRunLighthouse(URL, LH_CONFIG, port);

    if (!runnerResult) {
      console.error('❌ Lighthouse failed to run');
      process.exit(1);
    }

    const { jsonReportPath, htmlReportPath } = generateReport(runnerResult);

    console.log('\n📊 Audit Results:');
    console.log('==================');

    const scores = validateScores(runnerResult);

    console.log('\n📁 Reports generated:');
    console.log(`   JSON: ${jsonReportPath}`);
    console.log(`   HTML: ${htmlReportPath}`);

    const allPassed = Object.values(scores).every((score) => score === null || score >= 0.9);

    if (allPassed) {
      console.log('\n✅ All Lighthouse scores are above 90!');
      process.exit(0);
    } else {
      console.log('\n❌ Some Lighthouse scores are below 90');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Lighthouse audit failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runAudit();
}

module.exports = { runAudit, launchChromeAndRunLighthouse, validateScores };</arg_value></tool_call>