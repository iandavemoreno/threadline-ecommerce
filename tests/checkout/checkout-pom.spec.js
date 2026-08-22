const { test, expect } = require('@playwright/test');

const CheckoutPage = require('../../pages/CheckoutPage');
const LoginPage = require('../../pages/LoginPage');

const { ADMIN_EMAIL } = require('../helpers/config');
const { createUniqueEmail, createTestProduct } = require('../helpers/test-data');
const { signupUser, createProduct, deleteProduct } = require('../helpers/api-helpers');


test.describe('Checkout - Page Object Model', () => {

    let testProduct;

    test.beforeEach(async ({ page, request }) => {

        // Checkout now requires being logged in (the account is what "My
        // Orders" later looks orders up by), and the order it places needs a
        // real product id. A fresh account and a fresh product per test keep
        // these tests independent of each other and of the shared admin
        // account's own order history.
        const email = createUniqueEmail('checkoutpom');
        const password = 'Password123!';

        await signupUser(request, email, password);
        testProduct = await createProduct(request, ADMIN_EMAIL, createTestProduct());

        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.login(email, password);
        await expect(page).toHaveURL(/index\.html/);

        // Start every test with an empty cart
        await page.evaluate(() => {
            localStorage.removeItem('cart');
        });
    });


    test.afterEach(async ({ request }) => {
        await deleteProduct(request, ADMIN_EMAIL, testProduct.id);
    });


    test('checkout page loads successfully with the account email locked in', async ({ page }) => {

        const checkoutPage = new CheckoutPage(page);

        await checkoutPage.goto();

        await expect(
            checkoutPage.checkoutForm
        ).toBeVisible();

        await expect(
            checkoutPage.nameInput
        ).toBeVisible();

        await expect(
            checkoutPage.addressInput
        ).toBeVisible();

        await expect(
            checkoutPage.placeOrderButton
        ).toBeVisible();

        // Email is prefilled from the logged-in account and locked
        await expect(
            checkoutPage.emailInput
        ).toHaveAttribute('readonly', '');
    });


    test('checkout is blocked when not logged in', async ({ page }) => {

        await page.evaluate(() => {
            localStorage.removeItem('loggedInUser');
        });

        const checkoutPage = new CheckoutPage(page);

        await checkoutPage.goto();

        await expect(
            checkoutPage.accessMessage
        ).toHaveText('You must be logged in to check out.');

        await expect(
            checkoutPage.checkoutContent
        ).toBeHidden();
    });


    test('user cannot place an order when cart is empty', async ({ page }) => {

        const checkoutPage = new CheckoutPage(page);

        await checkoutPage.goto();

        await checkoutPage.fillCustomerInformation(
            'John Doe',
            '123 Main Street'
        );

        await checkoutPage.placeOrder();

        await expect(
            checkoutPage.orderConfirmation
        ).toContainText(
            'Your cart is empty. Add items before checking out.'
        );

        await expect(
            checkoutPage.checkoutForm
        ).toBeVisible();
    });


    test('required name validation is displayed', async ({ page }) => {

        const checkoutPage = new CheckoutPage(page);

        await checkoutPage.goto();

        // Checkout validation requires a product in the cart
        await checkoutPage.addTestProductToCart(testProduct.id, testProduct.name, testProduct.price);

        // Reload so the page starts with the test cart
        await checkoutPage.goto();

        await checkoutPage.fillCustomerInformation(
            '',
            '123 Main Street'
        );

        await checkoutPage.placeOrder();

        await expect(
            checkoutPage.nameError
        ).toHaveText('Name is required.');
    });


    test('required address validation is displayed', async ({ page }) => {

        const checkoutPage = new CheckoutPage(page);

        await checkoutPage.goto();

        // Add product so checkout validation can run
        await checkoutPage.addTestProductToCart(testProduct.id, testProduct.name, testProduct.price);

        await checkoutPage.goto();

        await checkoutPage.fillCustomerInformation(
            'John Doe',
            ''
        );

        await checkoutPage.placeOrder();

        await expect(
            checkoutPage.addressError
        ).toHaveText('Address is required.');
    });


    test('multiple validation errors are displayed', async ({ page }) => {

        const checkoutPage = new CheckoutPage(page);

        await checkoutPage.goto();

        // Add product so checkout validation can run
        await checkoutPage.addTestProductToCart(testProduct.id, testProduct.name, testProduct.price);

        await checkoutPage.goto();

        await checkoutPage.fillCustomerInformation(
            '',
            ''
        );

        await checkoutPage.placeOrder();

        await expect(
            checkoutPage.nameError
        ).toHaveText('Name is required.');

        await expect(
            checkoutPage.addressError
        ).toHaveText('Address is required.');
    });


    test('valid customer information is accepted', async ({ page }) => {

        const checkoutPage = new CheckoutPage(page);

        await checkoutPage.goto();

        await checkoutPage.addTestProductToCart(testProduct.id, testProduct.name, testProduct.price);

        await checkoutPage.goto();

        await checkoutPage.fillCustomerInformation(
            'John Doe',
            '123 Main Street'
        );

        await expect(
            checkoutPage.nameInput
        ).toHaveValue('John Doe');

        await expect(
            checkoutPage.addressInput
        ).toHaveValue('123 Main Street');
    });


    test('successful order clears the cart and shows confirmation', async ({ page }) => {

        const checkoutPage = new CheckoutPage(page);

        await checkoutPage.goto();

        await checkoutPage.addTestProductToCart(testProduct.id, testProduct.name, testProduct.price);

        await checkoutPage.goto();

        await checkoutPage.fillCustomerInformation(
            'John Doe',
            '123 Main Street'
        );

        await checkoutPage.placeOrder();

        await expect(
            checkoutPage.orderConfirmation
        ).toContainText(
            'Thank you, John Doe!'
        );

        await expect(
            checkoutPage.orderConfirmation
        ).toContainText(
            'Your order has been placed.'
        );

        await expect(
            checkoutPage.checkoutForm
        ).toBeHidden();

        const cart = await page.evaluate(() => {
            return localStorage.getItem('cart');
        });

        expect(cart).toBeNull();
    });


    test('successful order updates cart count', async ({ page }) => {

        const checkoutPage = new CheckoutPage(page);

        await checkoutPage.goto();

        await checkoutPage.addTestProductToCart(testProduct.id, testProduct.name, testProduct.price);

        await checkoutPage.goto();

        await checkoutPage.fillCustomerInformation(
            'Jane Doe',
            '456 Test Street'
        );

        await checkoutPage.placeOrder();

        await expect(
            checkoutPage.cartCount
        ).toHaveText('0');
    });

});
