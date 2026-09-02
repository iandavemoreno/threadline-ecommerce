const { test, expect } = require('@playwright/test');
const { API_BASE_URL, ADMIN_EMAIL } = require('../helpers/config');

// A minimal valid 1x1 transparent PNG, embedded directly so these tests
// don't depend on an external fixture file living somewhere on disk.
const TEST_IMAGE_BUFFER = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64'
);

test.describe('Product Image Upload API', () => {

    test('creating a product with an image sets image_url @smoke', async ({ request }) => {

        const response = await request.post(`${API_BASE_URL}/api/admin/products`, {
            headers: { 'X-User-Email': ADMIN_EMAIL },
            multipart: {
                name: `Image Test Product ${Date.now()}${Math.floor(Math.random() * 1000000)}`,
                price: '25',
                stock: '10',
                category: 'T-Shirts',
                description: 'A product created with an image for testing.',
                image: {
                    name: 'test-image.png',
                    mimeType: 'image/png',
                    buffer: TEST_IMAGE_BUFFER
                }
            }
        });

        expect(response.status()).toBe(201);

        const body = await response.json();
        expect(body.image_url).toContain('/uploads/products/');

        // Clean up
        await request.delete(`${API_BASE_URL}/api/admin/products/${body.id}`, {
            headers: { 'X-User-Email': ADMIN_EMAIL }
        });
    });

});