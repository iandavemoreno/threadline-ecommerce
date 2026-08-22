const {test, expect} = require('@playwright/test');

test ('homepage loads with correct tittle @smoke', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page).toHaveTitle(/My Shop/i);
});