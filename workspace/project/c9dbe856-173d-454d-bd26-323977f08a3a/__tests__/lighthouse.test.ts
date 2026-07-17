import { Lighthouse } from 'lighthouse';
import { ChromeLauncher } from 'chrome-launcher';
import { LighthouseConfig } from 'lighthouse/config/config';
import { LighthouseResult } from 'lighthouse/types/types';

const lighthouseConfig: LighthouseConfig = {
  output: 'json',
  outputPath: './lighthouse-report.json',
  chromeFlags: ['--headless', '--disable-gpu'],
  settings: {
    onlyCategories: ['performance', 'seo'],
    categories: ['performance', 'seo'],
  },
};

async function runLighthouseAudit() {
  const chrome = await ChromeLauncher.launch({
    chromeFlags: ['--headless', '--disable-gpu'],
  });
  const lighthouse = new Lighthouse(chrome);
  const result = await lighthouse.run(lighthouseConfig);
  await chrome.kill();
  return result;
}

async function verifyScores(result: LighthouseResult) {
  const performanceScore = result.categories.performance.score;
  const seoScore = result.categories.seo.score;
  if (performanceScore < 90 || seoScore < 90) {
    throw new Error('Performance or SEO score is below 90');
  }
}

async function main() {
  try {
    const result = await runLighthouseAudit();
    await verifyScores(result);
    console.log('Lighthouse audit passed');
  } catch (error) {
    console.error('Lighthouse audit failed:', error);
  }
}

main();