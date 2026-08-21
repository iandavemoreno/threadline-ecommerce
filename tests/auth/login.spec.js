const { test, expect } = require('@playwright/test');

test('user can log in successfully', async ({ page }) => {
  const uniqueEmail = `testuser${Date.now()}@example.com`;
  const password = 'Password123!';

  // Log browser console messages
  page.on('console', msg => {
    console.log('BROWSER:', msg.type(), msg.text());
  });

  // Log failed network requests
  page.on('requestfailed', request => {
    console.log(
      'REQUEST FAILED:',
      request.url(),
      request.failure()?.errorText
    );
  });

  // First, sign up a fresh account
  await page.goto('/signup.html');
  await page.fill('#signup-email', uniqueEmail);
  await page.fill('#signup-password', password);
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/login\.html/);

  // Now log in with those same credentials
  await page.fill('#login-email', uniqueEmail);
  await page.fill('#login-password', password);

  const loginResponsePromise = page.waitForResponse(response =>
    response.url().includes('/api/login') &&
    response.request().method() === 'POST'
  );

  await page.click('button[type="submit"]');

  const loginResponse = await loginResponsePromise;

  console.log('LOGIN STATUS:', loginResponse.status());
  console.log('LOGIN RESPONSE:', await loginResponse.text());

  console.log('CURRENT URL:', page.url());

  await expect(page).toHaveURL(/index\.html/);
});