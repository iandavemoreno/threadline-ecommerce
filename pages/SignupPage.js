class SignupPage {

    constructor(page) {
        this.page = page;

        this.emailInput = page.locator('#signup-email');
        this.passwordInput = page.locator('#signup-password');
        this.signupButton = page.locator('button[type="submit"]');

        this.emailError = page.locator('#signup-email-error');
        this.passwordError = page.locator('#signup-password-error');
        this.formError = page.locator('#signup-form-error');
    }


    async goto() {
        await this.page.goto('/signup.html');
    }


    async signup(email, password) {
        await this.emailInput.fill(email);
        await this.passwordInput.fill(password);

        await this.signupButton.click();
    }


    async getFormError() {
        return await this.formError.textContent();
    }
}


module.exports = SignupPage;
