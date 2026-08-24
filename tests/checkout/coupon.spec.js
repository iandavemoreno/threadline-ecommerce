const { test, expect } = require('@playwright/test');

const CheckoutPage = require('../../pages/CheckoutPage');
const LoginPage = require('../../pages/LoginPage');
const OrdersPage = require('../../pages/OrdersPage');

const { ADMIN_EMAIL } = require('../helpers/config');
const { createUniqueEmail, createTestProduct } = require('../helpers/test-data');
const { signupUser, createProduct, deleteProduct } = require('../helpers/api-helpers');


test.describe('Checkout - Coupon Codes', () => {

    let testProduct;

    test.beforeEach(async ({ page, request }) => {

        // A fixed, round price (rather than createTestProduct()'s default)
        // keeps the discount math exact - $50 at 10% off is a clean $5,
        // with no floating point rounding to account for in assertions.
        const email = createUniqueEmail('coupon');
        const password = 'Password123!';

        await signupUser(request, email, password);
        testProduct = await createProduct(request, ADMIN_EMAIL, {
            ...createTestProduct(),
            price: 50,
            stock: 10
        });

        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.login(email, password);
        await expect(page).toHaveURL(/index\.html/);

        await page.evaluate(() => {
            localStorage.removeItem('cart');
        });
    });


    test.afterEach(async ({ request }) => {
        await deleteProduct(request, ADMIN_EMAIL, testProduct.id);
    });


    test('applying a valid coupon shows a success message and updates the order summary @smoke', async ({ page }) => {

        const checkoutPage = new CheckoutPage(page);

        await checkoutPage.addTestProductToCart(testProduct.id, testProduct.name, testProduct.price);
        await checkoutPage.goto();

        await checkoutPage.applyCoupon('WELCOME10');

        await expect(checkoutPage.couponMessage).toContainText('WELCOME10');
        await expect(checkoutPage.couponMessage).toContainText('10% off');

        await expect(checkoutPage.summarySubtotal).toHaveText('50.00');
        await expect(checkoutPage.summaryDiscountRow).toBeVisible();
        await expect(checkoutPage.summaryDiscount).toHaveText('5.00');
        await expect(checkoutPage.summaryTotal).toHaveText('45.00');
    });


    test('applying an invalid coupon shows an error and leaves the total unchanged', async ({ page }) => {

        const checkoutPage = new CheckoutPage(page);

        await checkoutPage.addTestProductToCart(testProduct.id, testProduct.name, testProduct.price);
        await checkoutPage.goto();

        await checkoutPage.applyCoupon('NOT-A-REAL-CODE');

        await expect(checkoutPage.couponMessage).toContainText('Invalid or inactive coupon code.');
        await expect(checkoutPage.summaryDiscountRow).toBeHidden();
        await expect(checkoutPage.summaryTotal).toHaveText('50.00');
    });


    test('completing checkout with a coupon applied shows the discount in the confirmation and order history @smoke', async ({ page }) => {

        const checkoutPage = new CheckoutPage(page);

        await checkoutPage.addTestProductToCart(testProduct.id, testProduct.name, testProduct.price);
        await checkoutPage.goto();

        await checkoutPage.applyCoupon('WELCOME10');
        await expect(checkoutPage.summaryTotal).toHaveText('45.00');

        await checkoutPage.fillCustomerInformation('Coupon User', '1 Coupon Lane');
        await checkoutPage.placeOrder();

        await expect(checkoutPage.orderConfirmation).toContainText('Thank you, Coupon User');
        await expect(checkoutPage.orderConfirmation).toContainText('Discount applied (WELCOME10): -$5.00');
        await expect(checkoutPage.orderConfirmation).toContainText('Total: $45.00');

        const ordersPage = new OrdersPage(page);
        await ordersPage.goto();

        const order = ordersPage.getOrderContaining(testProduct.name);
        await expect(order).toContainText('Discount applied (WELCOME10): -$5.00');
        await expect(order).toContainText('Total: $45.00');
    });

});
