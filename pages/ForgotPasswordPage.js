class ForgotPasswordPage {
    
    constructor(page) {
        this.page = page;

        this.emailInput = page.locator('#forgot-password-email');
        this.submitButton = page.locator('button[type="submit"]');

        this.message = page.locator('#forgot-password-message');
    }


    async goto() {
        await this.page.goto('/forgot-password.html');
    }

    async submit(email) {
        await this.emailInput.fill(email);
        await this.submitButton.click();
    }

    async getMessage() {
        return await this.message.textContent();
    }
}

module.exports = ForgotPasswordPage;