const { test, expect } = require('@playwright/test');
const HomePage = require('../../pages/HomePage');
const CheckoutPage = require('../../pages/CheckoutPage');

// This is the one test in the suite that adds a product to the cart the
// real way (clicking "Add to Cart" on the product list) rather than
// injecting it into localStorage like checkout-pom.spec.js does. Keeping it
// as a full browse -> cart -> checkout smoke test, on top of the more
// detailed validation coverage in checkout-pom.spec.js.

test('user can complete checkout after adding a product from the product list @smoke', async ({ page }) => {

    const homePage = new HomePage(page);
    const checkoutPage = new CheckoutPage(page);

    page.on('dialog', async (dialog) => {
        await dialog.accept();
    });

    await homePage.goto();

    await page.waitForSelector('#product-list button:has-text("Add to Cart")');
    await page.click('#product-list button:has-text("Add to Cart")');

    await checkoutPage.goto();

    await checkoutPage.fillCustomerInformation(
        'Test Buyer',
        'testbuyer@example.com',
        '123 Test Street, Testville'
    );

    await checkoutPage.placeOrder();

    await expect(checkoutPage.orderConfirmation).toContainText('Thank you, Test Buyer');

    // Cart should be cleared after a successful order
    await expect(checkoutPage.cartCount).toHaveText('0');
});
