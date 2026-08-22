const { test, expect } = require('@playwright/test');

const HomePage = require('../../pages/HomePage');

const { ADMIN_EMAIL } = require('../helpers/config');
const { createProduct, deleteProduct } = require('../helpers/api-helpers');

function uniqueSuffix() {
    return `${Date.now()}${Math.floor(Math.random() * 1000000)}`;
}


test.describe('Product Category Filtering', () => {

    test('category dropdown lists "All Categories" plus real categories', async ({ page, request }) => {

        // Don't assume any particular pre-existing category (e.g. "T-Shirts")
        // is present - which real categories exist depends on whatever data
        // is already in this environment's database. Create a throwaway
        // product with a known category instead, so the assertion holds
        // regardless of what else is seeded locally.
        const suffix = uniqueSuffix();
        const categoryName = `Dropdown Check ${suffix}`;

        const testProduct = await createProduct(request, ADMIN_EMAIL, {
            name: `Dropdown Check Shirt ${suffix}`,
            price: 15,
            stock: 10,
            category: categoryName
        });

        const homePage = new HomePage(page);
        await homePage.goto();

        await expect(homePage.categoryFilter).toBeVisible();

        // The <select> itself is static HTML and is "visible" before
        // script.js's async product fetch ever resolves. Wait for the
        // product we just created to actually render - it's populated by
        // the same loadProducts() call that rebuilds the dropdown options,
        // so this is a reliable signal the options are ready to read too.
        await expect(homePage.getProduct(testProduct.name)).toBeVisible();

        const options = await homePage.categoryFilter.locator('option').allTextContents();

        expect(options).toContain('All Categories');
        expect(options).toContain(categoryName);

        await deleteProduct(request, ADMIN_EMAIL, testProduct.id);
    });


    test('filtering by category shows only matching products @smoke', async ({ page, request }) => {

        const suffix = uniqueSuffix();
        const categoryName = `Hoodies ${suffix}`;

        const testProduct = await createProduct(request, ADMIN_EMAIL, {
            name: `Category Test Hoodie ${suffix}`,
            price: 35,
            stock: 10,
            category: categoryName
        });

        const homePage = new HomePage(page);
        await homePage.goto();

        await homePage.filterByCategory(categoryName);

        await expect(homePage.getProduct(testProduct.name)).toBeVisible();
        await expect(homePage.productList).not.toContainText('Classic White Tee');

        await deleteProduct(request, ADMIN_EMAIL, testProduct.id);
    });


    test('search and category filter combine', async ({ page, request }) => {

        const suffix = uniqueSuffix();
        const categoryName = `Accessories ${suffix}`;

        const matchingProduct = await createProduct(request, ADMIN_EMAIL, {
            name: `Zebra Cap ${suffix}`,
            price: 12,
            stock: 10,
            category: categoryName
        });

        const otherProduct = await createProduct(request, ADMIN_EMAIL, {
            name: `Lion Beanie ${suffix}`,
            price: 14,
            stock: 10,
            category: categoryName
        });

        const homePage = new HomePage(page);
        await homePage.goto();

        await homePage.filterByCategory(categoryName);
        await homePage.searchProduct('Zebra');

        await expect(homePage.getProduct(matchingProduct.name)).toBeVisible();
        await expect(homePage.productList).not.toContainText(otherProduct.name);

        await deleteProduct(request, ADMIN_EMAIL, matchingProduct.id);
        await deleteProduct(request, ADMIN_EMAIL, otherProduct.id);
    });


    test('resetting to All Categories shows every product again', async ({ page, request }) => {

        const suffix = uniqueSuffix();
        const categoryName = `Limited ${suffix}`;

        const testProduct = await createProduct(request, ADMIN_EMAIL, {
            name: `Limited Item ${suffix}`,
            price: 40,
            stock: 10,
            category: categoryName
        });

        const homePage = new HomePage(page);
        await homePage.goto();

        await homePage.filterByCategory(categoryName);
        await expect(homePage.productList).not.toContainText('Classic White Tee');

        await homePage.resetCategoryFilter();
        await expect(homePage.getProduct('Classic White Tee')).toBeVisible();

        await deleteProduct(request, ADMIN_EMAIL, testProduct.id);
    });


    test('category filter selection survives a re-render after adding to cart', async ({ page, request }) => {

        const suffix = uniqueSuffix();
        const categoryName = `Survives ${suffix}`;

        const testProduct = await createProduct(request, ADMIN_EMAIL, {
            name: `Survives Filter Shirt ${suffix}`,
            price: 18,
            stock: 10,
            category: categoryName
        });

        const homePage = new HomePage(page);
        await homePage.goto();

        await page.evaluate(() => {
            localStorage.removeItem('cart');
        });

        await homePage.filterByCategory(categoryName);
        await expect(homePage.getProduct(testProduct.name)).toBeVisible();

        await homePage.getProduct(testProduct.name)
            .locator('button:has-text("Add to Cart")')
            .click();

        // The re-render triggered by addToCart() (for the live stock
        // countdown) should keep the same category selected, not silently
        // reset back to "All Categories".
        await expect(homePage.categoryFilter).toHaveValue(categoryName);
        await expect(homePage.getProduct(testProduct.name)).toBeVisible();

        await deleteProduct(request, ADMIN_EMAIL, testProduct.id);
    });

});
