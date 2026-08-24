const { test, expect } = require('@playwright/test');

const ProfilePage = require('../../pages/ProfilePage');
const LoginPage = require('../../pages/LoginPage');
const CheckoutPage = require('../../pages/CheckoutPage');

const { ADMIN_EMAIL } = require('../helpers/config');
const { createUniqueEmail, createTestProduct } = require('../helpers/test-data');
const { signupUser, createProduct, deleteProduct } = require('../helpers/api-helpers');


test.describe('Profile Page', () => {

    test('profile page is inaccessible when not logged in', async ({ page }) => {

        const profilePage = new ProfilePage(page);
        await profilePage.goto();

        await expect(profilePage.accessMessage)
            .toHaveText('You must be logged in to view your profile.');

        await expect(profilePage.profileContent).toBeHidden();
    });


    test('profile page shows the logged-in account email and role @smoke', async ({ page, request }) => {

        const email = createUniqueEmail('profileui');
        const password = 'Password123!';
        await signupUser(request, email, password);

        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.login(email, password);
        await expect(page).toHaveURL(/index\.html/);

        const profilePage = new ProfilePage(page);
        await profilePage.goto();

        await expect(profilePage.email).toHaveText(email);
        await expect(profilePage.role).toHaveText('user');
    });


    test('saving default shipping info persists across a reload @smoke', async ({ page, request }) => {

        const email = createUniqueEmail('profileui');
        const password = 'Password123!';
        await signupUser(request, email, password);

        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.login(email, password);
        await expect(page).toHaveURL(/index\.html/);

        const profilePage = new ProfilePage(page);
        await profilePage.goto();

        await profilePage.saveShippingInfo('Jane Doe', '1 Test Lane');
        await expect(profilePage.shippingMessage).toHaveText('Shipping info saved.');

        // Reload from scratch to prove it was actually persisted server-side
        await profilePage.goto();

        await expect(profilePage.defaultNameInput).toHaveValue('Jane Doe');
        await expect(profilePage.defaultAddressInput).toHaveValue('1 Test Lane');
    });


    test('saved default shipping info pre-fills checkout, but stays editable', async ({ page, request }) => {

        const email = createUniqueEmail('profileui');
        const password = 'Password123!';
        await signupUser(request, email, password);

        const testProduct = await createProduct(request, ADMIN_EMAIL, createTestProduct());

        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.login(email, password);
        await expect(page).toHaveURL(/index\.html/);

        const profilePage = new ProfilePage(page);
        await profilePage.goto();
        await profilePage.saveShippingInfo('Jane Doe', '1 Test Lane');
        await expect(profilePage.shippingMessage).toHaveText('Shipping info saved.');

        const checkoutPage = new CheckoutPage(page);
        await checkoutPage.addTestProductToCart(testProduct.id, testProduct.name, testProduct.price);
        await checkoutPage.goto();

        await expect(checkoutPage.nameInput).toHaveValue('Jane Doe');
        await expect(checkoutPage.addressInput).toHaveValue('1 Test Lane');

        // Still just a pre-fill, not locked like the email field
        await checkoutPage.nameInput.fill('Someone Else');
        await expect(checkoutPage.nameInput).toHaveValue('Someone Else');

        await deleteProduct(request, ADMIN_EMAIL, testProduct.id);
    });


    test('changing password with the wrong current password shows an error', async ({ page, request }) => {

        const email = createUniqueEmail('profileui');
        const password = 'Password123!';
        await signupUser(request, email, password);

        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.login(email, password);
        await expect(page).toHaveURL(/index\.html/);

        const profilePage = new ProfilePage(page);
        await profilePage.goto();

        await profilePage.changePassword('WrongPassword!', 'NewPassword456!', 'NewPassword456!');

        await expect(profilePage.passwordMessage).toHaveText('Current password is incorrect.');
    });


    test('mismatched password confirmation is rejected before hitting the backend', async ({ page, request }) => {

        const email = createUniqueEmail('profileui');
        const password = 'Password123!';
        await signupUser(request, email, password);

        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.login(email, password);
        await expect(page).toHaveURL(/index\.html/);

        const profilePage = new ProfilePage(page);
        await profilePage.goto();

        await profilePage.changePassword(password, 'NewPassword456!', 'DoesNotMatch!');

        await expect(profilePage.passwordMessage)
            .toHaveText('New password and confirmation do not match.');
    });


    test('changing password successfully lets you log back in with the new one @smoke', async ({ page, request }) => {

        const email = createUniqueEmail('profileui');
        const password = 'Password123!';
        const newPassword = 'NewPassword456!';
        await signupUser(request, email, password);

        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.login(email, password);
        await expect(page).toHaveURL(/index\.html/);

        const profilePage = new ProfilePage(page);
        await profilePage.goto();

        await profilePage.changePassword(password, newPassword, newPassword);

        await expect(profilePage.passwordMessage).toHaveText('Password updated successfully.');

        // Sign out and log back in with the new password to prove it
        // actually took effect, not just that the form said it did.
        await page.locator('#signout-btn').click();
        await expect(page).toHaveURL(/login\.html/);

        await loginPage.login(email, newPassword);
        await expect(page).toHaveURL(/index\.html/);
    });

});
