const { test, expect } = require('@playwright/test');
const path = require('path');
const LoginPage = require('../../pages/LoginPage');
const AdminPage = require('../../pages/AdminPage');
const { ADMIN_EMAIL, ADMIN_PASSWORD } = require('../helpers/config');
const { createTestProduct } = require('../helpers/test-data');

const TEST_IMAGE = path.join(__dirname, '..', 'fixtures', 'test-product.png');
const INVALID_FILE = path.join(__dirname, '..', 'fixtures', 'not-an-image.txt');

test('admin can add a product with an image and it displays', async ({ page }) => {

    const loginPage = new LoginPage(page);
    const adminPage = new AdminPage(page);

    await loginPage.goto();
    await loginPage.login(ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/index\.html/);

    await adminPage.goto();
    await expect(adminPage.adminContent).toBeVisible();

    const product = createTestProduct();
    await adminPage.addProduct(product.name, product.price, 10, TEST_IMAGE);

    await expect(adminPage.toast).toHaveText('Product added successfully.');
    await expect(adminPage.productList).toContainText(product.name);

    const productImage = adminPage.getProductImage(product.name);
    await expect(productImage).toBeVisible();
    await expect(productImage).toHaveAttribute('src', /\/uploads\/products\//);

    // ------------------------------------------------
    // CLEAN UP TEST PRODUCT
    // ------------------------------------------------
    await adminPage.deleteProduct(product.name);
    await expect(adminPage.productList).not.toContainText(product.name);
});

test('adding a product without an image still shows the placeholder', async ({ page }) => {

    const loginPage = new LoginPage(page);
    const adminPage = new AdminPage(page);

    await loginPage.goto();
    await loginPage.login(ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/index\.html/);

    await adminPage.goto();
    await expect(adminPage.adminContent).toBeVisible();

    const product = createTestProduct();
    await adminPage.addProduct(product.name, product.price);

    await expect(adminPage.toast).toHaveText('Product added successfully.');

    const productImage = adminPage.getProductImage(product.name);
    await expect(productImage).toHaveCount(0);

    // ------------------------------------------------
    // CLEAN UP TEST PRODUCT
    // ------------------------------------------------
    await adminPage.deleteProduct(product.name);
    await expect(adminPage.productList).not.toContainText(product.name);
});

test('uploading a non-image file is rejected with an error', async ({ page}) => {

    const loginPage = new LoginPage(page);
    const adminPage = new AdminPage(page);

    await loginPage.goto();
    await loginPage.login(ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/index\.html/);

    await adminPage.goto();
    await expect(adminPage.adminContent).toBeVisible();

    const product = createTestProduct();
    await adminPage.addProduct(product.name, product.price, 10, INVALID_FILE);

    await expect(adminPage.addProductError).toContainText('Only image files');
    await expect(adminPage.productList).not.toContainText(product.name);
});