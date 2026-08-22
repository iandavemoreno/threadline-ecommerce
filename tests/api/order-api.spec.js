const { test, expect } = require('@playwright/test');
const { API_BASE_URL, ADMIN_EMAIL } = require('../helpers/config');
const { createUniqueEmail, createTestProduct } = require('../helpers/test-data');
const { signupUser, createProduct, deleteProduct } = require('../helpers/api-helpers');

test.describe('Orders API', () => {
    test('user can create an order @smoke', async ({ request }) => {

        // A throwaway account and product, not the shared admin account or
        // a seeded product - reusing those meant this test permanently
        // depleted a seeded product's stock and cluttered the admin
        // account's order history a little more every time the suite ran.
        const email = createUniqueEmail('orderapi');
        await signupUser(request, email, 'Password123!');

        const testProduct = await createProduct(request, ADMIN_EMAIL, createTestProduct());

        const response = await request.post(
            `${API_BASE_URL}/api/orders`,
            {
                data: {
                    email: email,
                    customerName: 'Automation Test User',
                    address: '123 Automation Street',
                    items: [
                        {
                            productId: testProduct.id,
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
            .toBe(testProduct.price * 2);

        // Clean up
        await deleteProduct(request, ADMIN_EMAIL, testProduct.id);
    });

    test('order cannot be created without customer information', async ({ request }) => {

        const response = await request.post(
            `${API_BASE_URL}/api/orders`,
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
            `${API_BASE_URL}/api/orders`,
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
            `${API_BASE_URL}/api/orders`,
            {
                data: {
                    email: ADMIN_EMAIL,
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
            `${API_BASE_URL}/api/orders`,
            {
                data: {
                    email: ADMIN_EMAIL,
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

    test('order succeeds when quantity exactly matches remaining stock', async ({ request }) => {

        const email = createUniqueEmail('orderapistock');
        await signupUser(request, email, 'Password123!');

        const testProduct = await createProduct(request, ADMIN_EMAIL, {
            name: `Stock Boundary Shirt ${Date.now()}${Math.floor(Math.random() * 1000000)}`,
            price: 15,
            stock: 3
        });

        const response = await request.post(`${API_BASE_URL}/api/orders`, {
            data: {
                email: email,
                customerName: 'Stock Tester',
                address: '1 Stock Lane',
                items: [{ productId: testProduct.id, quantity: 3 }]
            }
        });

        expect(response.status()).toBe(201);

        const productsResponse = await request.get(`${API_BASE_URL}/api/products`);
        const products = await productsResponse.json();
        const updated = products.find((p) => p.id === testProduct.id);

        expect(updated.stock).toBe(0);

        await deleteProduct(request, ADMIN_EMAIL, testProduct.id);
    });

    test('order is rejected when quantity exceeds available stock', async ({ request }) => {

        const email = createUniqueEmail('orderapistock');
        await signupUser(request, email, 'Password123!');

        const testProduct = await createProduct(request, ADMIN_EMAIL, {
            name: `Stock Boundary Shirt ${Date.now()}${Math.floor(Math.random() * 1000000)}`,
            price: 15,
            stock: 2
        });

        const response = await request.post(`${API_BASE_URL}/api/orders`, {
            data: {
                email: email,
                customerName: 'Stock Tester',
                address: '1 Stock Lane',
                items: [{ productId: testProduct.id, quantity: 3 }]
            }
        });

        expect(response.status()).toBe(409);

        const body = await response.json();
        expect(body.error).toBe(`Only 2 left in stock for ${testProduct.name}.`);

        // Stock should be untouched by the failed attempt
        const productsResponse = await request.get(`${API_BASE_URL}/api/products`);
        const products = await productsResponse.json();
        const updated = products.find((p) => p.id === testProduct.id);

        expect(updated.stock).toBe(2);

        await deleteProduct(request, ADMIN_EMAIL, testProduct.id);
    });

    test('order is rejected for a product with zero stock', async ({ request }) => {

        const email = createUniqueEmail('orderapistock');
        await signupUser(request, email, 'Password123!');

        const testProduct = await createProduct(request, ADMIN_EMAIL, {
            name: `Out Of Stock Shirt ${Date.now()}${Math.floor(Math.random() * 1000000)}`,
            price: 15,
            stock: 0
        });

        const response = await request.post(`${API_BASE_URL}/api/orders`, {
            data: {
                email: email,
                customerName: 'Stock Tester',
                address: '1 Stock Lane',
                items: [{ productId: testProduct.id, quantity: 1 }]
            }
        });

        expect(response.status()).toBe(409);

        const body = await response.json();
        expect(body.error).toBe(`Only 0 left in stock for ${testProduct.name}.`);

        await deleteProduct(request, ADMIN_EMAIL, testProduct.id);
    });

    test('a failed item rolls back stock already reserved earlier in the same order', async ({ request }) => {

        const email = createUniqueEmail('orderapistock');
        await signupUser(request, email, 'Password123!');

        // productA has plenty of stock, productB doesn't have enough for
        // the requested quantity - the whole order should fail atomically,
        // and productA's stock (reserved earlier in the same loop, before
        // productB's shortfall is discovered) must roll back untouched.
        const productA = await createProduct(request, ADMIN_EMAIL, {
            name: `Rollback Shirt A ${Date.now()}${Math.floor(Math.random() * 1000000)}`,
            price: 10,
            stock: 5
        });

        const productB = await createProduct(request, ADMIN_EMAIL, {
            name: `Rollback Shirt B ${Date.now()}${Math.floor(Math.random() * 1000000)}`,
            price: 10,
            stock: 1
        });

        const response = await request.post(`${API_BASE_URL}/api/orders`, {
            data: {
                email: email,
                customerName: 'Stock Tester',
                address: '1 Stock Lane',
                items: [
                    { productId: productA.id, quantity: 2 },
                    { productId: productB.id, quantity: 2 }
                ]
            }
        });

        expect(response.status()).toBe(409);

        const productsResponse = await request.get(`${API_BASE_URL}/api/products`);
        const products = await productsResponse.json();
        const updatedA = products.find((p) => p.id === productA.id);

        expect(updatedA.stock).toBe(5);

        await deleteProduct(request, ADMIN_EMAIL, productA.id);
        await deleteProduct(request, ADMIN_EMAIL, productB.id);
    });
});