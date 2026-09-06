class ResetPasswordPage {

    constructor(page) {
        this.page = page;

        this.newPasswordInput = page.locator('#reset-password-new');
        this.confirmPasswordInput = page.locator('#reset-password-confirm');
        this.submitButton = page.locator('button[type="submit"]');

        this.formError = page.locator('#reset-password-form-error');
    }

    async goto(token) {
        await this.page.goto(`/reset-password.html?token=${token}`);
    }

    async resetPassword(newPassword, confirmPassword) {
        await this.newPasswordInput.fill(newPassword);
        await this.confirmPasswordInput.fill(confirmPassword);

        await this.submitButton.click();
    }

    async getFormError() {
        return await this.formError.textContent();
    }
}

module.exports = ResetPasswordPage;