const { test, expect } = require('@playwright/test');

test.describe('Orders API', () => {
    test('user can create an order', async ({ request }) => {

        const response = await request.post(
            'http://localhost:3000/api/orders',
            {
                data: {
                    email: 'admintest@example.com',
                    customerName: 'Automation Test User',
                    address: '123 Automation Street',
                    items: [
                        {
                            productId: 1,
                            quantity: 2
                        }
                    ]
                }
            }
        );

        expect(response.status()).toBe(201);

        const body = await response.json();

        expect(body.message)
            .toBe('Order placed successfully.');

        expect(body.orderId)
            .toBeTruthy();

        expect(body.total)
            .toBe(40);
    });

    test('order cannot be created without customer information', async ({ request }) => {

        const response = await request.post(
            'http://localhost:3000/api/orders',
            {
                data: {
                    email: '',
                    customerName: '',
                    address: '',
                    items: []
                }
            }
        );

        expect(response.status()).toBe(400);

        const body = await response.json();

        expect(body.error)
            .toBe('Customer information and order items are required.');
    });

    test('order cannot be created for an unknown user', async ({ request }) => {
        const response = await request.post(
            'http://localhost:3000/api/orders',
            {
                data: {
                    email: 'doesnotexist@example.com',
                    customerName: 'Unknown User',
                    address: '123 Test Street',
                    items: [
                        {
                            productId: 1,
                            quantity: 1
                        }
                    ]
                }
            }
        );

        expect(response.status()).toBe(404);

        const body = await response.json();

        expect(body.error)
            .toBe('User not found.');
    });

    test('order cannot be created with an invalid product', async ({ request }) => {

        const response = await request.post(
            'http://localhost:3000/api/orders',
            {
                data: {
                    email: 'admintest@example.com',
                    customerName: 'Automation Test User',
                    address: '123 Automation Street',
                    items: [
                        {
                            productId: 999999,
                            quantity: 1
                        }
                    ]
                }
            }
        );

        expect(response.status()).toBe(404);

        const body = await response.json();

        expect(body.error)
            .toContain('Product with ID 999999 not found.');
    });

    test('order cannot be created with an empty item list', async ({ request }) => {
        
        const response = await request.post(
            'http://localhost:3000/api/orders',
            {
                data: {
                    email: 'admintest@example.com',
                    customerName: 'Automation Test User',
                    address: '123 Automation Street',
                    items: []
                }
            }
        );

        expect(response.status()).toBe(400);

        const body = await response.json();

        expect(body.error)
            .toBe('Customer information and order items are required.');
    });
});