const { test, expect } = require('@playwright/test');
const { API_BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD } = require('../helpers/config');

test('WebKit can call login API directly @smoke', async ({ request }) => {

    const response = await request.post(
        `${API_BASE_URL}/api/login`,
        {
            data: {
                email: ADMIN_EMAIL,
                password: ADMIN_PASSWORD
            }
        }
    );

    console.log('STATUS:', response.status());
    console.log('BODY:', await response.text());

    expect(response.status()).toBe(200);
});