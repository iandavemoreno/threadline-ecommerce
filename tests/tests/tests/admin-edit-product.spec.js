const { test, expect } = require('@playwright/test');

test('admin can edit an existing product', async ({ page }) => {
  // Log in as admin
  await page.goto('/login.html');
  await page.fill('#login-email', 'admintest@example.com');
  await page.fill('#login-password', 'AdminTest123!');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/index\.html/);

  // Go to admin dashboard
  await page.goto('/admin.html');
  await expect(page.locator('#admin-content')).toBeVisible();

  // Add a product to edit
  const originalName = `Edit Test Product ${Date.now()}`;
  await page.fill('#product-name', originalName);
  await page.fill('#product-price', '15.00');

  const addResponsePromise = page.waitForResponse(resp =>
    resp.url().includes('/api/admin/products') && resp.request().method() === 'POST'
  );
  await page.click('#add-product-form button[type="submit"]');
  await addResponsePromise;

  await expect(page.locator('#admin-product-list')).toContainText(originalName);

  // Click Edit on that product
  const productRow = page.locator('.product', { hasText: originalName });
  await productRow.locator('button:has-text("Edit")').click();

  // Update to a completely different name (not derived from the original)
  const updatedName = `Renamed Product ${Date.now()}`;
  await page.fill(`input[id^="edit-name-"]`, updatedName);
  await page.fill(`input[id^="edit-price-"]`, '19.99');

  const updateResponsePromise = page.waitForResponse(resp =>
    resp.url().includes('/api/admin/products/') && resp.request().method() === 'PUT'
  );
  await page.click('button:has-text("Save")');
  await updateResponsePromise;

  // Toast should confirm the update
  await expect(page.locator('#toast')).toHaveText('Product updated successfully.');

  // List should reflect the new name and price, and no longer show the old name
  await expect(page.locator('#admin-product-list')).toContainText(updatedName);
  await expect(page.locator('#admin-product-list')).toContainText('$19.99');
  await expect(page.locator('#admin-product-list')).not.toContainText(originalName);

  // Clean up: delete the test product
  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });
  await page.click(`#admin-product-list >> text=${updatedName} >> .. >> button:has-text("Delete")`);
  await expect(page.locator('#admin-product-list')).not.toContainText(updatedName);
});