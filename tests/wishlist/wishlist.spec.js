const { test, expect } = require('@playwright/test');

const LoginPage = require('../../pages/LoginPage');
const HomePage = require('../../pages/HomePage');
const WishlistPage = require('../../pages/WishlistPage');

const { createProduct, deleteProduct, signupUser } = require('../helpers/api-helpers');
const { createTestProduct } = require('../helpers/test-data');
const { ADMIN_EMAIL } = require('../helpers/config');


test.describe('Wishlist', () => {

    let testProduct;
    let userEmail;
    const password = 'Password123!';

    test.beforeEach(async ({ request }) => {
        testProduct = await createProduct(request, ADMIN_EMAIL, createTestProduct());

        userEmail = `wishlistui${Date.now()}@example.com`;
        await signupUser(request, userEmail, password);
    });

    test.afterEach(async ({ request }) => {
        await deleteProduct(request, ADMIN_EMAIL, testProduct.id);
    });


    test('user can save a product, see it on the wishlist page, and remove it @smoke', async ({ page }) => {

        const loginPage = new LoginPage(page);
        const homePage = new HomePage(page);
        const wishlistPage = new WishlistPage(page);

        await loginPage.goto();
        await loginPage.login(userEmail, password);
        await expect(page).toHaveURL(/index\.html/);

        await homePage.goto();
        await expect(homePage.getWishlistButton(testProduct.name)).toHaveText('♡ Save');

        await homePage.toggleWishlist(testProduct.name);
        await expect(homePage.getWishlistButton(testProduct.name)).toHaveText('♥ Saved');

        await wishlistPage.goto();
        await expect(wishlistPage.getItem(testProduct.name)).toBeVisible();

        await wishlistPage.removeItem(testProduct.name);
        await expect(wishlistPage.getItem(testProduct.name)).toHaveCount(0);
        await expect(wishlistPage.noWishlistMessage).toBeVisible();
    });

});