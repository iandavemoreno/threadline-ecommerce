const { test, expect } = require('@playwright/test');
const LoginPage = require('../../pages/LoginPage');
const SignupPage = require('../../pages/SignupPage');
const { createUniqueEmail } = require('../helpers/test-data');

test('login rejects an incorrect password', async ({ page }) => {
  const email = createUniqueEmail('wrongpass');
  const correctPassword = 'Password123!';
  const wrongPassword = 'NotTheRightPassword!';

  const loginPage = new LoginPage(page);
  const signupPage = new SignupPage(page);

  // Sign up a fresh account first
  await signupPage.goto();
  await signupPage.signup(email, correctPassword);
  await expect(page).toHaveURL(/login\.html/);

  // Try logging in with the wrong password
  await loginPage.login(email, wrongPassword);

  // Should stay on login.html, not redirect
  await expect(page).toHaveURL(/login\.html/);

  // Wait for and verify the actual error message text
  await expect(loginPage.formError).toHaveText('Invalid email or password.');
});
