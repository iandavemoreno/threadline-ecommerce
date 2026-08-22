const { test, expect } = require('@playwright/test');
const SignupPage = require('../../pages/SignupPage');
const { createUniqueEmail } = require('../helpers/test-data');

test('signup rejects an already-used email', async ({ page }) => {
    const email = createUniqueEmail('dupe');
    const password = 'Password123!';

    const signupPage = new SignupPage(page);

    // First signup should succeed
    await signupPage.goto();
    await signupPage.signup(email, password);
    await expect(page).toHaveURL(/login\.html/);

    // Second signup with the same email should fail
    await signupPage.goto();
    await signupPage.emailInput.fill(email);
    await signupPage.passwordInput.fill(password);

    const signupResponsePromise = page.waitForResponse(response =>
        response.url().includes('/api/signup') &&
        response.request().method() === 'POST'
    );

    await signupPage.signupButton.click();
    await signupResponsePromise;

    // Should stay on signup.html, not redirect
    await expect(page).toHaveURL(/signup\.html/);

    // Error text should appear in the signup form's error element
    await expect(signupPage.formError).not.toBeEmpty();
});
