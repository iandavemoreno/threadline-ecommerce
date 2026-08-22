const { test, expect } = require('@playwright/test');
const { API_BASE_URL, ADMIN_EMAIL } = require('../helpers/config');
const { createTestProduct, createUniqueEmail } = require('../helpers/test-data');

test.describe('Admin Products API', () => {

    test('create product succeeds with admin header', async ({ request }) => {
        const product = createTestProduct();

        const response = await request.post(`${API_BASE_URL}/api/admin/products`, {
            headers: { 'X-User-Email': ADMIN_EMAIL },
            data: product
        });

        expect(response.status()).toBe(201);

        const body = await response.json();
        expect(body.name).toBe(product.name);
        expect(body.price).toBe(product.price);

        // Clean up
        await request.delete(`${API_BASE_URL}/api/admin/products/${body.id}`, {
            headers: { 'X-User-Email': ADMIN_EMAIL }
        });
    });

    test('create product fails without name or price', async ({ request }) => {
        const response = await request.post(`${API_BASE_URL}/api/admin/products`, {
            headers: { 'X-User-Email': ADMIN_EMAIL },
            data: { name: '', price: '' }
        });

        expect(response.status()).toBe(400);

        const body = await response.json();
        expect(body.error).toBe('Name and price are required.');
    });

    test('create product fails when name already exists', async ({ request }) => {
        const product = createTestProduct();

        const first = await request.post(`${API_BASE_URL}/api/admin/products`, {
            headers: { 'X-User-Email': ADMIN_EMAIL },
            data: product
        });
        expect(first.status()).toBe(201);
        const firstBody = await first.json();

        const second = await request.post(`${API_BASE_URL}/api/admin/products`, {
            headers: { 'X-User-Email': ADMIN_EMAIL },
            data: product
        });
        expect(second.status()).toBe(409);

        const body = await second.json();
        expect(body.error).toBe('A product with that name already exists.');

        // Clean up
        await request.delete(`${API_BASE_URL}/api/admin/products/${firstBody.id}`, {
            headers: { 'X-User-Email': ADMIN_EMAIL }
        });
    });

    test('create product fails without being logged in', async ({ request }) => {
        const product = createTestProduct();

        const response = await request.post(`${API_BASE_URL}/api/admin/products`, {
            data: product
        });

        expect(response.status()).toBe(401);

        const body = await response.json();
        expect(body.error).toBe('Not logged in.');
    });

    test('create product fails for a non-admin user', async ({ request }) => {
        const email = createUniqueEmail('apinonadmin');

        await request.post(`${API_BASE_URL}/api/signup`, {
            data: { email, password: 'Password123!' }
        });

        const product = createTestProduct();

        const response = await request.post(`${API_BASE_URL}/api/admin/products`, {
            headers: { 'X-User-Email': email },
            data: product
        });

        expect(response.status()).toBe(403);

        const body = await response.json();
        expect(body.error).toBe('Admin access required.');
    });

    test('update product succeeds with admin header', async ({ request }) => {
        const product = createTestProduct();

        const created = await request.post(`${API_BASE_URL}/api/admin/products`, {
            headers: { 'X-User-Email': ADMIN_EMAIL },
            data: product
        });
        const createdBody = await created.json();

        const updatedName = `${product.name} Updated`;

        const response = await request.put(
            `${API_BASE_URL}/api/admin/products/${createdBody.id}`,
            {
                headers: { 'X-User-Email': ADMIN_EMAIL },
                data: { name: updatedName, price: 30.5 }
            }
        );

        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(body.name).toBe(updatedName);
        expect(body.price).toBe(30.5);

        // Clean up
        await request.delete(`${API_BASE_URL}/api/admin/products/${createdBody.id}`, {
            headers: { 'X-User-Email': ADMIN_EMAIL }
        });
    });

    test('update product fails for an id that does not exist', async ({ request }) => {
        const response = await request.put(
            `${API_BASE_URL}/api/admin/products/999999`,
            {
                headers: { 'X-User-Email': ADMIN_EMAIL },
                data: { name: 'Ghost Product', price: 9.99 }
            }
        );

        expect(response.status()).toBe(404);

        const body = await response.json();
        expect(body.error).toBe('Product not found');
    });

    test('delete product succeeds with admin header', async ({ request }) => {
        const product = createTestProduct();

        const created = await request.post(`${API_BASE_URL}/api/admin/products`, {
            headers: { 'X-User-Email': ADMIN_EMAIL },
            data: product
        });
        const createdBody = await created.json();

        const response = await request.delete(
            `${API_BASE_URL}/api/admin/products/${createdBody.id}`,
            { headers: { 'X-User-Email': ADMIN_EMAIL } }
        );

        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(body.message).toBe('Product deleted.');
    });

    test('delete product requires an admin header', async ({ request }) => {
        // Product id 1 is always a seeded default product. It's never actually
        // touched here since requireAdmin rejects the request before the
        // database is queried - using a real id just keeps the test honest
        // about what it's proving.
        const response = await request.delete(
            `${API_BASE_URL}/api/admin/products/1`
        );

        expect(response.status()).toBe(401);

        const body = await response.json();
        expect(body.error).toBe('Not logged in.');
    });

    test('create product defaults to Uncategorized when no category is given', async ({ request }) => {
        const product = createTestProduct();

        const response = await request.post(`${API_BASE_URL}/api/admin/products`, {
            headers: { 'X-User-Email': ADMIN_EMAIL },
            data: product
        });

        expect(response.status()).toBe(201);

        const body = await response.json();
        expect(body.category).toBe('Uncategorized');

        // Clean up
        await request.delete(`${API_BASE_URL}/api/admin/products/${body.id}`, {
            headers: { 'X-User-Email': ADMIN_EMAIL }
        });
    });

    test('create product accepts a custom category', async ({ request }) => {
        const product = createTestProduct();
        product.category = 'Accessories';

        const response = await request.post(`${API_BASE_URL}/api/admin/products`, {
            headers: { 'X-User-Email': ADMIN_EMAIL },
            data: product
        });

        expect(response.status()).toBe(201);

        const body = await response.json();
        expect(body.category).toBe('Accessories');

        // Clean up
        await request.delete(`${API_BASE_URL}/api/admin/products/${body.id}`, {
            headers: { 'X-User-Email': ADMIN_EMAIL }
        });
    });

    test('update product keeps its existing category when not specified', async ({ request }) => {
        const product = createTestProduct();
        product.category = 'Outerwear';

        const created = await request.post(`${API_BASE_URL}/api/admin/products`, {
            headers: { 'X-User-Email': ADMIN_EMAIL },
            data: product
        });
        const createdBody = await created.json();

        const response = await request.put(
            `${API_BASE_URL}/api/admin/products/${createdBody.id}`,
            {
                headers: { 'X-User-Email': ADMIN_EMAIL },
                data: { name: `${product.name} Updated`, price: 30.5 }
            }
        );

        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(body.category).toBe('Outerwear');

        // Clean up
        await request.delete(`${API_BASE_URL}/api/admin/products/${createdBody.id}`, {
            headers: { 'X-User-Email': ADMIN_EMAIL }
        });
    });
});
