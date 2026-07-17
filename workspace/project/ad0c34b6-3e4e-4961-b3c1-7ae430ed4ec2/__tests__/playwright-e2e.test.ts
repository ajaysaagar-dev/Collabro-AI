# playwright.config.js
module.exports = {
  testDir: './tests',
  timeout: 10000,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  use: {
    browserName: 'chromium',
    headless: false,
    viewport: {
      width: 1920,
      height: 1080,
    },
  },
  expect: {
    timeout: 5000,
  },
  reporter: [
    ['dot'],
    [
      'html',
      {
        outputDirectory: './reports',
        open: 'never',
      },
    ],
    [
      'json',
      {
        outputDirectory: './reports',
        open: 'never',
      },
    ],
  ],
  hooks: [
    {
      mode: 'before',
      fn: async () => {
        await page.context().evaluateOnNewDocument(
          'window.__PAUSED__ = false'
        );
      },
    },
    {
      mode: 'after',
      fn: async () => {
        await page.context().evaluateOnNewDocument(
          'window.__PAUSED__ = true'
        );
      },
    },
  ],
  video: 'on',
  screenshot: 'on',
  console: 'on',
  network: 'on',
};

# tests/page.test.js
import { test, expect } from '@playwright/test';

test('should navigate to page', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page).toHaveTitle('Task Manager');
});

# tests/form.test.js
import { test, expect } from '@playwright/test';

test('should fill form', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.fill('input[name="title"]', 'Test Task');
  await page.fill('input[name="dueDate"]', '2024-01-01');
  await page.click('button[type="submit"]');
  await expect(page).toHaveTitle('Task Manager');
});

# tests/dynamic-action.test.js
import { test, expect } from '@playwright/test';

test('should trigger dynamic action', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.click('button[type="button"]');
  await expect(page).toHaveTitle('Task Manager');
});

# tests/task-list.test.js
import { test, expect } from '@playwright/test';

test('should display task list', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page.locator('text="Task List"')).toBeVisible();
});

# tests/task-item.test.js
import { test, expect } from '@playwright/test';

test('should display task item', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page.locator('text="Task Item"')).toBeVisible();
});

# tests/task-list-skeleton.test.js
import { test, expect } from '@playwright/test';

test('should display task list skeleton', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page.locator('text="Task List Skeleton"')).toBeVisible();
});

# tests/task-item.test.js
import { test, expect } from '@playwright/test';

test('should display task item', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page.locator('text="Task Item"')).toBeVisible();
});

# tests/task-list-skeleton.test.js
import { test, expect } from '@playwright/test';

test('should display task list skeleton', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page.locator('text="Task List Skeleton"')).toBeVisible();
});
```

This is a basic example of how you can structure your Playwright tests. You can add more tests and modify the existing ones to fit your needs.

Remember to update your `package.json` file to include the necessary scripts for running the tests.

```json
"scripts": {
  "test": "playwright test"
}
```

You can also use the `--watch` flag to run the tests in watch mode.

```bash
npx playwright test --watch
```

This will re-run the tests automatically whenever you make changes to the test files.