class ProfilePage {

    constructor(page) {
        this.page = page;

        // Access gate (viewing the profile requires being logged in)
        this.accessMessage = page.locator('#profile-access-message');
        this.profileContent = page.locator('#profile-content');

        this.email = page.locator('#profile-email');
        this.role = page.locator('#profile-role');

        // Default shipping info
        this.defaultNameInput = page.locator('#default-name');
        this.defaultAddressInput = page.locator('#default-address');
        this.shippingForm = page.locator('#shipping-form');
        this.shippingMessage = page.locator('#shipping-message');

        // Change password
        this.currentPasswordInput = page.locator('#current-password');
        this.newPasswordInput = page.locator('#new-password');
        this.confirmNewPasswordInput = page.locator('#confirm-new-password');
        this.passwordForm = page.locator('#password-form');
        this.passwordMessage = page.locator('#password-message');
    }


    async goto() {
        await this.page.goto('/profile.html');
    }


    async saveShippingInfo(name, address) {
        await this.defaultNameInput.fill(name);
        await this.defaultAddressInput.fill(address);
        await this.shippingForm.locator('button[type="submit"]').click();
    }


    async changePassword(currentPassword, newPassword, confirmNewPassword) {
        await this.currentPasswordInput.fill(currentPassword);
        await this.newPasswordInput.fill(newPassword);
        await this.confirmNewPasswordInput.fill(confirmNewPassword);
        await this.passwordForm.locator('button[type="submit"]').click();
    }
}


module.exports = ProfilePage;
