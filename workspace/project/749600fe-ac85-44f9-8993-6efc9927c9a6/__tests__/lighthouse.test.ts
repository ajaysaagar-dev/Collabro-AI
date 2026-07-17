const { lighthouse } = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

async function runLighthouseAudit(url, port) {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu']
  });

  const options = {
    logLevel: 'info',
    output: 'json',
    onlyCategories: ['performance', 'seo', 'accessibility'],
    port: chrome.port,
    host: 'localhost',
    throttlingMethod: 'devtools'
  };

  try {
    const runnerResult = await lighthouse(`http://localhost:${port}${url}`, options);

    const scores = {
      performance: runnerResult.lhr.categories.performance.score * 100,
      seo: runnerResult.lhr.categories.seo.score * 100,
      accessibility: runnerResult.lhr.categories.accessibility.score * 100
    };

    console.log('\n=== Lighthouse Audit Results ===');
    console.log(`Performance: ${scores.performance.toFixed(2)}%`);
    console.log(`SEO: ${scores.seo.toFixed(2)}%`);
    console.log(`Accessibility: ${scores.accessibility.toFixed(2)}%`);

    const failed = [];
    if (scores.performance < 90) failed.push(`Performance score ${scores.performance.toFixed(2)}% is below 90%`);
    if (scores.seo < 90) failed.push(`SEO score ${scores.seo.toFixed(2)}% is below 90%`);
    if (scores.accessibility < 90) failed.push(`Accessibility score ${scores.accessibility.toFixed(2)}% is below 90%`);

    if (failed.length > 0) {
      console.error('\n❌ Audit failed:');
      failed.forEach(msg => console.error(`  - ${msg}`));
      process.exit(1);
    }

    console.log('\n✅ All Lighthouse scores are above 90%');
    return scores;
  } finally {
    await chrome.kill();
  }
}

const args = process.argv.slice(2);
const url = args[0] || '/';
const port = parseInt(args[1]) || 3000;

runLighthouseAudit(url, port).catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});