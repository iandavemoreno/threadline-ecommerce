class LoginPage {

    constructor(page) {
        this.page = page;

        this.emailInput = page.locator('#login-email');
        this.passwordInput = page.locator('#login-password');
        this.loginButton = page.locator('button[type="submit"]');

        this.formError = page.locator('#login-form-error');
    }


    async goto() {
        await this.page.goto('/login.html');
    }


    async login(email, password) {
        await this.emailInput.fill(email);
        await this.passwordInput.fill(password);

        await this.loginButton.click();
    }


    async getErrorMessage() {
        return await this.formError.textContent();
    }
}


module.exports = LoginPage;