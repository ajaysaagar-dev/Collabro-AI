import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test('should not have any critical accessibility violations on homepage', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .exclude('.ignore-axe')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any critical accessibility violations on task list page', async ({ page }) => {
    await page.goto('/tasks');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .exclude('.ignore-axe')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any critical accessibility violations on task detail page', async ({ page }) => {
    await page.goto('/tasks/1');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .exclude('.ignore-axe')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any critical accessibility violations on about page', async ({ page }) => {
    await page.goto('/about');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .exclude('.ignore-axe')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any critical accessibility violations on contact page', async ({ page }) => {
    await page.goto('/contact');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .exclude('.ignore-axe')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any critical accessibility violations on login page', async ({ page }) => {
    await page.goto('/login');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .exclude('.ignore-axe')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any critical accessibility violations on register page', async ({ page }) => {
    await page.goto('/register');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .exclude('.ignore-axe')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any critical accessibility violations on settings page', async ({ page }) => {
    await page.goto('/settings');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .exclude('.ignore-axe')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any critical accessibility violations on profile page', async ({ page }) => {
    await page.goto('/profile');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .exclude('.ignore-axe')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any critical accessibility violations on dashboard page', async ({ page }) => {
    await page.goto('/dashboard');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .exclude('.ignore-axe')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any critical accessibility violations on navigation elements', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('nav')
      .exclude('.ignore-axe')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any critical accessibility violations on forms', async ({ page }) => {
    await page.goto('/register');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('form')
      .exclude('.ignore-axe')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any critical accessibility violations on buttons', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('button')
      .exclude('.ignore-axe')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any critical accessibility violations on links', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('a[href]')
      .exclude('.ignore-axe')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any critical accessibility violations on images', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('img')
      .exclude('.ignore-axe')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any critical accessibility violations on tables', async ({ page }) => {
    await page.goto('/tasks');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('table')
      .exclude('.ignore-axe')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any critical accessibility violations on headings', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('h1, h2, h3, h4, h5, h6')
      .exclude('.ignore-axe')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any critical accessibility violations on color contrast', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('body')
      .exclude('.ignore-axe')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any critical accessibility violations on aria attributes', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('[aria-*]')
      .exclude('.ignore-axe')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any critical accessibility violations on modal dialogs', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('.modal, [role="dialog"]')
      .exclude('.ignore-axe')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any critical accessibility violations on skip links', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('a[href^="#"]')
      .exclude('.ignore-axe')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any critical accessibility violations on input fields', async ({ page }) => {
    await page.goto('/register');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('input')
      .exclude('.ignore-axe')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any critical accessibility violations on select dropdowns', async ({ page }) => {
    await page.goto('/settings');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('select')
      .exclude('.ignore-axe')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any critical accessibility violations on textarea fields', async ({ page }) => {
    await page.goto('/contact');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('textarea')
      .exclude('.ignore-axe')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any critical accessibility violations on list elements', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('ul, ol, li')
      .exclude('.ignore-axe')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any critical accessibility violations on navigation menus', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('.nav, .navigation, nav ul')
      .exclude('.ignore-axe')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any critical accessibility violations on search forms', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('form[role="search"], .search-form')
      .exclude('.ignore-axe')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any critical accessibility violations on breadcrumb navigation', async ({ page }) => {
    await page.goto('/tasks');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('.breadcrumb, [aria-label="breadcrumb"]')
      .exclude('.ignore-axe')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any critical accessibility violations on pagination', async ({ page }) => {
    await page.goto('/tasks');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('.pagination, [aria-label="pagination"]')
      .exclude('.ignore-axe')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any critical accessibility violations on error messages', async ({ page }) => {
    await page.goto('/register');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('.error, .error-message, [role="alert"]')
      .exclude('.ignore-axe')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any critical accessibility violations on loading states', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('.loading, .skeleton, [aria-busy="true"]')
      .exclude('.ignore-axe')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any critical accessibility violations on tooltip elements', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('[data-tooltip], .tooltip')
      .exclude('.ignore-axe')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any critical accessibility violations on tab panels', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('[role="tabpanel"], .tab-panel')
      .exclude('.ignore-axe')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any critical accessibility violations on accordion elements', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('.accordion, [role="region"][aria-expanded]')
      .exclude('.ignore-axe')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any critical accessibility violations on dropdown menus', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('[role="menu"], .dropdown-menu')
      .exclude('.