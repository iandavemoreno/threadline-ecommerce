const { test, expect } = require('@playwright/test');
const { API_BASE_URL, ADMIN_EMAIL } = require('../helpers/config');
const { createUniqueEmail, createTestProduct } = require('../helpers/test-data');
const { signupUser, createProduct, deleteProduct, updateOrderStatus } = require('../helpers/api-helpers');


async function createTestOrder(request, testProduct, email) {
    const response = await request.post(`${API_BASE_URL}/api/orders`, {
        data: {
            email: email,
            customerName: 'Order Cancel API Tester',
            address: '1 Cancel API Lane',
            items: [{ productId: testProduct.id, quantity: 1 }]
        }
    });

    const body = await response.json();
    return body.orderId;
}

test.describe('Order Cancel API', () => {

    let testProduct;

    test.beforeEach(async ({ request }) => {
        testProduct = await createProduct(request, ADMIN_EMAIL, createTestProduct());
    });

    test.afterEach(async ({ request }) => {
        await deleteProduct(request, ADMIN_EMAIL, testProduct.id);
    });

    test('PUT /api/orders/:id/cancel fails without being logged in', async ({ request }) => {

        const email = createUniqueEmail('cancelapi');
        await signupUser(request, email, 'Password123!');
        const orderId = await createTestOrder(request, testProduct, email);

        const response = await request.put(`${API_BASE_URL}/api/orders/${orderId}/cancel`);

        expect(response.status()).toBe(401);
    });

    test('PUT /api/orders/:id/cancel fails for an order that belongs to someone else @smoke', async ({ request }) => {

        const ownerEmail = createUniqueEmail('cancelapiowner');
        await signupUser(request, ownerEmail, 'Password123!');
        const orderId = await createTestOrder(request, testProduct, ownerEmail);

        const otherEmail = createUniqueEmail('cancelapiother');
        await signupUser(request, otherEmail, 'Password123!');

        const response = await request.put(`${API_BASE_URL}/api/orders/${orderId}/cancel`, {
            headers: { 'X-User-Email': otherEmail }
        });

        expect(response.status()).toBe(404);
    });

    test('PUT /api/orders/:id/cancel succeeds for a pending order owned by the caller @smoke', async ({ request }) => {

        const email = createUniqueEmail('cancelapisuccess');
        await signupUser(request, email, 'Password123!');
        const orderId = await createTestOrder(request, testProduct, email);

        const response = await request.put(` ${API_BASE_URL}/api/orders/${orderId}/cancel`, {
            headers: { 'X-User-Email': email }
        });

        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(body.status).toBe('Cancelled');
    });

    test('PUT /api/orders/:id/cancel is rejected for an order that is no longer pending', async({ request }) => {

        const email = createUniqueEmail('cancelapinonpending');
        await signupUser(request, email, 'Password123!');
        const orderId = await createTestOrder(request, testProduct, email);

        await updateOrderStatus(request, ADMIN_EMAIL, orderId, 'Shipped');

        const response = await request.put(`${API_BASE_URL}/api/orders/${orderId}/cancel`, {
            headers: { 'X-User-Email': email }
        });

        expect(response.status()).toBe(400);

        const body = await response.json();
        expect(body.error).toBe('Only pending orders can be cancelled.');
    });

});