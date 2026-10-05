import { test, expect } from '@playwright/test';
import { mockApi, login } from '../spec/_support';

test.use({ serviceWorkers: 'block' });

const PAGES: { path: string; testId: string }[] = [
  { path: '/vendor/profile', testId: 'vendor-profile-screen' },
  { path: '/admin/customers', testId: 'admin-customers-screen' },
  { path: '/channels', testId: 'channels-screen' },
  { path: '/orders', testId: 'orders-screen' },
  { path: '/invoices', testId: 'invoices-screen' },
  { path: '/settings/notifications', testId: 'settings-notifications-screen' },
  { path: '/admin/audit-log', testId: 'admin-audit-log-screen' },
];

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
];

test('shell: sidebar shows Main, Vendor, Customer and Admin groups', async ({ page }) => {
  await mockApi(page);
  await login(page);
  await page.goto('/#/orders');
  const sidebar = page.locator('app-layout app-sidebar');
  await expect(sidebar).toBeAttached();
  for (const group of ['Main', 'Vendor', 'Customer', 'Admin']) {
    await expect(sidebar.locator('.nav-group-label', { hasText: new RegExp(`^${group}$`) })).toHaveCount(1);
  }
  await expect(sidebar.locator('[data-nav-group="Customer"] .nav-label', { hasText: 'Orders' })).toHaveCount(1);
});

for (const p of PAGES) {
  test(`shell: ${p.path} renders inside the shared layout`, async ({ page }) => {
    await mockApi(page);
    await login(page);
    await page.goto(`/#${p.path}`);
    await expect(page.locator(`app-layout .routed-area [data-testid="${p.testId}"]`)).toBeVisible();
    await expect(page.locator('app-layout app-sidebar')).toBeAttached();
  });

  for (const vp of VIEWPORTS) {
    test(`finish: ${p.path} ${vp.name} uses tokens and primitives`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await mockApi(page);
      await login(page);
      await page.goto(`/#${p.path}`);
      const screen = page.getByTestId(p.testId);
      await expect(screen).toBeVisible();
      await expect(screen).toHaveClass(/\bpage\b/);
      const h1Font = await screen.locator('h1').evaluate((el) => getComputedStyle(el).fontFamily);
      expect(h1Font).toContain('Sofia Sans');
      // Page content must not overflow the viewport horizontally (tables scroll inside cards).
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }
}
