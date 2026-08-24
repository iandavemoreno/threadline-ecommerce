const { test, expect } = require('@playwright/test');
const { API_BASE_URL, ADMIN_EMAIL } = require('../helpers/config');
const { createTestProduct } = require('../helpers/test-data');
const { createProduct, deleteProduct } = require('../helpers/api-helpers');

test.describe('Product Detail API', () => {

    test('GET /api/products/:id returns a single product @smoke', async ({ request }) => {

        const testProduct = await createProduct(request, ADMIN_EMAIL, {
            ...createTestProduct(),
            description: 'A soft, breathable cotton tee.'
        });

        const response = await request.get(`${API_BASE_URL}/api/products/${testProduct.id}`);

        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(body.id).toBe(testProduct.id);
        expect(body.name).toBe(testProduct.name);
        expect(body.description).toBe('A soft, breathable cotton tee.');

        await deleteProduct(request, ADMIN_EMAIL, testProduct.id);
    });


    test('GET /api/products/:id returns 404 for an unknown id', async ({ request }) => {

        const response = await request.get(`${API_BASE_URL}/api/products/999999`);

        expect(response.status()).toBe(404);

        const body = await response.json();
        expect(body.error).toBe('Product not found');
    });


    test('create product defaults to an empty description when none is given', async ({ request }) => {

        const testProduct = await createProduct(request, ADMIN_EMAIL, createTestProduct());

        expect(testProduct.description).toBe('');

        await deleteProduct(request, ADMIN_EMAIL, testProduct.id);
    });


    test('update product keeps its existing description when not specified', async ({ request }) => {

        const created = await createProduct(request, ADMIN_EMAIL, {
            ...createTestProduct(),
            description: 'Original description.'
        });

        const response = await request.put(`${API_BASE_URL}/api/admin/products/${created.id}`, {
            headers: { 'X-User-Email': ADMIN_EMAIL },
            data: { name: `${created.name} Updated`, price: 30.5 }
        });

        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(body.description).toBe('Original description.');

        await deleteProduct(request, ADMIN_EMAIL, created.id);
    });


    test('update product can explicitly clear its description', async ({ request }) => {

        const created = await createProduct(request, ADMIN_EMAIL, {
            ...createTestProduct(),
            description: 'Will be cleared.'
        });

        const response = await request.put(`${API_BASE_URL}/api/admin/products/${created.id}`, {
            headers: { 'X-User-Email': ADMIN_EMAIL },
            data: { name: created.name, price: created.price, description: '' }
        });

        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(body.description).toBe('');

        await deleteProduct(request, ADMIN_EMAIL, created.id);
    });
});
