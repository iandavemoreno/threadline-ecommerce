const { test, expect } = require('@playwright/test');

const HomePage = require('../../pages/HomePage');
const CartPage = require('../../pages/CartPage');


test.describe('Cart - Page Object Model', () => {

    // Clear the cart before every test
    test.beforeEach(async ({ page }) => {

        await page.goto('/index.html');

        await page.evaluate(() => {
            localStorage.removeItem('cart');
        });
    });


    test('user can add a product to the cart @smoke', async ({ page }) => {

        const homePage = new HomePage(page);
        const cartPage = new CartPage(page);


        // Go to home page
        await homePage.goto();


        // Make sure products exist
        await expect(homePage.productList)
            .not.toBeEmpty();


        // Get the first product that's actually in stock - "the first
        // product" isn't a stable target on its own now that stock exists,
        // since whichever product happens to be first in the catalog could
        // be sold out by other tests/usage without this test caring which
        // specific product it uses.
        const firstProduct =
            page.locator('.product').filter({
                has: page.locator('button:not([disabled])')
            }).first();


        // Get product name
        const productName =
            await firstProduct.locator('h3').textContent();


        // Add product to cart
        await firstProduct
            .locator('button:has-text("Add to Cart")')
            .click();


        // Go to cart
        await cartPage.goto();


        // Verify product appears in cart
        await expect(
            cartPage.cartItems
        ).toContainText(productName.trim());


        // Verify checkout is enabled
        await expect(
            cartPage.checkoutButton
        ).toBeEnabled();
    });


    test('user can remove a product from the cart', async ({ page }) => {

        const homePage = new HomePage(page);
        const cartPage = new CartPage(page);


        // Go to home page
        await homePage.goto();


        // Get the first product that's actually in stock - "the first
        // product" isn't a stable target on its own now that stock exists,
        // since whichever product happens to be first in the catalog could
        // be sold out by other tests/usage without this test caring which
        // specific product it uses.
        const firstProduct =
            page.locator('.product').filter({
                has: page.locator('button:not([disabled])')
            }).first();


        // Get product name
        const productName =
            await firstProduct.locator('h3').textContent();


        // Add product to cart
        await firstProduct
            .locator('button:has-text("Add to Cart")')
            .click();


        // Go to cart
        await cartPage.goto();


        // Verify product exists
        await expect(
            cartPage.getProduct(productName.trim())
        ).toBeVisible();


        // Click Remove
        await cartPage.removeProduct(
            productName.trim()
        );


        // Verify confirmation modal appears
        await expect(
            cartPage.removeModal
        ).toBeVisible();


        // Confirm removal
        await cartPage.confirmRemove();


        // Verify product was removed
        await expect(
            cartPage.getProduct(productName.trim())
        ).toBeHidden();
    });


    test('checkout is disabled when cart is empty', async ({ page }) => {

        const cartPage = new CartPage(page);


        // Go directly to cart
        await cartPage.goto();


        // Verify empty cart message
        await expect(
            cartPage.cartItems
        ).toContainText('Your cart is empty.');


        // Verify checkout button is disabled
        await expect(
            cartPage.checkoutButton
        ).toBeDisabled();


        // Verify checkout link cannot be clicked
        await expect(
            cartPage.checkoutLink
        ).toHaveCSS(
            'pointer-events',
            'none'
        );
    });


    test('cart displays the correct total', async ({ page }) => {

        const homePage = new HomePage(page);
        const cartPage = new CartPage(page);


        // Go to home page
        await homePage.goto();


        // Get the first product that's actually in stock - "the first
        // product" isn't a stable target on its own now that stock exists,
        // since whichever product happens to be first in the catalog could
        // be sold out by other tests/usage without this test caring which
        // specific product it uses.
        const firstProduct =
            page.locator('.product').filter({
                has: page.locator('button:not([disabled])')
            }).first();


        // Get product price
        const priceText =
            await firstProduct.locator('.product-price').textContent();


        const price =
            parseFloat(
                priceText.replace('$', '').trim()
            );


        // Add product to cart
        await firstProduct
            .locator('button:has-text("Add to Cart")')
            .click();


        // Go to cart
        await cartPage.goto();


        // Verify cart total
        await expect(
            cartPage.cartTotal
        ).toHaveText(
            `Total: $${price.toFixed(2)}`
        );
    });

});