const { test, expect } = require('@playwright/test');
const { API_BASE_URL } = require('../helpers/config');
const { createUniqueEmail } = require('../helpers/test-data');
const { signupUser } = require('../helpers/api-helpers');
const { getResetToken } = require('../helpers/db-helpers');

test.describe('Password Reset API', () => {

    test('POST /api/forgot-password returns the generic message for an existing email and creates a reset token', async ({ request }) => {

        const email = createUniqueEmail('forgotexisting');
        await signupUser(request, email, 'Password123!');

        const response = await request.post(`${API_BASE_URL}/api/forgot-password`, {
            data: { email }
        });

        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(body.message).toBe('If that email exists, a password reset link has been sent.');

        const token = getResetToken(email);
        expect(token).not.toBeNull();
    });

    test('POST /api/forgot-password returns the exact same generic message for a non-existent email @smoke',async ({ request }) => {

        const nonExistentEmail = createUniqueEmail('doesnotexist');

        const response = await request.post(`${API_BASE_URL}/api/forgot-password`, {
            data: { email: nonExistentEmail }
        });

        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(body.message).toBe('If that email exists, a password reset link has been sent.');
    });

    test('POST /api/reset-password succeeds with a valid token and the new password can be used to login @smoke', async ({ request }) => {

        const email = createUniqueEmail('resetsuccess');
        const oldPassword = 'Password123!';
        const newPassword = 'NewPassword456!';

        await signupUser(request, email, oldPassword);

        await request.post(`${API_BASE_URL}/api/forgot-password`, {
            data: { email }
        });

        const token = getResetToken(email);

        const resetResponse = await request.post(`${API_BASE_URL}/api/reset-password`, {
            data: { token, newPassword }
        });
        
        expect(resetResponse.status()).toBe(200);

        const loginResponse = await request.post(`${API_BASE_URL}/api/login`, {
            data: { email, password: newPassword }
        });

        expect(loginResponse.status()).toBe(200);
    });

    test('POST /api/reset-password fails with an invalid token', async ({ request }) => {

        const response = await request.post(`${API_BASE_URL}/api/reset-password`, {
            data: { token: 'not-a-real-token', newPassword: 'Password123!' }
        });

        expect(response.status()).toBe(400);

        const body = await response.json();
        expect(body.error).toBe('Invalid or expired reset link.');
    });

    test('POST /api/reset-password fails when the same token is used twice', async ({ request }) => {

        const email = createUniqueEmail('resetreuse');
        await signupUser(request,email, 'Password123!');

        await request.post(`${API_BASE_URL}/api/forgot-password`, {
            data: { email }
        });

        const token = getResetToken(email);

        const firstResponse = await request.post(`${API_BASE_URL}/api/reset-password`, {
            data: { token, newPassword: 'FirstNewPassword1!' }
        });

        expect(firstResponse.status()).toBe(200);

        const secondResponse = await request.post(`${API_BASE_URL}/api/reset-password`, {
            data: { token, newPassword: 'SecondNewPassword2!' }
        });

        expect(secondResponse.status()).toBe(400);
    });
});