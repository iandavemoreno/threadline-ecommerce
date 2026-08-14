const { test, expect } = require('@playwright/test');

const CheckoutPage = require('../../pages/CheckoutPage');


test.describe('Checkout - Page Object Model', () => {


    test.beforeEach(async ({ page }) => {

        await page.goto('/index.html');

        // Start every test with an empty cart
        await page.evaluate(() => {
            localStorage.removeItem('cart');
        });
    });


    test('checkout page loads successfully', async ({ page }) => {

        const checkoutPage = new CheckoutPage(page);

        await checkoutPage.goto();

        await expect(
            checkoutPage.checkoutForm
        ).toBeVisible();

        await expect(
            checkoutPage.nameInput
        ).toBeVisible();

        await expect(
            checkoutPage.emailInput
        ).toBeVisible();

        await expect(
            checkoutPage.addressInput
        ).toBeVisible();

        await expect(
            checkoutPage.placeOrderButton
        ).toBeVisible();
    });


    test('user cannot place an order when cart is empty', async ({ page }) => {

        const checkoutPage = new CheckoutPage(page);

        await checkoutPage.goto();

        await checkoutPage.fillCustomerInformation(
            'John Doe',
            'john@example.com',
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
        await checkoutPage.addTestProductToCart();

        // Reload so the page starts with the test cart
        await checkoutPage.goto();

        await checkoutPage.fillCustomerInformation(
            '',
            'john@example.com',
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
        await checkoutPage.addTestProductToCart();

        await checkoutPage.goto();

        await checkoutPage.fillCustomerInformation(
            'John Doe',
            'john@example.com',
            ''
        );

        await checkoutPage.placeOrder();

        await expect(
            checkoutPage.addressError
        ).toHaveText('Address is required.');
    });


    test('invalid email validation is displayed', async ({ page }) => {

        const checkoutPage = new CheckoutPage(page);

        await checkoutPage.goto();

        // Add product so checkout validation can run
        await checkoutPage.addTestProductToCart();

        await checkoutPage.goto();

        await checkoutPage.fillCustomerInformation(
            'John Doe',
            'invalid-email',
            '123 Main Street'
        );

        await checkoutPage.placeOrder();

        await expect(
            checkoutPage.emailError
        ).toHaveText('Enter a valid email.');
    });


    test('multiple validation errors are displayed', async ({ page }) => {

        const checkoutPage = new CheckoutPage(page);

        await checkoutPage.goto();

        // Add product so checkout validation can run
        await checkoutPage.addTestProductToCart();

        await checkoutPage.goto();

        await checkoutPage.fillCustomerInformation(
            '',
            'invalid-email',
            ''
        );

        await checkoutPage.placeOrder();

        await expect(
            checkoutPage.nameError
        ).toHaveText('Name is required.');

        await expect(
            checkoutPage.emailError
        ).toHaveText('Enter a valid email.');

        await expect(
            checkoutPage.addressError
        ).toHaveText('Address is required.');
    });


    test('valid customer information is accepted', async ({ page }) => {

        const checkoutPage = new CheckoutPage(page);

        await checkoutPage.goto();

        await checkoutPage.addTestProductToCart();

        await checkoutPage.goto();

        await checkoutPage.fillCustomerInformation(
            'John Doe',
            'john@example.com',
            '123 Main Street'
        );

        await expect(
            checkoutPage.nameInput
        ).toHaveValue('John Doe');

        await expect(
            checkoutPage.emailInput
        ).toHaveValue('john@example.com');

        await expect(
            checkoutPage.addressInput
        ).toHaveValue('123 Main Street');
    });


    test('successful order clears the cart and shows confirmation', async ({ page }) => {

        const checkoutPage = new CheckoutPage(page);

        await checkoutPage.goto();

        await checkoutPage.addTestProductToCart();

        await checkoutPage.goto();

        await checkoutPage.fillCustomerInformation(
            'John Doe',
            'john@example.com',
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
            'Your oreder has been placed.'
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

        await checkoutPage.addTestProductToCart();

        await checkoutPage.goto();

        await checkoutPage.fillCustomerInformation(
            'Jane Doe',
            'jane@example.com',
            '456 Test Street'
        );

        await checkoutPage.placeOrder();

        await expect(
            checkoutPage.cartCount
        ).toHaveText('0');
    });

});