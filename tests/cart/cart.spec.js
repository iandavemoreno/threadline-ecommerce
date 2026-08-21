const { test, expect } = require('@playwright/test');

test('user can add a product to cart', async ({ page }) => {
  await page.goto('/index.html');

  page.on('dialog', async (dialog) => {
    await dialog.accept();
  });

  await page.waitForSelector('#product-list button:has-text("Add to Cart")');
  await page.click('#product-list button:has-text("Add to Cart")');

  await expect(page.locator('#cart-count')).toHaveText('1');
});

test('cart page shows the added product and correct total', async ({ page }) => {
  await page.goto('/index.html');

  page.on('dialog', async (dialog) => {
    await dialog.accept();
  });

  await page.waitForSelector('#product-list .product');

  // Capture the first product's actual name and price before adding it
  const firstProduct = page.locator('#product-list .product').first();
  const productName = await firstProduct.locator('h3').textContent();
  const productPriceText = await firstProduct.locator('p').textContent(); // e.g. "$19.99"
  const productPrice = parseFloat(productPriceText.replace('$', ''));

  await firstProduct.locator('button:has-text("Add to Cart")').click();

  await page.goto('/cart.html');

  // Verify the item appears on the cart page
  await expect(page.locator('#cart-items')).toContainText(productName);
  await expect(page.locator('#cart-items')).toContainText(productPriceText);

  // Verify the total matches
  const expectedTotal = `Total: $${productPrice.toFixed(2)}`;
  await expect(page.locator('#cart-total')).toHaveText(expectedTotal);
});