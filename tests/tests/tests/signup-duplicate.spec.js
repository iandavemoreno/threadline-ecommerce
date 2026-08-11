const { test, expect } = require('@playwright/test');

test('signup rejects an already-used email', async ({ page }) => {
    const email = `dupe${Date.now()}@example.com`;
    const password = 'Password123!';

    // First signup should succeed
    await page.goto('/signup.html');
    await page.fill('#signup-email', email);
    await page.fill('#signup-password', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/login\.html/);

    // Second signup with the same email should fail
    await page.goto('/signup.html');
    await page.fill('#signup-email', email);
    await page.fill('#signup-password', password);
    await page.click('button[type="submit"]');

    // SHould stay on signup.html, not redirect
    await expect(page).toHaveURL(/signup\.html/);

    // Some error text should appear somewhere on the page
    const errorText = await page.locator('#signup-form-error, #singup-email-error').allTextContents();
    expect(errorText.join('')).not.toBe('');
});