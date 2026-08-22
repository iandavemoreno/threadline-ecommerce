const { test, expect } = require('@playwright/test');
const LoginPage = require('../../pages/LoginPage');
const SignupPage = require('../../pages/SignupPage');
const { createUniqueEmail } = require('../helpers/test-data');

test('user can log in successfully', async ({ page }) => {
  const uniqueEmail = createUniqueEmail('testuser');
  const password = 'Password123!';

  const loginPage = new LoginPage(page);
  const signupPage = new SignupPage(page);

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
  await signupPage.goto();
  await signupPage.signup(uniqueEmail, password);

  await expect(page).toHaveURL(/login\.html/);

  // Now log in with those same credentials
  const loginResponsePromise = page.waitForResponse(response =>
    response.url().includes('/api/login') &&
    response.request().method() === 'POST'
  );

  await loginPage.login(uniqueEmail, password);

  const loginResponse = await loginResponsePromise;

  console.log('LOGIN STATUS:', loginResponse.status());
  // Not reading the response body here: in Chromium the app navigates to
  // index.html almost immediately after this response, and the body is
  // sometimes no longer available over CDP by the time we try to read it
  // (navigated-away response). Status is sufficient for this check.

  console.log('CURRENT URL:', page.url());

  await expect(page).toHaveURL(/index\.html/);
});
