const { test, expect } = require('@playwright/test');
const HomePage = require('../../pages/HomePage');
const CheckoutPage = require('../../pages/CheckoutPage');
const LoginPage = require('../../pages/LoginPage');

const { createUniqueEmail } = require('../helpers/test-data');
const { signupUser } = require('../helpers/api-helpers');

// This is the one test in the suite that adds a product to the cart the
// real way (clicking "Add to Cart" on the product list) rather than
// injecting it into localStorage like checkout-pom.spec.js does. Keeping it
// as a full browse -> cart -> checkout smoke test, on top of the more
// detailed validation coverage in checkout-pom.spec.js.

test('user can complete checkout after adding a product from the product list @smoke', async ({ page, request }) => {

    const homePage = new HomePage(page);
    const loginPage = new LoginPage(page);
    const checkoutPage = new CheckoutPage(page);

    // Checkout requires being logged in
    const email = createUniqueEmail('checkoutflow');
    const password = 'Password123!';
    await signupUser(request, email, password);

    page.on('dialog', async (dialog) => {
        await dialog.accept();
    });

    await loginPage.goto();
    await loginPage.login(email, password);
    await expect(page).toHaveURL(/index\.html/);

    await homePage.goto();

    await page.waitForSelector('#product-list button:has-text("Add to Cart")');
    await page.click('#product-list button:has-text("Add to Cart")');

    await checkoutPage.goto();

    await checkoutPage.fillCustomerInformation(
        'Test Buyer',
        '123 Test Street, Testville'
    );

    await checkoutPage.placeOrder();

    await expect(checkoutPage.orderConfirmation).toContainText('Thank you, Test Buyer');

    // Cart should be cleared after a successful order
    await expect(checkoutPage.cartCount).toHaveText('0');
});
