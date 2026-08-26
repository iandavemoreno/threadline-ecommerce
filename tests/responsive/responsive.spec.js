const { test, expect } = require('@playwright/test');

const LoginPage = require('../../pages/LoginPage');
const CheckoutPage = require('../../pages/CheckoutPage');

const { ADMIN_EMAIL, ADMIN_PASSWORD } = require('../helpers/config');
const { createUniqueEmail, createTestProduct } = require('../helpers/test-data');
const { signupUser, createProduct, deleteProduct } = require('../helpers/api-helpers');

const MOBILE = { width: 375, height: 667 };
const DESKTOP = { width: 1280, height: 800 };

const PAGES_WITH_VIEWPORT_META = [
    '/index.html', '/cart.html', '/checkout.html', '/login.html',
    '/orders.html', '/product.html', '/profile.html', '/signup.html', '/admin.html'
];


test.describe('Responsive layout', () => {

    for (const path of PAGES_WITH_VIEWPORT_META) {
        test(`${path} has a viewport meta tag`, async ({ page }) => {
            await page.goto(path);
            await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /width=device-width/);
        });
    }


    test('nav links do not wrap mid-word on a phone width, logged in as admin @smoke', async ({ page }) => {

        // Regression test for the exact bug you found manually: on a narrow
        // screen, a two-word nav link like "My Orders" split into "My" /
        // "Orders" on separate lines instead of wrapping as a whole link.
        // Logged in as admin because that's when the nav has the most links
        // and is most likely to run out of room.
        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.login(ADMIN_EMAIL, ADMIN_PASSWORD);
        await expect(page).toHaveURL(/index\.html/);

        await page.setViewportSize(MOBILE);

        const navLinks = page.locator('nav a:visible');
        const count = await navLinks.count();
        expect(count).toBeGreaterThan(0);

        for (let i = 0; i < count; i++) {
            const box = await navLinks.nth(i).boundingBox();
            expect(box).not.toBeNull();
            // A mid-word-wrapped link renders roughly twice as tall as a
            // normal single-line link (~16-20px) - this catches that.
            expect(box.height).toBeLessThan(30);
        }
    });


    test('homepage has no horizontal overflow at phone width', async ({ page }) => {
        await page.setViewportSize(MOBILE);
        await page.goto('/index.html');

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const viewportWidth = await page.evaluate(() => window.innerWidth);

        expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 1);
    });


    test('product grid is a single column on phone width and multiple columns on desktop width @smoke', async ({ page, request }) => {
        
        // Guarantee at least 2 products exist regardless of whatever's
        // already seeded, so the grid has something to lay out into columns.
        const productA = await createProduct(request, ADMIN_EMAIL, createTestProduct());
        const productB = await createProduct(request, ADMIN_EMAIL, createTestProduct());
        
        await page.goto('/index.html');

        await page.setViewportSize(MOBILE);
        const mobileTops = await page.locator('#product-list .product').evaluateAll(
            (els) => els.slice(0, 2).map((el) => el.getBoundingClientRect().top)
        );
        expect(mobileTops[0]).not.toBe(mobileTops[1]);

        await page.setViewportSize(DESKTOP);
        const desktopTops = await page.locator('#product-list .product').evaluateAll(
            (els) => els.slice(0, 2).map((el) => el.getBoundingClientRect().top)
        );
        expect(desktopTops[0]).toBe(desktopTops[1]);

        await deleteProduct(request, ADMIN_EMAIL, productA.id);
        await deleteProduct(request, ADMIN_EMAIL, productB.id);
    });


    test('checkout coupon row stacks vertically on phone width', async ({ page, request }) => {

        const email = createUniqueEmail('responsive');
        const password = 'Password123!';
        await signupUser(request, email, password);
        const testProduct = await createProduct(request, ADMIN_EMAIL, createTestProduct());

        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.login(email, password);
        await expect(page).toHaveURL(/index\.html/);

        const checkoutPage = new CheckoutPage(page);
        await checkoutPage.addTestProductToCart(testProduct.id);

        await page.setViewportSize(MOBILE);
        await checkoutPage.goto();

        const inputBox = await checkoutPage.couponCodeInput.boundingBox();
        const buttonBox = await checkoutPage.applyCouponButton.boundingBox();

        // Stacked vertically means the button starts at or below where the
        // input ends, rather than sitting beside it.
        expect(buttonBox.y).toBeGreaterThanOrEqual(inputBox.y + inputBox.height - 2);

        await deleteProduct(request, ADMIN_EMAIL, testProduct.id);
    });

});