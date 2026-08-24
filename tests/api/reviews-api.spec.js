const { test, expect } = require('@playwright/test');
const { API_BASE_URL, ADMIN_EMAIL } = require('../helpers/config');
const { createTestProduct, createUniqueEmail } = require('../helpers/test-data');
const { createProduct, deleteProduct, signupUser } = require('../helpers/api-helpers');

test.describe('Reviews API', () => {

    let testProduct;

    test.beforeEach(async ({ request }) => {
        testProduct = await createProduct(request, ADMIN_EMAIL, createTestProduct());
    });

    test.afterEach(async ({ request }) => {
        await deleteProduct(request, ADMIN_EMAIL, testProduct.id);
    });


    test('GET reviews for a product with none returns an empty summary @smoke', async ({ request }) => {

        const response = await request.get(`${API_BASE_URL}/api/products/${testProduct.id}/reviews`);

        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(body.reviews).toEqual([]);
        expect(body.reviewCount).toBe(0);
        expect(body.averageRating).toBeNull();
    });


    test('GET reviews for an unknown product returns 404', async ({ request }) => {

        const response = await request.get(`${API_BASE_URL}/api/products/999999/reviews`);

        expect(response.status()).toBe(404);
    });


    test('POST a review without being logged in is rejected', async ({ request }) => {

        const response = await request.post(`${API_BASE_URL}/api/products/${testProduct.id}/reviews`, {
            data: { rating: 5, comment: 'Great shirt' }
        });

        expect(response.status()).toBe(401);
    });


    test('POST a review to an unknown product returns 404', async ({ request }) => {

        const email = createUniqueEmail('reviewer');
        await signupUser(request, email, 'Password123!');

        const response = await request.post(`${API_BASE_URL}/api/products/999999/reviews`, {
            headers: { 'X-User-Email': email },
            data: { rating: 5 }
        });

        expect(response.status()).toBe(404);
    });


    test('a logged-in user can submit a review @smoke', async ({ request }) => {

        const email = createUniqueEmail('reviewer');
        await signupUser(request, email, 'Password123!');

        const response = await request.post(`${API_BASE_URL}/api/products/${testProduct.id}/reviews`, {
            headers: { 'X-User-Email': email },
            data: { rating: 5, comment: 'Great shirt' }
        });

        expect(response.status()).toBe(201);

        const body = await response.json();
        expect(body.reviewerEmail).toBe(email);
        expect(body.rating).toBe(5);
        expect(body.comment).toBe('Great shirt');
        expect(body.updated).toBe(false);
    });


    test('a comment is optional', async ({ request }) => {

        const email = createUniqueEmail('reviewer');
        await signupUser(request, email, 'Password123!');

        const response = await request.post(`${API_BASE_URL}/api/products/${testProduct.id}/reviews`, {
            headers: { 'X-User-Email': email },
            data: { rating: 4 }
        });

        expect(response.status()).toBe(201);

        const body = await response.json();
        expect(body.comment).toBe('');
    });


    for (const badRating of [0, 6, 3.5, 'five']) {
        test(`rating ${JSON.stringify(badRating)} is rejected`, async ({ request }) => {

            const email = createUniqueEmail('reviewer');
            await signupUser(request, email, 'Password123!');

            const response = await request.post(`${API_BASE_URL}/api/products/${testProduct.id}/reviews`, {
                headers: { 'X-User-Email': email },
                data: { rating: badRating }
            });

            expect(response.status()).toBe(400);
        });
    }


    test('submitting a second review from the same user updates the first instead of adding a new one @smoke', async ({ request }) => {

        const email = createUniqueEmail('reviewer');
        await signupUser(request, email, 'Password123!');

        const first = await request.post(`${API_BASE_URL}/api/products/${testProduct.id}/reviews`, {
            headers: { 'X-User-Email': email },
            data: { rating: 5, comment: 'Loved it' }
        });
        expect(first.status()).toBe(201);
        const firstBody = await first.json();

        const second = await request.post(`${API_BASE_URL}/api/products/${testProduct.id}/reviews`, {
            headers: { 'X-User-Email': email },
            data: { rating: 2, comment: 'Actually it fell apart' }
        });
        expect(second.status()).toBe(200);
        const secondBody = await second.json();

        expect(secondBody.updated).toBe(true);
        expect(secondBody.id).toBe(firstBody.id);
        expect(secondBody.rating).toBe(2);
        expect(secondBody.comment).toBe('Actually it fell apart');

        const listResponse = await request.get(`${API_BASE_URL}/api/products/${testProduct.id}/reviews`);
        const listBody = await listResponse.json();

        expect(listBody.reviewCount).toBe(1);
        expect(listBody.averageRating).toBe(2);
    });


    test('average rating is computed across multiple reviewers and rounded to one decimal @smoke', async ({ request }) => {

        const ratings = [5, 4, 4];

        for (const rating of ratings) {
            const email = createUniqueEmail('reviewer');
            await signupUser(request, email, 'Password123!');

            const response = await request.post(`${API_BASE_URL}/api/products/${testProduct.id}/reviews`, {
                headers: { 'X-User-Email': email },
                data: { rating }
            });
            expect(response.status()).toBe(201);
        }

        const listResponse = await request.get(`${API_BASE_URL}/api/products/${testProduct.id}/reviews`);
        const listBody = await listResponse.json();

        expect(listBody.reviewCount).toBe(3);
        expect(listBody.averageRating).toBe(4.3);
    });
});
