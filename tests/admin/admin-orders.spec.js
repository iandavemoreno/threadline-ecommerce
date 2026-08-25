const { test, expect } = require('@playwright/test');

const LoginPage = require('../../pages/LoginPage');
const AdminPage = require('../../pages/AdminPage');
const OrdersPage = require('../../pages/OrdersPage');

const { API_BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD } = require('../helpers/config');
const { createUniqueEmail, createTestProduct } = require('../helpers/test-data');
const { signupUser, createProduct, deleteProduct } = require('../helpers/api-helpers');


test.describe('Admin Order Management', () => {

    let testProduct;

    test.beforeEach(async ({ request }) => {
        testProduct = await createProduct(request, ADMIN_EMAIL, createTestProduct());
    });

    test.afterEach(async ({ request }) => {
        await deleteProduct(request, ADMIN_EMAIL, testProduct.id);
    });


    test('admin can see every order and change its status, which the customer then sees too @smoke', async ({ page, request }) => {

        // Place a real order via the API as a throwaway customer, so the
        // admin has something real to manage.
        const customerPassword = 'Password123!';
        const customerEmail = createUniqueEmail('adminorderui');
        await signupUser(request, customerEmail, customerPassword);

        const orderResponse = await request.post(`${API_BASE_URL}/api/orders`, {
            data: {
                email: customerEmail,
                customerName: 'Admin UI Test Customer',
                address: '1 Admin UI Lane',
                items: [{ productId: testProduct.id, quantity: 1 }]
            }
        });
        const { orderId } = await orderResponse.json();

        // Admin logs in and finds the order, starting out Pending
        const loginPage = new LoginPage(page);
        const adminPage = new AdminPage(page);

        await loginPage.goto();
        await loginPage.login(ADMIN_EMAIL, ADMIN_PASSWORD);
        await expect(page).toHaveURL(/index\.html/);

        await adminPage.goto();

        const orderCard = adminPage.getOrderCard(orderId);
        await expect(orderCard).toBeVisible();
        await expect(orderCard).toContainText(testProduct.name);
        await expect(orderCard).toContainText(customerEmail);

        const statusSelect = adminPage.getOrderStatusSelect(orderId);
        await expect(statusSelect).toHaveValue('Pending');
        await expect(orderCard).toHaveClass(/order-pending/);

        // Change the status and confirm the toast plus live recoloring -
        // no page reload in between, so this also proves updateOrderStatus()
        // updates the DOM in place rather than just persisting server-side.
        await adminPage.setOrderStatus(orderId, 'Shipped');

        await expect(adminPage.toast).toHaveText(`Order #${orderId} marked as Shipped.`);
        await expect(statusSelect).toHaveValue('Shipped');
        await expect(statusSelect).toHaveClass(/status-shipped/);
        await expect(orderCard).toHaveClass(/order-shipped/);

        // Sign out, log back in as the customer, and confirm they see the
        // updated status too on their own order history.
        await page.locator('#signout-btn').click();
        await expect(page).toHaveURL(/login\.html/);

        await loginPage.login(customerEmail, customerPassword);
        await expect(page).toHaveURL(/index\.html/);

        const ordersPage = new OrdersPage(page);
        await ordersPage.goto();

        const customerStatus = ordersPage.getOrderStatus(testProduct.name);
        await expect(customerStatus).toHaveText('Shipped');
        await expect(customerStatus).toHaveClass(/status-shipped/);
    });

});
