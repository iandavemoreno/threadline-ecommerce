const { test, expect } = require('@playwright/test');
const LoginPage = require('../../pages/LoginPage');
const AdminPage = require('../../pages/AdminPage');
const { ADMIN_EMAIL, ADMIN_PASSWORD } = require('../helpers/config');
const { createTestProduct } = require('../helpers/test-data');

test('admin can edit an existing product', async ({ page }) => {

    const loginPage = new LoginPage(page);
    const adminPage = new AdminPage(page);

    // Log in as admin
    await loginPage.goto();
    await loginPage.login(ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/index\.html/);

    // Go to admin dashboard
    await adminPage.goto();
    await expect(adminPage.adminContent).toBeVisible();

    // Add a product to edit
    const originalProduct = createTestProduct();
    await adminPage.addProduct(originalProduct.name, originalProduct.price);
    await expect(adminPage.productList).toContainText(originalProduct.name);

    // Edit the product
    const updatedProduct = createTestProduct();
    await adminPage.editProduct(originalProduct.name, updatedProduct.name, 19.99);

    // Check that the update was successful
    await expect(adminPage.toast).toHaveText('Product updated successfully.');
    await expect(adminPage.productList).toContainText(updatedProduct.name);
    await expect(adminPage.productList).toContainText('$19.99');
    await expect(adminPage.productList).not.toContainText(originalProduct.name);

    // ------------------------------------------------
    // CLEAN UP TEST PRODUCT
    // ------------------------------------------------
    await adminPage.deleteProduct(updatedProduct.name);
    await expect(adminPage.productList).not.toContainText(updatedProduct.name);
});
