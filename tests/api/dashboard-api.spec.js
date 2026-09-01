const { test, expect } = require('@playwright/test');
const LoginPage = require('../../pages/LoginPage');
const { API_BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD } = require('../helpers/config');
const { createUniqueEmail, createTestProduct } = require('../helpers/test-data');
const { signupUser, createProduct, deleteProduct } = require('../helpers/api-helpers');



async function getDashboard(request) {
    const response = await request.get(`${API_BASE_URL}/api/admin/dashboard`, {
        headers: { 'X-User-Email': ADMIN_EMAIL }
    });
    return { status: response.status(), body: await response.json() };
}

async function createTestOrder(request, testProduct, email, quantity) {
    const response = await request.post(`${API_BASE_URL}/api/orders`, {
        data: {
            email: email,
            customerName: 'Dashboard API Tester',
            address: '1 Dashboard Lane',
            items: [{ productId: testProduct.id, quantity: quantity }]
        }
    });
    const body = await response.json();
    return body.orderId;
}


test.describe('Admin Dashboard API', () => {

    test.describe.configure({ mode: 'serial' });

    test('GET /api/admin/dashboard fails without being logged in', async ({ request }) => {
        const response = await request.get(`${API_BASE_URL}/api/admin/dashboard`);
        expect(response.status()).toBe(401);
    });


    test('GET /api/admin/dashboard fails for a non-admin user', async ({ request }) => {
        const email = createUniqueEmail('dashboardnonadmin');
        await signupUser(request, email, 'Password123!');

        const response = await request.get(`${API_BASE_URL}/api/admin/dashboard`, {
            headers: { 'X-User-Email': email }
        });

        expect(response.status()).toBe(403);
    });


    test('total revenue and Pending count match the raw orders data after placing an order @smoke', async ({ request }) => {
        const email = createUniqueEmail('dashboardrevenue');
        await signupUser(request, email, 'Password123!');

        const testProduct = await createProduct(request, ADMIN_EMAIL, createTestProduct());
        await createTestOrder(request, testProduct, email, 1);

        const ordersResponse = await request.get(`${API_BASE_URL}/api/admin/orders`, {
            headers: { 'X-User-Email': ADMIN_EMAIL }
        });
        const orders = await ordersResponse.json();

        const expectedRevenue = orders
            .filter((order) => order.status !== 'Cancelled')
            .reduce((sum, order) => sum + order.total, 0);
        const expectedPending = orders.filter((order) => order.status === 'Pending').length;

        const { body: dashboard } = await getDashboard(request);

        expect(dashboard.totalRevenue).toBeCloseTo(expectedRevenue, 2);
        expect(dashboard.orderCounts.Pending).toBe(expectedPending);

        await deleteProduct(request, ADMIN_EMAIL, testProduct.id);
    });


    test('cancelling an order is reflected correctly in total revenue @smoke', async ({ request }) => {
        const email = createUniqueEmail('dashboardcancel');
        await signupUser(request, email, 'Password123!');

        const testProduct = await createProduct(request, ADMIN_EMAIL, createTestProduct());
        const orderId = await createTestOrder(request, testProduct, email, 1);

        await request.put(`${API_BASE_URL}/api/orders/${orderId}/cancel`, {
            headers: { 'X-User-Email': email }
        });

        const ordersResponse = await request.get(`${API_BASE_URL}/api/admin/orders`, {
            headers: { 'X-User-Email': ADMIN_EMAIL }
        });
        const orders = await ordersResponse.json();

        const expectedRevenue = orders
            .filter((order) => order.status !== 'Cancelled')
            .reduce((sum, order) => sum + order.total, 0);
        const expectedCancelled = orders.filter((order) => order.status === 'Cancelled').length;

        const { body: dashboard } = await getDashboard(request);

        expect(dashboard.totalRevenue).toBeCloseTo(expectedRevenue, 2);
        expect(dashboard.orderCounts.Cancelled).toBe(expectedCancelled);

        await deleteProduct(request, ADMIN_EMAIL, testProduct.id);
    });


        test('a product with a large order quantity appears in the top products list @smoke', async ({ request }) => {
        const email = createUniqueEmail('dashboardtopproduct');
        await signupUser(request, email, 'Password123!');

        const testProduct = await createProduct(request, ADMIN_EMAIL, {
            name: `Dashboard Top Product ${Date.now()}${Math.floor(Math.random() * 1000000)}`,
            price: 10,
            stock: 500
        });

        try {
            await createTestOrder(request, testProduct, email, 500);

            const { body } = await getDashboard(request);

            const found = body.topProducts.find((p) => p.productId === testProduct.id);

            expect(found).toBeTruthy();
            expect(found.totalQuantity).toBe(500);
        } finally {
            await deleteProduct(request, ADMIN_EMAIL, testProduct.id);
        }
    });

});