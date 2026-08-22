const { test, expect } = require('@playwright/test');
const { ADMIN_EMAIL, ADMIN_PASSWORD } = require('../helpers/config');

test('admin can edit an existing product', async ({ page }) => {

    // Log in as admin
    await page.goto('/login.html');

    await page.fill('#login-email', ADMIN_EMAIL);
    await page.fill('#login-password', ADMIN_PASSWORD);

    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/index.html/);


    // Go to admin dashboard
    await page.goto('/admin.html');

    await expect(page.locator('#admin-content')).toBeVisible();


    // Add a product to edit
    const originalName = `Edit Test Product ${Date.now()}`;

    await page.fill('#product-name', originalName);
    await page.fill('#product-price', '15.00');

    const addResponsePromise = page.waitForResponse(resp =>
        resp.url().includes('/api/admin/products') &&
        resp.request().method() === 'POST'
    );

    await page.click('#add-product-form button[type="submit"]');

    await addResponsePromise;

    await expect(page.locator('#admin-product-list'))
        .toContainText(originalName);


    // Find the product we just created
    const productRow = page.locator('.product', {
        hasText: originalName
    });


    // Click Edit on that product
    await productRow.locator('button:has-text("Edit")').click();


    // Update the product
    const updatedName = `Renamed Product ${Date.now()}`;

    await page.fill(
        `input[id^="edit-name-"]`,
        updatedName
    );

    await page.fill(
        `input[id^="edit-price-"]`,
        '19.99'
    );


    // Wait for update request
    const updateResponsePromise = page.waitForResponse(resp =>
        resp.url().includes('/api/admin/products/') &&
        resp.request().method() === 'PUT'
    );

    await page.click('button:has-text("Save")');

    await updateResponsePromise;


    // Check that the update was successful
    await expect(page.locator('#toast'))
        .toHaveText('Product updated successfully.');

    await expect(page.locator('#admin-product-list'))
        .toContainText(updatedName);

    await expect(page.locator('#admin-product-list'))
        .toContainText('$19.99');

    await expect(page.locator('#admin-product-list'))
        .not.toContainText(originalName);


    // ------------------------------------------------
    // CLEAN UP TEST PRODUCT
    // ------------------------------------------------

    // Find the updated product
    const updatedProductRow = page.locator('.product', {
        hasText: updatedName
    });

    // Accept the browser confirmation dialog
    page.once('dialog', async (dialog) => {
        await dialog.accept();
    });

    // Click Delete only inside the updated product's row
    await updatedProductRow
        .locator('button:has-text("Delete")')
        .click();

    // Make sure the test product was actually removed
    await expect(page.locator('#admin-product-list'))
        .not.toContainText(updatedName);
});