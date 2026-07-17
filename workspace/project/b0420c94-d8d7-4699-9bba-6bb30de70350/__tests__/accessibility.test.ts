import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test('should not have any accessibility violations on the home page', async ({ page }) => {
    await page.goto('/');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules([
        'region',
        'landmark-one-main',
      ])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  test('should not have any accessibility violations on the about page', async ({ page }) => {
    await page.goto('/about');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules([
        'region',
        'landmark-one-main',
      ])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  test('should not have any accessibility violations on the todo list page', async ({ page }) => {
    await page.goto('/todos');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules([
        'region',
        'landmark-one-main',
      ])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  test('should not have any accessibility violations on the login page', async ({ page }) => {
    await page.goto('/login');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules([
        'region',
        'landmark-one-main',
      ])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  test('should not have any accessibility violations on the register page', async ({ page }) => {
    await page.goto('/register');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules([
        'region',
        'landmark-one-main',
      ])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  test('should not have any accessibility violations on dynamic routes', async ({ page }) => {
    await page.goto('/todos/1');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules([
        'region',
        'landmark-one-main',
      ])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  test('should not have any accessibility violations on API routes', async ({ page }) => {
    await page.goto('/api/todos');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules([
        'region',
        'landmark-one-main',
      ])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  test('should not have any accessibility violations on pages with forms', async ({ page }) => {
    await page.goto('/settings');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules([
        'region',
        'landmark-one-main',
      ])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  test('should not have any accessibility violations on pages with tables', async ({ page }) => {
    await page.goto('/reports');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules([
        'region',
        'landmark-one-main',
      ])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  test('should not have any accessibility violations on pages with modals', async ({ page }) => {
    await page.goto('/dashboard');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules([
        'region',
        'landmark-one-main',
      ])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  test('should not have any accessibility violations on pages with navigation', async ({ page }) => {
    await page.goto('/');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules([
        'region',
        'landmark-one-main',
      ])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  test('should not have any accessibility violations on pages with images', async ({ page }) => {
    await page.goto('/');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules([
        'region',
        'landmark-one-main',
      ])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  test('should not have any accessibility violations on pages with buttons', async ({ page }) => {
    await page.goto('/');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules([
        'region',
        'landmark-one-main',
      ])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  test('should not have any accessibility violations on pages with links', async ({ page }) => {
    await page.goto('/');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules([
        'region',
        'landmark-one-main',
      ])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  test('should not have any accessibility violations on pages with headings', async ({ page }) => {
    await page.goto('/');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules([
        'region',
        'landmark-one-main',
      ])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  test('should not have any accessibility violations on pages with lists', async ({ page }) => {
    await page.goto('/');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules([
        'region',
        'landmark-one-main',
      ])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  test('should not have any accessibility violations on pages with forms', async ({ page }) => {
    await page.goto('/profile');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules([
        'region',
        'landmark-one-main',
      ])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  test('should not have any accessibility violations on pages with iframes', async ({ page }) => {
    await page.goto('/embed');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules([
        'region',
        'landmark-one-main',
      ])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  test('should not have any accessibility violations on pages with audio', async ({ page }) => {
    await page.goto('/media');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules([
        'region',
        'landmark-one-main',
      ])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  test('should not have any accessibility violations on pages with video', async ({ page }) => {
    await page.goto('/video');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules([
        'region',
        'landmark-one-main',
      ])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  test('should not have any accessibility violations on pages with carousels', async ({ page }) => {
    await page.goto('/carousel');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules([
        'region',
        'landmark-one-main',
      ])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  test('should not have any accessibility violations on pages with accordions', async ({ page }) => {
    await page.goto('/faq');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules([
        'region',
        'landmark-one-main',
      ])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  test('should not have any accessibility violations on pages with tabs', async ({ page }) => {
    await page.goto('/tabs');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules([
        'region',
        'landmark-one-main',
      ])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  test('should not have any accessibility violations on pages with tooltips', async ({ page }) => {
    await page.goto('/tooltips');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules([
        'region',
        'landmark-one-main',
      ])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  test('should not have any accessibility violations on pages with dropdowns', async ({ page }) => {
    await page.goto('/select');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules([
        'region',
        'landmark-one-main',
      ])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  test('should not have any accessibility violations on pages with modals', async ({ page }) => {
    await page.goto('/modal');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules([
        'region',
        'landmark-one-main',
      ])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  test('should not have any accessibility violations on pages with tables', async ({ page }) => {
    await page.goto('/data');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules([
        'region',
        'landmark-one-main',
      ])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  test('should not have any accessibility violations on pages with forms', async ({ page }) => {
    await page.goto('/contact');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules([
        'region',
        'landmark-one-main',
      ])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  test('should not have any accessibility violations on pages with navigation', async ({ page }) => {
    await page.goto('/navigation');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules([
        'region',
        'landmark-one-main',
      ])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  test('should not have any accessibility violations on pages with search', async ({ page }) => {
    await page.goto('/search');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules([
        'region',
        'landmark-one-main',
      ])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  test('should not have any accessibility violations on pages with pagination', async ({ page }) => {
    await page.goto('/items');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules([
        'region',
        'landmark-one-main',
      ])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  test('should not have any accessibility violations on pages with breadcrumbs', async ({ page }) => {
    await page.goto('/docs');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules([
        'region',
        'landmark-one-main',
      ])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  test('should not have any accessibility violations on pages with skip links', async ({ page }) => {
    await page.goto('/');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules([
        'region',
        'landmark-one-main',
      ])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  test('should not have any accessibility violations on pages with language selectors', async ({ page }) => {
    await page.goto('/');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules([
        'region',
        'landmark-one-main',
      ])
      .analyze();
    
    expect(results.violations).toEqual([]);
  });

  test('should not have any accessibility violations on pages with dark mode toggle', async ({ page }) => {
    await page.goto('/');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa