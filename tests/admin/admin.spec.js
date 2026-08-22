const { test, expect } = require('@playwright/test');
const LoginPage = require('../../pages/LoginPage');
const AdminPage = require('../../pages/AdminPage');
const { ADMIN_EMAIL, ADMIN_PASSWORD } = require('../helpers/config');
const { createTestProduct } = require('../helpers/test-data');

test('admin can log in, add a product, and delete it @smoke', async ({ page }) => {

  const loginPage = new LoginPage(page);
  const adminPage = new AdminPage(page);

  // Log in as admin
  await loginPage.goto();
  await loginPage.login(ADMIN_EMAIL, ADMIN_PASSWORD);
  await expect(page).toHaveURL(/index\.html/);

  // Go to admin dashboard
  await adminPage.goto();
  await expect(adminPage.adminContent).toBeVisible();

  // Add a new product, waiting for the actual API response before checking the UI
  const testProduct = createTestProduct();
  await adminPage.addProduct(testProduct.name, testProduct.price);

  await expect(adminPage.toast).toHaveText('Product added successfully.');
  await expect(adminPage.productList).toContainText(testProduct.name);

  // Delete the product we just added
  await adminPage.deleteProduct(testProduct.name);

  await expect(adminPage.toast).toHaveText('Product deleted.');
  await expect(adminPage.productList).not.toContainText(testProduct.name);
});
