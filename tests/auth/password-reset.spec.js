const { test, expect } = require('@playwright/test');
const { signupUser } = require('../helpers/api-helpers');
const { createUniqueEmail } = require('../helpers/test-data');
const { getResetToken } = require('../helpers/db-helpers');
const ForgotPasswordPage = require('../../pages/ForgotPasswordPage');
const ResetPasswordPage = require('../../pages/ResetPasswordPage');
const LoginPage = require('../../pages/LoginPage');


test('user can reset their password via the forgot password flow and log in with the new password @smoke', async ({ page, request }) => {

    const email = createUniqueEmail('resetuiflow');
    const oldPassword = 'Password123!';
    const newPassword = 'NewPassword456!';

    await signupUser(request, email, oldPassword);

    const forgotPasswordPage = new ForgotPasswordPage(page);
    await forgotPasswordPage.goto();
    await forgotPasswordPage.submit(email);

    await expect(page.locator('#forgot-password-message')).toHaveText(
        'If that email exists, a password reset link has been sent.'
    );

    const token = getResetToken(email);
    expect(token).not.toBeNull();

    const resetPasswordPage = new ResetPasswordPage(page);
    await resetPasswordPage.goto(token);
    await resetPasswordPage.resetPassword(newPassword, newPassword);

    await expect(page).toHaveURL(/login\.html/, { timeout: 6000 });

    const loginPage = new LoginPage(page);
    await loginPage.login(email, newPassword);

    await expect(page).toHaveURL(/index\.html/);
});