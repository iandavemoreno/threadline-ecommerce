const { test, expect } = require('@playwright/test');
const { API_BASE_URL } = require('../helpers/config');
const { createUniqueEmail } = require('../helpers/test-data');
const { signupUser } = require('../helpers/api-helpers');

test.describe('Profile API', () => {

    test('GET /api/profile fails without being logged in', async ({ request }) => {

        const response = await request.get(`${API_BASE_URL}/api/profile`);

        expect(response.status()).toBe(401);

        const body = await response.json();
        expect(body.error).toBe('Not logged in.');
    });


    test('GET /api/profile returns the account info for a logged-in user @smoke', async ({ request }) => {

        const email = createUniqueEmail('profileapi');
        await signupUser(request, email, 'Password123!');

        const response = await request.get(`${API_BASE_URL}/api/profile`, {
            headers: { 'X-User-Email': email }
        });

        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(body.email).toBe(email);
        expect(body.role).toBe('user');
        expect(body.defaultName).toBe('');
        expect(body.defaultAddress).toBe('');
    });


    test('PUT /api/profile saves and persists default shipping info @smoke', async ({ request }) => {

        const email = createUniqueEmail('profileapi');
        await signupUser(request, email, 'Password123!');

        const response = await request.put(`${API_BASE_URL}/api/profile`, {
            headers: { 'X-User-Email': email },
            data: { defaultName: 'Jane Doe', defaultAddress: '1 Test Lane' }
        });

        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(body.defaultName).toBe('Jane Doe');
        expect(body.defaultAddress).toBe('1 Test Lane');

        // Confirm it was actually persisted, not just echoed back
        const getResponse = await request.get(`${API_BASE_URL}/api/profile`, {
            headers: { 'X-User-Email': email }
        });
        const getBody = await getResponse.json();

        expect(getBody.defaultName).toBe('Jane Doe');
        expect(getBody.defaultAddress).toBe('1 Test Lane');
    });


    test('PUT /api/profile/password fails with an incorrect current password', async ({ request }) => {

        const email = createUniqueEmail('profileapi');
        await signupUser(request, email, 'Password123!');

        const response = await request.put(`${API_BASE_URL}/api/profile/password`, {
            headers: { 'X-User-Email': email },
            data: { currentPassword: 'WrongPassword!', newPassword: 'NewPassword123!' }
        });

        expect(response.status()).toBe(401);

        const body = await response.json();
        expect(body.error).toBe('Current password is incorrect.');
    });


    test('PUT /api/profile/password fails for a too-short new password', async ({ request }) => {

        const email = createUniqueEmail('profileapi');
        await signupUser(request, email, 'Password123!');

        const response = await request.put(`${API_BASE_URL}/api/profile/password`, {
            headers: { 'X-User-Email': email },
            data: { currentPassword: 'Password123!', newPassword: '123' }
        });

        expect(response.status()).toBe(400);

        const body = await response.json();
        expect(body.error).toBe('New password must be at least 6 characters.');
    });


    test('PUT /api/profile/password succeeds, and only the new password can log in afterward @smoke', async ({ request }) => {

        const email = createUniqueEmail('profileapi');
        await signupUser(request, email, 'Password123!');

        const response = await request.put(`${API_BASE_URL}/api/profile/password`, {
            headers: { 'X-User-Email': email },
            data: { currentPassword: 'Password123!', newPassword: 'NewPassword456!' }
        });

        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(body.message).toBe('Password updated successfully.');

        const oldPasswordLogin = await request.post(`${API_BASE_URL}/api/login`, {
            data: { email: email, password: 'Password123!' }
        });
        expect(oldPasswordLogin.status()).toBe(401);

        const newPasswordLogin = await request.post(`${API_BASE_URL}/api/login`, {
            data: { email: email, password: 'NewPassword456!' }
        });
        expect(newPasswordLogin.status()).toBe(200);
    });
});
