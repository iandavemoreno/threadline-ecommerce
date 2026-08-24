const { test, expect } = require('@playwright/test');

const HomePage = require('../../pages/HomePage');
const ProductDetailPage = require('../../pages/ProductDetailPage');

const { ADMIN_EMAIL } = require('../helpers/config');
const { createTestProduct } = require('../helpers/test-data');
const { createProduct, deleteProduct } = require('../helpers/api-helpers');


test.describe('Product Detail Page', () => {

    let testProduct;

    test.beforeEach(async ({ request }) => {
        testProduct = await createProduct(request, ADMIN_EMAIL, {
            ...createTestProduct(),
            price: 45,
            stock: 2,
            category: 'Detail Test Category',
            description: 'A soft, breathable cotton tee.\nMachine washable.'
        });
    });

    test.afterEach(async ({ request }) => {
        await deleteProduct(request, ADMIN_EMAIL, testProduct.id);
    });


    test('clicking a product name on the homepage opens its detail page @smoke', async ({ page }) => {

        const homePage = new HomePage(page);
        await homePage.goto();

        await homePage.getProductLink(testProduct.name).click();

        await expect(page).toHaveURL(new RegExp('product\\.html\\?id=' + testProduct.id));
    });


    test('detail page shows the full product information @smoke', async ({ page }) => {

        const detailPage = new ProductDetailPage(page);
        await detailPage.goto(testProduct.id);

        await expect(detailPage.name).toHaveText(testProduct.name);
        await expect(detailPage.category).toHaveText('Detail Test Category');
        await expect(detailPage.price).toHaveText('$45.00');
        await expect(detailPage.description).toContainText('A soft, breathable cotton tee.');
        await expect(detailPage.stockMessage).toHaveText('2 in stock');
    });


    test('adding to cart from the detail page updates the live stock count', async ({ page }) => {

        const detailPage = new ProductDetailPage(page);
        await detailPage.goto(testProduct.id);

        await detailPage.addToCartButton.click();
        await expect(detailPage.stockMessage).toHaveText('1 in stock');

        await detailPage.addToCartButton.click();
        await expect(detailPage.stockMessage).toContainText('All 2 in stock are already in your cart');
        await expect(detailPage.addToCartButton).toBeDisabled();
    });


    test('an unknown product id shows a not found message', async ({ page }) => {

        const detailPage = new ProductDetailPage(page);
        await detailPage.goto(999999);

        await expect(detailPage.errorMessage).toHaveText('Product not found.');
    });


    test('a missing product id shows an error instead of the detail page', async ({ page }) => {

        await page.goto('/product.html');

        const detailPage = new ProductDetailPage(page);
        await expect(detailPage.errorMessage).toHaveText('No product specified.');
    });

});
