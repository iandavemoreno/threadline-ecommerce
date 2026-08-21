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

    const signupResponsePromise = page.waitForResponse(response =>
        response.url().includes('/api/signup') &&
        response.request().method() === 'POST'
    );

    await page.click('button[type="submit"]');
    await signupResponsePromise;

    // SHould stay on signup.html, not redirect
    await expect(page).toHaveURL(/signup\.html/);

    // Error text should appear in the signup form's error element
    await expect(page.locator('#signup-form-error')).not.toBeEmpty();
});