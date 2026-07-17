const { lighthouse } = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const URL = `http://localhost:${PORT}`;

const config = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance', 'seo', 'accessibility'],
    skipAudits: ['uses-rel-preconnect', 'uses-rel-preload'],
  },
};

async function runLighthouse() {
  let chrome;
  try {
    chrome = await chromeLauncher.launch({
      chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'],
    });

    const options = {
      port: chrome.port,
      output: 'json',
      logLevel: 'info',
    };

    const runnerResult = await lighthouse(URL, options, config);

    const { performance, seo, accessibility } = runnerResult.lhr.categories;

    const results = {
      performance: Math.round(performance.score * 100),
      seo: Math.round(seo.score * 100),
      accessibility: Math.round(accessibility.score * 100),
    };

    console.log('\n=== Lighthouse Audit Results ===');
    console.log(`Performance: ${results.performance}`);
    console.log(`SEO: ${results.seo}`);
    console.log(`Accessibility: ${results.accessibility}`);

    const failed = [];
    if (results.performance < 90) failed.push(`Performance (${results.performance} < 90)`);
    if (results.seo < 90) failed.push(`SEO (${results.seo} < 90)`);
    if (results.accessibility < 90) failed.push(`Accessibility (${results.accessibility} < 90)`);

    if (failed.length > 0) {
      console.error('\n❌ Failed audits:', failed.join(', '));
      process.exit(1);
    }

    console.log('\n✅ All Lighthouse scores are above 90!');

    const outputDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const reportPath = path.join(outputDir, `lighthouse-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(runnerResult.lhr, null, 2));
    console.log(`\n📄 Report saved to: ${reportPath}`);

    return results;
  } catch (error) {
    console.error('Lighthouse audit failed:', error);
    process.exit(1);
  } finally {
    if (chrome) {
      await chrome.kill();
    }
  }
}

runLighthouse();