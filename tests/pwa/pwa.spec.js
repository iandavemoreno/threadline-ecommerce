const { test, expect } = require('@playwright/test');

test.describe('PWA', () => {

    test('manifest.json is valid and linked correctly @smoke', async ({ page, request }) => {
        await page.goto('/index.html');

        await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', 'manifest.json');

        const response = await request.get('/manifest.json');
        expect(response.status()).toBe(200);

        const manifest = await response.json();
        expect(manifest.name).toBe('ThreadLine');
        expect(manifest.display).toBe('standalone');
        expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
    });


    test('service worker registers successfully @smoke', async ({ page }) => {
        await page.goto('/index.html');

        // Wait for registration to actually finish (become active), not
        // just for the page to load.
        const registration = await page.evaluate(async () => {
            const reg = await navigator.serviceWorker.ready;
            return { active: !!reg.active, scope: reg.scope };
        });

        expect(registration.active).toBe(true);
        expect(registration.scope).toContain('127.0.0.1:5500');
    });


    test('homepage still loads its shell when offline, once visited @smoke', async ({ page, context, browserName }) => {
        
        // WebKit has a known engine limitation combining a forced-offline
        // network state with an active service worker during reload - it
        // throws an internal error rather than reflecting a real app bug.
        // Chromium and Firefox both cover this scenario cleanly.
        test.skip(browserName === 'webkit', 'WebKit does not reliably support offline + reload with an active service worker');
        
        // Visit once online first, so the service worker can install and
        // cache the shell.
        await page.goto('/index.html');
        await page.evaluate(() => navigator.serviceWorker.ready);

        // Give the caching a moment to finish writing before cutting the network.
        await page.waitForTimeout(500);

        await context.setOffline(true);
        await page.reload();

        // The cached shell should still render - header and nav - even
        // though the live product list can't be fetched without a network.
        await expect(page.locator('header h1')).toHaveText('ThreadLine');
        await expect(page.locator('nav')).toBeVisible();

        await context.setOffline(false);
    });

});