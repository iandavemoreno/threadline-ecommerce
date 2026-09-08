const { test, expect } = require('@playwright/test');

const { API_BASE_URL, ADMIN_EMAIL } = require('../helpers/config');
const { signupUser, createProduct, deleteProduct } = require('../helpers/api-helpers');
const { createTestProduct } = require('../helpers/test-data');


test.describe('Wishlist API', () => {

    let testProduct;
    let userEmail;
    const password = 'Password123!';

    test.beforeEach(async ({ request }) => {
        testProduct = await createProduct(request, ADMIN_EMAIL, createTestProduct());

        userEmail = `wishlist${Date.now()}@example.com`;
        await signupUser(request, userEmail, password);
    });

    test.afterEach(async ({ request }) => {
        await deleteProduct(request, ADMIN_EMAIL, testProduct.id);
    });


    test('adding a product returns 201 and it shows up in the wishlist', async ({ request }) => {

        const addResponse = await request.post(`${API_BASE_URL}/api/wishlist`, {
            headers: { 'X-User-Email': userEmail },
            data: { productId: testProduct.id }
        });

        expect(addResponse.status()).toBe(201);

        const listResponse = await request.get(`${API_BASE_URL}/api/wishlist`, {
            headers: { 'X-User-Email': userEmail }
        });

        const items = await listResponse.json();

        expect(items).toHaveLength(1);
        expect(items[0].id).toBe(testProduct.id);
        expect(items[0].name).toBe(testProduct.name);
    });


    test('adding the same product twice does not create a duplicate', async ({ request }) => {

        await request.post(`${API_BASE_URL}/api/wishlist`, {
            headers: { 'X-User-Email': userEmail },
            data: { productId: testProduct.id }
        });

        await request.post(`${API_BASE_URL}/api/wishlist`, {
            headers: { 'X-User-Email': userEmail },
            data: { productId: testProduct.id }
        });

        const listResponse = await request.get(`${API_BASE_URL}/api/wishlist`, {
            headers: { 'X-User-Email': userEmail }
        });

        const items = await listResponse.json();

        expect(items).toHaveLength(1);
    });


    test('adding a product that does not exist returns 404', async ({ request }) => {

        const response = await request.post(`${API_BASE_URL}/api/wishlist`, {
            headers: { 'X-User-Email': userEmail },
            data: { productId: 999999 }
        });

        expect(response.status()).toBe(404);
    });


    test('removing a product takes it out of the wishlist', async ({ request }) => {

        await request.post(`${API_BASE_URL}/api/wishlist`, {
            headers: { 'X-User-Email': userEmail },
            data: { productId: testProduct.id }
        });

        const deleteResponse = await request.delete(`${API_BASE_URL}/api/wishlist/${testProduct.id}`, {
            headers: { 'X-User-Email': userEmail }
        });

        expect(deleteResponse.status()).toBe(200);

        const listResponse = await request.get(`${API_BASE_URL}/api/wishlist`, {
            headers: { 'X-User-Email': userEmail }
        });

        const items = await listResponse.json();

        expect(items).toHaveLength(0);
    });


    test('requests without a logged-in user are rejected', async ({ request }) => {

        const response = await request.get(`${API_BASE_URL}/api/wishlist`);

        expect(response.status()).toBe(401);
    });

});