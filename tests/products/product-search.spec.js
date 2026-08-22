const { test, expect } = require('@playwright/test');

const LoginPage = require('../../pages/LoginPage');
const HomePage = require('../../pages/HomePage');
const AdminPage = require('../../pages/AdminPage');

const { ADMIN_EMAIL, ADMIN_PASSWORD } = require('../helpers/config');
const { createTestProduct } = require('../helpers/test-data');

// Note: partial-name search, the no-match message, and clear-search are
// already covered by product-search-pom.spec.js, so they aren't repeated
// here. This file keeps only the cases that file doesn't cover: searching
// for a product created dynamically through the admin panel (not just the
// seeded defaults), case-insensitivity, and searching via the Enter key.

test.describe('Product Search', () => {

    test('user can search for a newly created product', async ({ page }) => {

        const loginPage = new LoginPage(page);
        const homePage = new HomePage(page);
        const adminPage = new AdminPage(page);

        // Log in as admin
        await loginPage.goto();
        await loginPage.login(ADMIN_EMAIL, ADMIN_PASSWORD);
        await expect(page).toHaveURL(/index\.html/);

        // Create a test product via the admin panel
        const testProduct = createTestProduct();

        await adminPage.goto();
        await expect(adminPage.adminContent).toBeVisible();
        await adminPage.addProduct(testProduct.name, testProduct.price);
        await expect(adminPage.productList).toContainText(testProduct.name);

        // Go to the user side and search for it
        await homePage.goto();
        await expect(homePage.productList).not.toBeEmpty();

        await homePage.searchProduct(testProduct.name);

        await expect(homePage.productList).toContainText(testProduct.name);
        await expect(homePage.noProductsMessage).toBeHidden();

        // Clean up
        await adminPage.goto();
        await adminPage.deleteProduct(testProduct.name);
        await expect(adminPage.productList).not.toContainText(testProduct.name);
    });


    test('search is case-insensitive', async ({ page }) => {

        const homePage = new HomePage(page);

        await homePage.goto();
        await expect(homePage.productList).not.toBeEmpty();

        await homePage.searchProduct('BLACK');

        await expect(homePage.productList).toContainText('Black');
        await expect(homePage.noProductsMessage).toBeHidden();
    });


    test('user can search by pressing Enter', async ({ page }) => {

        const homePage = new HomePage(page);

        await homePage.goto();
        await expect(homePage.productList).not.toBeEmpty();

        await homePage.searchProductWithEnter('Black');

        await expect(homePage.productList).toContainText('Black');
        await expect(homePage.noProductsMessage).toBeHidden();
    });

});
