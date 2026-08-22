const { test, expect } = require('@playwright/test');
const SignupPage = require('../../pages/SignupPage');
const { createUniqueEmail } = require('../helpers/test-data');

test('user can sign up successfully', async ({ page }) => {
    const signupPage = new SignupPage(page);

    // Use a unique email each run so signup doesn't fail on duplicate
    const uniqueEmail = createUniqueEmail('testuser');

    await signupPage.goto();
    await signupPage.signup(uniqueEmail, 'Password123!');

    await expect(page).toHaveURL(/login\.html/);
});
