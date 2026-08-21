const { test, expect } = require('@playwright/test');

test('user can complete checkout after adding a product', async ({ page }) => {
  await page.goto('/index.html');

  page.on('dialog', async (dialog) => {
    await dialog.accept();
  });

  await page.waitForSelector('#product-list button:has-text("Add to Cart")');
  await page.click('#product-list button:has-text("Add to Cart")');

  await page.goto('/checkout.html');

  await page.fill('#name', 'Test Buyer');
  await page.fill('#email', 'testbuyer@example.com');
  await page.fill('#address', '123 Test Street, Testville');
  await page.click('button[type="submit"]');

  await expect(page.locator('#order-confirmation')).toContainText('Thank you, Test Buyer');

  // Cart should be cleared after a successful order
  await expect(page.locator('#cart-count')).toHaveText('0');
});