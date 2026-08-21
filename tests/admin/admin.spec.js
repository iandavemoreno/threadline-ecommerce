const { test, expect } = require('@playwright/test');

test('admin can log in, add a product, and delete it', async ({ page }) => {
  // Log in as admin
  await page.goto('/login.html');
  await page.fill('#login-email', 'admintest@example.com');
  await page.fill('#login-password', 'Admin123!');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/index\.html/);

  // Go to admin dashboard
  await page.goto('/admin.html');
  await expect(page.locator('#admin-content')).toBeVisible();

  // Add a new product, waiting for the actual API response before checking the UI
  const productName = `Test Product ${Date.now()}`;
  await page.fill('#product-name', productName);
  await page.fill('#product-price', '29.99');

  const addResponsePromise = page.waitForResponse(resp =>
    resp.url().includes('/api/admin/products') && resp.request().method() === 'POST'
  );
  await page.click('#add-product-form button[type="submit"]');
  await addResponsePromise;

  await expect(page.locator('#toast')).toHaveText('Product added successfully.');
  await expect(page.locator('#admin-product-list')).toContainText(productName);

  // Delete the product we just added
  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });
  await page.click(`#admin-product-list >> text=${productName} >> .. >> button:has-text("Delete")`);

  await expect(page.locator('#toast')).toHaveText('Product deleted.');
  await expect(page.locator('#admin-product-list')).not.toContainText(productName);
});