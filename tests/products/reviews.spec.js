const { test, expect } = require('@playwright/test');

const LoginPage = require('../../pages/LoginPage');
const ProductDetailPage = require('../../pages/ProductDetailPage');

const { ADMIN_EMAIL } = require('../helpers/config');
const { createTestProduct, createUniqueEmail } = require('../helpers/test-data');
const { createProduct, deleteProduct, signupUser } = require('../helpers/api-helpers');


test.describe('Product Reviews', () => {

    let testProduct;

    test.beforeEach(async ({ request }) => {
        testProduct = await createProduct(request, ADMIN_EMAIL, createTestProduct());
    });

    test.afterEach(async ({ request }) => {
        await deleteProduct(request, ADMIN_EMAIL, testProduct.id);
    });


    test('a logged-out visitor sees an access message instead of the review form', async ({ page }) => {

        const detailPage = new ProductDetailPage(page);
        await detailPage.goto(testProduct.id);

        await expect(detailPage.reviewAccessMessage)
            .toHaveText('You must be logged in to leave a review.');

        await expect(detailPage.reviewForm).toBeHidden();
    });


    test('a product with no reviews yet shows "No reviews yet."', async ({ page }) => {

        const detailPage = new ProductDetailPage(page);
        await detailPage.goto(testProduct.id);

        await expect(detailPage.reviewsSummary).toHaveText('No reviews yet.');
    });


    test('a logged-in user can submit a review and see it appear with a confirmation popup @smoke', async ({ page, request }) => {

        const email = createUniqueEmail('reviewui');
        await signupUser(request, email, 'Password123!');

        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.login(email, 'Password123!');
        await expect(page).toHaveURL(/index\.html/);

        const detailPage = new ProductDetailPage(page);
        await detailPage.goto(testProduct.id);

        await expect(detailPage.reviewForm).toBeVisible();

        await detailPage.submitReview(5, 'Fits great and washes well.');

        await expect(detailPage.toast).toHaveText('Thanks for your review!');

        await expect(detailPage.reviewsSummary).toHaveText('5 out of 5 (1 review)');
        await expect(detailPage.reviews).toHaveCount(1);
        await expect(detailPage.reviews.first()).toContainText('5 / 5');
        await expect(detailPage.reviews.first()).toContainText(email);
        await expect(detailPage.reviews.first()).toContainText('Fits great and washes well.');
    });


    test('submitting again updates the existing review instead of adding a second one', async ({ page, request }) => {

        const email = createUniqueEmail('reviewui');
        await signupUser(request, email, 'Password123!');

        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.login(email, 'Password123!');
        await expect(page).toHaveURL(/index\.html/);

        const detailPage = new ProductDetailPage(page);
        await detailPage.goto(testProduct.id);

        await detailPage.submitReview(5, 'Loved it');
        await expect(detailPage.toast).toHaveText('Thanks for your review!');
        await expect(detailPage.reviews).toHaveCount(1);

        await detailPage.submitReview(2, 'Actually it fell apart');
        await expect(detailPage.toast).toHaveText('Your review has been updated.');

        await expect(detailPage.reviews).toHaveCount(1);
        await expect(detailPage.reviewsSummary).toHaveText('2 out of 5 (1 review)');
        await expect(detailPage.reviews.first()).toContainText('Actually it fell apart');
    });


    test('submitting without selecting a rating shows an inline error, not a popup', async ({ page, request }) => {

        const email = createUniqueEmail('reviewui');
        await signupUser(request, email, 'Password123!');

        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.login(email, 'Password123!');
        await expect(page).toHaveURL(/index\.html/);

        const detailPage = new ProductDetailPage(page);
        await detailPage.goto(testProduct.id);

        await detailPage.reviewForm.locator('button[type="submit"]').click();

        await expect(detailPage.reviewMessage).toHaveText('Select a rating first.');
    });

});
