const { test, expect } = require('@playwright/test');
const { API_BASE_URL, ADMIN_EMAIL } = require('../helpers/config');
const { createUniqueEmail, createTestProduct } = require('../helpers/test-data');
const { signupUser, createProduct, deleteProduct } = require('../helpers/api-helpers');

// Places a real order for a fresh throwaway customer against testProduct,
// so each test has a real order id to manage rather than mocking one.
async function createTestOrder(request, testProduct) {
    const email = createUniqueEmail('adminorderapi');
    await signupUser(request, email, 'Password123!');

    const response = await request.post(`${API_BASE_URL}/api/orders`, {
        data: {
            email: email,
            customerName: 'Admin Orders API Tester',
            address: '1 Admin Orders Lane',
            items: [{ productId: testProduct.id, quantity: 1 }]
        }
    });

    const body = await response.json();
    return { orderId: body.orderId, email };
}

test.describe('Admin Orders API', () => {

    let testProduct;

    test.beforeEach(async ({ request }) => {
        testProduct = await createProduct(request, ADMIN_EMAIL, createTestProduct());
    });

    test.afterEach(async ({ request }) => {
        await deleteProduct(request, ADMIN_EMAIL, testProduct.id);
    });


    test('GET /api/admin/orders fails without being logged in', async ({ request }) => {

        const response = await request.get(`${API_BASE_URL}/api/admin/orders`);

        expect(response.status()).toBe(401);
    });


    test('GET /api/admin/orders fails for a non-admin user', async ({ request }) => {

        const email = createUniqueEmail('adminordersnonadmin');
        await signupUser(request, email, 'Password123!');

        const response = await request.get(`${API_BASE_URL}/api/admin/orders`, {
            headers: { 'X-User-Email': email }
        });

        expect(response.status()).toBe(403);
    });


    test('GET /api/admin/orders lists every order, defaulting new ones to Pending @smoke', async ({ request }) => {

        const { orderId } = await createTestOrder(request, testProduct);

        const response = await request.get(`${API_BASE_URL}/api/admin/orders`, {
            headers: { 'X-User-Email': ADMIN_EMAIL }
        });

        expect(response.status()).toBe(200);

        const orders = await response.json();
        const created = orders.find((order) => order.id === orderId);

        expect(created).toBeTruthy();
        expect(created.status).toBe('Pending');
        expect(created.items[0].product_id).toBe(testProduct.id);
    });


    test('PUT /api/admin/orders/:id/status fails without being logged in', async ({ request }) => {

        const { orderId } = await createTestOrder(request, testProduct);

        const response = await request.put(`${API_BASE_URL}/api/admin/orders/${orderId}/status`, {
            data: { status: 'Shipped' }
        });

        expect(response.status()).toBe(401);
    });


    test('PUT /api/admin/orders/:id/status fails for a non-admin user', async ({ request }) => {

        const { orderId, email } = await createTestOrder(request, testProduct);

        const response = await request.put(`${API_BASE_URL}/api/admin/orders/${orderId}/status`, {
            headers: { 'X-User-Email': email },
            data: { status: 'Shipped' }
        });

        expect(response.status()).toBe(403);
    });


    test('PUT /api/admin/orders/:id/status rejects a status outside the allowed list', async ({ request }) => {

        const { orderId } = await createTestOrder(request, testProduct);

        const response = await request.put(`${API_BASE_URL}/api/admin/orders/${orderId}/status`, {
            headers: { 'X-User-Email': ADMIN_EMAIL },
            data: { status: 'Refunded' }
        });

        expect(response.status()).toBe(400);
    });


    test('PUT /api/admin/orders/:id/status returns 404 for an unknown order', async ({ request }) => {

        const response = await request.put(`${API_BASE_URL}/api/admin/orders/999999/status`, {
            headers: { 'X-User-Email': ADMIN_EMAIL },
            data: { status: 'Shipped' }
        });

        expect(response.status()).toBe(404);
    });


    test('PUT /api/admin/orders/:id/status updates the order, visible both to admin and the customer @smoke', async ({ request }) => {

        const { orderId, email } = await createTestOrder(request, testProduct);

        const updateResponse = await request.put(`${API_BASE_URL}/api/admin/orders/${orderId}/status`, {
            headers: { 'X-User-Email': ADMIN_EMAIL },
            data: { status: 'Shipped' }
        });

        expect(updateResponse.status()).toBe(200);

        const updateBody = await updateResponse.json();
        expect(updateBody.status).toBe('Shipped');

        // Confirm it actually changed server-side, not just in the response
        const listResponse = await request.get(`${API_BASE_URL}/api/admin/orders`, {
            headers: { 'X-User-Email': ADMIN_EMAIL }
        });
        const orders = await listResponse.json();
        const updated = orders.find((order) => order.id === orderId);
        expect(updated.status).toBe('Shipped');

        // Confirm the customer sees the new status too, via GET /api/orders
        const customerResponse = await request.get(`${API_BASE_URL}/api/orders`, {
            headers: { 'X-User-Email': email }
        });
        const customerOrders = await customerResponse.json();
        const customerOrder = customerOrders.find((order) => order.id === orderId);
        expect(customerOrder.status).toBe('Shipped');
    });

});
