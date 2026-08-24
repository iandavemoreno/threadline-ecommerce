const { test, expect } = require('@playwright/test');
const { API_BASE_URL, ADMIN_EMAIL } = require('../helpers/config');
const { createUniqueEmail, createTestProduct } = require('../helpers/test-data');
const { signupUser, createProduct, deleteProduct } = require('../helpers/api-helpers');

test.describe('Coupons API', () => {

    test('GET /api/coupons/:code returns the discount for an active coupon @smoke', async ({ request }) => {

        const response = await request.get(`${API_BASE_URL}/api/coupons/WELCOME10`);

        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(body.code).toBe('WELCOME10');
        expect(body.discountPercent).toBe(10);
    });


    test('GET /api/coupons/:code is case-insensitive', async ({ request }) => {

        const response = await request.get(`${API_BASE_URL}/api/coupons/welcome10`);

        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(body.code).toBe('WELCOME10');
    });


    test('GET /api/coupons/:code fails for an unknown code', async ({ request }) => {

        const response = await request.get(`${API_BASE_URL}/api/coupons/DOESNOTEXIST`);

        expect(response.status()).toBe(404);

        const body = await response.json();
        expect(body.error).toBe('Invalid or inactive coupon code.');
    });


    test('order with a valid coupon applies the discount and is reflected in order history @smoke', async ({ request }) => {

        const email = createUniqueEmail('couponapi');
        await signupUser(request, email, 'Password123!');

        const testProduct = await createProduct(request, ADMIN_EMAIL, {
            ...createTestProduct(),
            price: 50,
            stock: 10
        });

        const response = await request.post(`${API_BASE_URL}/api/orders`, {
            data: {
                email: email,
                customerName: 'Coupon Tester',
                address: '1 Coupon Lane',
                items: [{ productId: testProduct.id, quantity: 1 }],
                couponCode: 'WELCOME10'
            }
        });

        expect(response.status()).toBe(201);

        const body = await response.json();
        expect(body.discountAmount).toBe(5);
        expect(body.couponCode).toBe('WELCOME10');
        expect(body.total).toBe(45);

        const ordersResponse = await request.get(`${API_BASE_URL}/api/orders`, {
            headers: { 'X-User-Email': email }
        });
        const orders = await ordersResponse.json();

        expect(orders[0].coupon_code).toBe('WELCOME10');
        expect(orders[0].discount_amount).toBe(5);
        expect(orders[0].total).toBe(45);

        await deleteProduct(request, ADMIN_EMAIL, testProduct.id);
    });


    test('order without a coupon code has no discount', async ({ request }) => {

        const email = createUniqueEmail('couponapi');
        await signupUser(request, email, 'Password123!');

        const testProduct = await createProduct(request, ADMIN_EMAIL, createTestProduct());

        const response = await request.post(`${API_BASE_URL}/api/orders`, {
            data: {
                email: email,
                customerName: 'No Coupon Tester',
                address: '1 Coupon Lane',
                items: [{ productId: testProduct.id, quantity: 1 }]
            }
        });

        expect(response.status()).toBe(201);

        const body = await response.json();
        expect(body.discountAmount).toBe(0);
        expect(body.couponCode).toBeNull();
        expect(body.total).toBe(testProduct.price);

        await deleteProduct(request, ADMIN_EMAIL, testProduct.id);
    });


    test('order is rejected for an invalid coupon code, and reserved stock is rolled back @smoke', async ({ request }) => {

        const email = createUniqueEmail('couponapi');
        await signupUser(request, email, 'Password123!');

        const testProduct = await createProduct(request, ADMIN_EMAIL, {
            ...createTestProduct(),
            stock: 5
        });

        const response = await request.post(`${API_BASE_URL}/api/orders`, {
            data: {
                email: email,
                customerName: 'Bad Coupon Tester',
                address: '1 Coupon Lane',
                items: [{ productId: testProduct.id, quantity: 1 }],
                couponCode: 'NOTREAL'
            }
        });

        expect(response.status()).toBe(400);

        const body = await response.json();
        expect(body.error).toBe('That coupon code is invalid or no longer active.');

        // Stock reserved earlier in the same transaction (before the coupon
        // is checked) must roll back when the coupon turns out to be
        // invalid - same atomicity guarantee already proven for an
        // insufficient-stock failure.
        const productsResponse = await request.get(`${API_BASE_URL}/api/products`);
        const products = await productsResponse.json();
        const updated = products.find((p) => p.id === testProduct.id);

        expect(updated.stock).toBe(5);

        await deleteProduct(request, ADMIN_EMAIL, testProduct.id);
    });
});
