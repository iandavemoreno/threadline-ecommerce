const { test, expect } = require('@playwright/test');

test('login rejects an incorrect password', async ({ page }) => {
  const email = `wrongpass${Date.now()}@example.com`;
  const correctPassword = 'Password123!';
  const wrongPassword = 'NotTheRightPassword!';

  // Sign up a fresh account first
  await page.goto('/signup.html');
  await page.fill('#signup-email', email);
  await page.fill('#signup-password', correctPassword);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/login\.html/);

  // Try logging in with the wrong password
  await page.fill('#login-email', email);
  await page.fill('#login-password', wrongPassword);
  await page.click('button[type="submit"]');

  // Should stay on login.html, not redirect
  await expect(page).toHaveURL(/login\.html/);

  // Wait for and verify the actual error message text
  await expect(page.locator('#login-form-error')).toHaveText('Invalid email or password.');
});