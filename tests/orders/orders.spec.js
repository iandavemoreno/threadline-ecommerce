const { test, expect } = require('@playwright/test');

const LoginPage = require('../../pages/LoginPage');
const CheckoutPage = require('../../pages/CheckoutPage');
const OrdersPage = require('../../pages/OrdersPage');

const { ADMIN_EMAIL, API_BASE_URL } = require('../helpers/config');
const { createUniqueEmail, createTestProduct } = require('../helpers/test-data');
const { signupUser, createProduct, deleteProduct, updateOrderStatus } = require('../helpers/api-helpers');


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
        test('a pending order can be cancelled from Order History @smoke', async ({ page, request }) => {

        await loginAsFreshUser(page, request, 'ordercancelui');

        const testProduct = await createProduct(request, ADMIN_EMAIL, createTestProduct());

        const checkoutPage = new CheckoutPage(page);
        await checkoutPage.goto();
        await checkoutPage.addTestProductToCart(testProduct.id, testProduct.name, testProduct.price);

        await checkoutPage.goto();
        await checkoutPage.fillCustomerInformation('Cancel UI Tester', '1 Cancel UI Lane');
        await checkoutPage.placeOrder();

        await expect(checkoutPage.orderConfirmation).toContainText('Thank you, Cancel UI Tester');

        const ordersPage = new OrdersPage(page);
        await ordersPage.goto();

        await expect(ordersPage.getOrderStatus(testProduct.name)).toHaveText('Pending');

        page.on('dialog', dialog => dialog.accept());
        await ordersPage.getCancelButton(testProduct.name).click();

        await expect(ordersPage.getOrderStatus(testProduct.name)).toHaveText('Cancelled');
        await expect(ordersPage.getCancelButton(testProduct.name)).toBeHidden();

        await deleteProduct(request, ADMIN_EMAIL, testProduct.id);
    });


    test('order status tabs filter the list to the selected status @smoke', async ({ page, request }) => {

        await loginAsFreshUser(page, request, 'ordertabs');

        const productA = await createProduct(request, ADMIN_EMAIL, createTestProduct());
        const productB = await createProduct(request, ADMIN_EMAIL, createTestProduct());

        const checkoutPage = new CheckoutPage(page);

        await checkoutPage.goto();
        await checkoutPage.addTestProductToCart(productA.id, productA.name, productA.price);
        await checkoutPage.goto();
        await checkoutPage.fillCustomerInformation('Tabs Tester A', '1 Tabs Lane');
        await checkoutPage.placeOrder();

        await expect(checkoutPage.orderConfirmation).toContainText('Thank you, Tabs Tester A');

        await checkoutPage.goto();
        await checkoutPage.addTestProductToCart(productB.id, productB.name, productB.price);
        await checkoutPage.goto();
        await checkoutPage.fillCustomerInformation('Tabs Tester B', '1 Tabs Lane');
        await checkoutPage.placeOrder();

        await expect(checkoutPage.orderConfirmation).toContainText('Thank you, Tabs Tester B');

        const ordersResponse = await request.get(`${API_BASE_URL}/api/admin/orders`, {
            headers: { 'X-User-Email': ADMIN_EMAIL }
        });
        const orders = await ordersResponse.json();
        const orderB = orders.find((order) =>
            order.items.some((item) => item.product_id === productB.id)
        );
        await updateOrderStatus(request, ADMIN_EMAIL, orderB.id, 'Shipped');

        const ordersPage = new OrdersPage(page);
        await ordersPage.goto();

        await expect(ordersPage.getOrderContaining(productA.name)).toBeVisible();
        await expect(ordersPage.getOrderContaining(productB.name)).toBeVisible();

        await ordersPage.getTab('Pending').click();
        await expect(ordersPage.getOrderContaining(productA.name)).toBeVisible();
        await expect(ordersPage.getOrderContaining(productB.name)).toBeHidden();

        await ordersPage.getTab('Shipped').click();
        await expect(ordersPage.getOrderContaining(productA.name)).toBeHidden();
        await expect(ordersPage.getOrderContaining(productB.name)).toBeVisible();

        await deleteProduct(request, ADMIN_EMAIL, productA.id);
        await deleteProduct(request, ADMIN_EMAIL, productB.id);
    });

});
