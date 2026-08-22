const { test, expect } = require('@playwright/test');
const { API_BASE_URL } = require('../helpers/config');

// Note: the successful-login case (200, correct credentials) is already
// covered by webkit-login.spec.js, so it isn't repeated here.

test.describe('Signup API', () => {

    test('signup succeeds with a new email', async ({ request }) => {
        const email = `apitest${Date.now()}@example.com`;

        const response = await request.post(`${API_BASE_URL}/api/signup`, {
            data: { email, password: 'Password123!' }
        });

        expect(response.status()).toBe(201);

        const body = await response.json();
        expect(body.message).toBe('Account created successfully.');
    });

    test('signup fails without email or password', async ({ request }) => {
        const response = await request.post(`${API_BASE_URL}/api/signup`, {
            data: { email: '', password: '' }
        });

        expect(response.status()).toBe(400);

        const body = await response.json();
        expect(body.error).toBe('Email and password are required.');
    });

    test('signup fails when email is already registered', async ({ request }) => {
        const email = `apidupe${Date.now()}@example.com`;
        const password = 'Password123!';

        const first = await request.post(`${API_BASE_URL}/api/signup`, {
            data: { email, password }
        });
        expect(first.status()).toBe(201);

        const second = await request.post(`${API_BASE_URL}/api/signup`, {
            data: { email, password }
        });
        expect(second.status()).toBe(409);

        const body = await second.json();
        expect(body.error).toBe('An account with that email already exists.');
    });
});

test.describe('Login API', () => {

    test('login fails with a wrong password', async ({ request }) => {
        const email = `apilogin${Date.now()}@example.com`;
        const password = 'Password123!';

        await request.post(`${API_BASE_URL}/api/signup`, {
            data: { email, password }
        });

        const response = await request.post(`${API_BASE_URL}/api/login`, {
            data: { email, password: 'WrongPassword!' }
        });

        expect(response.status()).toBe(401);

        const body = await response.json();
        expect(body.error).toBe('Invalid email or password.');
    });

    test('login fails for an email that does not exist', async ({ request }) => {
        const response = await request.post(`${API_BASE_URL}/api/login`, {
            data: {
                email: `doesnotexist${Date.now()}@example.com`,
                password: 'Whatever123!'
            }
        });

        expect(response.status()).toBe(401);

        const body = await response.json();
        expect(body.error).toBe('Invalid email or password.');
    });
});
