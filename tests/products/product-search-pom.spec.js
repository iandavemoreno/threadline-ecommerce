const { test, expect } = require('@playwright/test');

const HomePage = require('../../pages/HomePage');


test.describe('Product Search - Page Object Model', () => {

    test('user can search for a product @smoke', async ({ page }) => {

        const homePage = new HomePage(page);


        // Go to home page
        await homePage.goto();


        // Make sure products are displayed
        await expect(homePage.productList)
            .not.toBeEmpty();


        // Search for product
        await homePage.searchProduct('Black');


        // Verify search result
        await expect(homePage.productList)
            .toContainText('Black');


        // No products message should not be visible
        await expect(homePage.noProductsMessage)
            .toBeHidden();
    });


    test('user sees message when product does not exist', async ({ page }) => {

        const homePage = new HomePage(page);


        await homePage.goto();


        await expect(homePage.productList)
            .not.toBeEmpty();


        await homePage.searchProduct(
            'ThisProductDoesNotExist'
        );


        await expect(homePage.productList)
            .toBeEmpty();


        await expect(homePage.noProductsMessage)
            .toBeVisible();


        await expect(homePage.noProductsMessage)
            .toHaveText('No products found.');
    });


    test('user can clear the search', async ({ page }) => {

        const homePage = new HomePage(page);


        await homePage.goto();


        await homePage.searchProduct('Black');


        await expect(homePage.productList)
            .toContainText('Black');


        await homePage.clearSearch();


        await expect(homePage.searchInput)
            .toHaveValue('');


        await expect(homePage.productList)
            .not.toBeEmpty();


        await expect(homePage.noProductsMessage)
            .toBeHidden();
    });

});