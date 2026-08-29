const { test, expect } = require('@playwright/test');

const LoginPage = require('../../pages/LoginPage');
const { ADMIN_EMAIL, ADMIN_PASSWORD, API_BASE_URL } = require('../helpers/config');
const { createUniqueEmail } = require('../helpers/test-data');
const { signupUser } = require('../helpers/api-helpers');

test('admin can add a new coupon and it appears in the list', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/index\.html/);

    await page.goto('/admin.html');

    const couponCode = 'TESTCOUPON' + Date.now();

    await page.locator('#new-coupon-code').fill(couponCode);
    await page.locator('#new-coupon-discount').fill('15');
    await page.locator('#add-coupon-form button[type="submit"]').click();

    await expect(page.locator('#admin-coupon-list')).toContainText(couponCode);
});
test('adding a duplicate coupon code shows an error', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/index\.html/);

    await page.goto('/admin.html');

    await page.locator('#new-coupon-code').fill('WELCOME10');
    await page.locator('#new-coupon-discount').fill('10');
    await page.locator('#add-coupon-form button[type="submit"]').click();

    await expect(page.locator('#toast')).toContainText('already exists');
    await expect(page.locator('#toast')).toBeVisible();
});
test('admin can edit a coupon and see the updated discount', async ({ page }) =>{
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/index\.html/);

    await page.goto('/admin.html');

    const couponCode = 'EDITCOUPON' + Date.now();

    await page.locator('#new-coupon-code').fill(couponCode);
    await page.locator('#new-coupon-discount').fill('20');
    await page.locator('#add-coupon-form button[type="submit"]').click();

    const couponRowByCode = page.locator('#admin-coupon-list .product', { hasText: couponCode });
    await expect(couponRowByCode).toBeVisible();

    const rowId = await couponRowByCode.getAttribute('id');
    const couponRow = page.locator('#' + rowId);

    await couponRow.getByRole('button', { name: 'Edit' }).click();

    await couponRow.locator('input[type="number"]').fill('50');
    await couponRow.getByRole('button', { name: 'Save' }).click();

    await expect(couponRow).toContainText('50% off');
});
test('admin can deactivate and reactivate a coupon', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/index\.html/);

    await page.goto('/admin.html');

    const couponCode = 'TOGGLECOUPON' + Date.now();

    await page.locator('#new-coupon-code').fill(couponCode);
    await page.locator('#new-coupon-discount').fill('30');
    await page.locator('#add-coupon-form button[type="submit"]').click();

    const couponRowByCode = page.locator('#admin-coupon-list .product', { hasText: couponCode });
    await expect(couponRowByCode).toBeVisible();

    const rowId = await couponRowByCode.getAttribute('id');
    const couponRow = page.locator('#' + rowId);

    await expect(couponRow.getByRole('button', { name: 'Deactivate' })).toBeVisible();

    await couponRow.getByRole('button', { name: 'Activate' }).click();
    await expect(couponRow.getByRole('button', {name: 'Deactivate'})).toBeVisible();
});
test('admin can delete a coupon', async({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/index\.html/);

    await page.goto('/admin.html');

    const couponCode = 'DELETECOUPON' + Date.now();
    
    await page.locator('#new-coupon-code').fill(couponCode);
    await page.locator('#new-coupon-discount').fill('25');
    await page.locator('#add-coupon-form button[type="submit"]').click();

    const couponRow = page.locator('#admin-coupon-list .product', { hasText: couponCode });
    await expect(couponRow).toBeVisible();

    page.on('dialog', function(dialog) {
        dialog.accept();
    });

    await couponRow.getByRole('button', { name: 'Delete' }).click();

    await expect(page.locator('#admin-coupon-list')).not.toContainText(couponCode);
});
test('a non-admin user cannot access the admin coupon endpoint', async ({ request }) => {
    const email = createUniqueEmail('couponnonadmin');
    const password = 'Password123!';

    await signupUser(request, email, password);

    const response = await request.post(`${API_BASE_URL}/api/admin/coupons`, {
        headers: { 'X-User-Email': email },
        data: { code: 'SHOULDFAIL', discountPercent: 10 }
    });

    expect(response.status()).toBe(403);
});