const { test, expect } = require('@playwright/test');

const LoginPage = require('../../pages/LoginPage');
const CheckoutPage = require('../../pages/CheckoutPage');
const OrdersPage = require('../../pages/OrdersPage');

const { ADMIN_EMAIL } = require('../helpers/config');
const { createUniqueEmail, createTestProduct } = require('../helpers/test-data');
const { signupUser, createProduct, deleteProduct } = require('../helpers/api-helpers');


async function loginAsFreshUser(page, request, prefix) {
    const email = createUniqueEmail(prefix);
    const password = 'Password123!';

    await signupUser(request, email, password);

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(email, password);
    await expect(page).toHaveURL(/index\.html/);

    return email;
}


test.describe('Order History', () => {

    test('orders page is blocked when not logged in', async ({ page }) => {

        const ordersPage = new OrdersPage(page);

        await ordersPage.goto();

        await expect(
            ordersPage.accessMessage
        ).toHaveText('You must be logged in to view your orders.');

        await expect(
            ordersPage.ordersContent
        ).toBeHidden();
    });


    test('a new user sees an empty order history', async ({ page, request }) => {

        await loginAsFreshUser(page, request, 'ordersempty');

        const ordersPage = new OrdersPage(page);
        await ordersPage.goto();

        await expect(
            ordersPage.ordersContent
        ).toBeVisible();

        await expect(
            ordersPage.noOrdersMessage
        ).toBeVisible();

        await expect(
            ordersPage.noOrdersMessage
        ).toContainText("You haven't placed any orders yet.");
    });


    test('an order placed at checkout appears in order history @smoke', async ({ page, request }) => {

        await loginAsFreshUser(page, request, 'ordersflow');

        const testProduct = await createProduct(request, ADMIN_EMAIL, createTestProduct());

        const checkoutPage = new CheckoutPage(page);

        await checkoutPage.goto();
        await checkoutPage.addTestProductToCart(testProduct.id, testProduct.name, testProduct.price);

        await checkoutPage.goto();
        await checkoutPage.fillCustomerInformation('Order History Tester', '789 History Lane');
        await checkoutPage.placeOrder();

        await expect(checkoutPage.orderConfirmation).toContainText('Thank you, Order History Tester');

        const ordersPage = new OrdersPage(page);
        await ordersPage.goto();

        await expect(ordersPage.noOrdersMessage).toBeHidden();

        const orderCard = ordersPage.getOrderContaining(testProduct.name);

        await expect(orderCard).toBeVisible();
        await expect(orderCard).toContainText('789 History Lane');
        await expect(orderCard).toContainText(`Total: $${testProduct.price.toFixed(2)}`);

        await deleteProduct(request, ADMIN_EMAIL, testProduct.id);
    });

});
