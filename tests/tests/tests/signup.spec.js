const { test, expect } = require('@playwright/test');

test('user can sign up successfully', async ({ page }) => {
    await page.goto('/signup.html');

    // Use a unique email each run so signup doesn't fail on duplicate
    const uniqueEmail = `testuser${Date.now()}@example.com`;

    await page.fill('#signup-email', uniqueEmail);  // adjust selector match to your actual input id
    await page.fill('#signup-password', 'Password123!'); // adjust selector to match your actual input id
    await page.click('button[type="submit"]');

    // Adjust this assertion to match what actually happnens on success
    // e.g redirect to login.html, or a success message appearing
    await expect(page).toHaveURL(/login\.html/);
});