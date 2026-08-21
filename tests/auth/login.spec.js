const { test, expect } = require('@playwright/test');

test('user can log in successfully', async ({ page }) => {
  const uniqueEmail = `testuser${Date.now()}@example.com`;
  const password = 'Password123!';

  // First, sign up a fresh account
  await page.goto('/signup.html');
  await page.fill('#signup-email', uniqueEmail);
  await page.fill('#signup-password', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/login\.html/);

  // Now log in with those same credentials
  await page.fill('#login-email', uniqueEmail);
  await page.fill('#login-password', password);
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/index\.html/);
});