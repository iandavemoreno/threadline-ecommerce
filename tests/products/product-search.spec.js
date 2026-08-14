const { test, expect } = require('@playwright/test');
const { createTestProduct } = require('../helpers/test-data');

test.describe('Product Search', () => {

    test('user can search for an existing product', async ({ page }) => {

        // ------------------------------------------------
        // LOGIN AS ADMIN
        // ------------------------------------------------

        await page.goto('/login.html');

        await page.fill(
            '#login-email',
            'admintest@example.com'
        );

        await page.fill(
            '#login-password',
            'AdminTest123!'
        );

        await page.click('button[type="submit"]');

        await expect(page).toHaveURL(/index.html/);


        // ------------------------------------------------
        // CREATE TEST PRODUCT
        // ------------------------------------------------

        const testProduct = createTestProduct();

        await page.goto('/admin.html');

        await expect(
            page.locator('#admin-content')
        ).toBeVisible();

        await page.fill(
            '#product-name',
            testProduct.name
        );

        await page.fill(
            '#product-price',
            testProduct.price.toString()
        );

        const addResponsePromise =
            page.waitForResponse(resp =>
                resp.url().includes('/api/admin/products') &&
                resp.request().method() === 'POST'
            );

        await page.click(
            '#add-product-form button[type="submit"]'
        );

        await addResponsePromise;

        await expect(
            page.locator('#admin-product-list')
        ).toContainText(testProduct.name);


        // ------------------------------------------------
        // GO TO USER SIDE
        // ------------------------------------------------

        await page.goto('/index.html');

        await expect(
            page.locator('#product-list')
        ).not.toBeEmpty();


        // ------------------------------------------------
        // SEARCH FOR TEST PRODUCT
        // ------------------------------------------------

        const searchInput =
            page.locator('#product-search');

        const searchButton =
            page.locator('#search-btn');

        await searchInput.fill(testProduct.name);

        await searchButton.click();


        // ------------------------------------------------
        // VERIFY SEARCH RESULT
        // ------------------------------------------------

        await expect(
            page.locator('#product-list')
        ).toContainText(testProduct.name);

        await expect(
            page.locator('#no-products-message')
        ).toBeHidden();


        // ------------------------------------------------
        // CLEAN UP
        // ------------------------------------------------

        await page.goto('/admin.html');

        const productRow =
            page.locator('.product', {
                hasText: testProduct.name
            });

        page.once('dialog', async dialog => {
            await dialog.accept();
        });

        await productRow
            .locator('button:has-text("Delete")')
            .click();

        await expect(
            page.locator('#admin-product-list')
        ).not.toContainText(testProduct.name);
    });


    test('user can search using a partial product name', async ({ page }) => {

        await page.goto('/index.html');

        await expect(
            page.locator('#product-list')
        ).not.toBeEmpty();

        const searchInput =
            page.locator('#product-search');

        const searchButton =
            page.locator('#search-btn');

        await searchInput.fill('Black');

        await searchButton.click();

        await expect(
            page.locator('#product-list')
        ).toContainText('Black');

        await expect(
            page.locator('#no-products-message')
        ).toBeHidden();
    });


    test('search is case-insensitive', async ({ page }) => {

        await page.goto('/index.html');

        await expect(
            page.locator('#product-list')
        ).not.toBeEmpty();

        const searchInput =
            page.locator('#product-search');

        const searchButton =
            page.locator('#search-btn');

        await searchInput.fill('BLACK');

        await searchButton.click();

        await expect(
            page.locator('#product-list')
        ).toContainText('Black');

        await expect(
            page.locator('#no-products-message')
        ).toBeHidden();
    });


    test('user sees no products message when there are no matches', async ({ page }) => {

        await page.goto('/index.html');

        await expect(
            page.locator('#product-list')
        ).not.toBeEmpty();

        const searchInput =
            page.locator('#product-search');

        const searchButton =
            page.locator('#search-btn');

        await searchInput.fill(
            'ThisProductDoesNotExist'
        );

        await searchButton.click();

        await expect(
            page.locator('#product-list')
        ).toBeEmpty();

        await expect(
            page.locator('#no-products-message')
        ).toBeVisible();

        await expect(
            page.locator('#no-products-message')
        ).toHaveText('No products found.');
    });


    test('user can clear the search', async ({ page }) => {

        await page.goto('/index.html');

        await expect(
            page.locator('#product-list')
        ).not.toBeEmpty();

        const searchInput =
            page.locator('#product-search');

        const searchButton =
            page.locator('#search-btn');

        const clearButton =
            page.locator('#clear-search-btn');


        // Search
        await searchInput.fill('Black');

        await searchButton.click();

        await expect(
            page.locator('#product-list')
        ).toContainText('Black');


        // Clear search
        await clearButton.click();

        await expect(
            searchInput
        ).toHaveValue('');

        await expect(
            page.locator('#product-list')
        ).not.toBeEmpty();

        await expect(
            page.locator('#no-products-message')
        ).toBeHidden();
    });


    test('user can search by pressing Enter', async ({ page }) => {

        await page.goto('/index.html');

        await expect(
            page.locator('#product-list')
        ).not.toBeEmpty();

        const searchInput =
            page.locator('#product-search');

        await searchInput.fill('Black');

        await searchInput.press('Enter');

        await expect(
            page.locator('#product-list')
        ).toContainText('Black');

        await expect(
            page.locator('#no-products-message')
        ).toBeHidden();
    });

});