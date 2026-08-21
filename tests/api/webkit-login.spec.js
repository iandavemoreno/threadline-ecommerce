const { test, expect } = require('@playwright/test');

test('WebKit can call login API directly', async ({ request }) => {

    const response = await request.post(
        'http://127.0.0.1:3000/api/login',
        {
            data: {
                email: 'admintest@example.com',
                password: 'Admin123!'
            }
        }
    );

    console.log('STATUS:', response.status());
    console.log('BODY:', await response.text());

    expect(response.status()).toBe(200);
});