const { expect } = require('@playwright/test');

class CheckoutPage {

    constructor(page) {
        this.page = page;

        // Checkout form
        this.checkoutForm = page.locator('#checkout-form');

        // Form fields
        this.nameInput = page.locator('#name');
        this.emailInput = page.locator('#email');
        this.addressInput = page.locator('#address');

        // Validation messages
        this.nameError = page.locator('#name-error');
        this.emailError = page.locator('#email-error');
        this.addressError = page.locator('#address-error');

        // Place Order button
        this.placeOrderButton =
            page.locator('#checkout-form button[type="submit"]');

        // Order confirmation
        this.orderConfirmation =
            page.locator('#order-confirmation');

        // Cart count
        this.cartCount =
            page.locator('#cart-count');
    }


    async goto() {
        await this.page.goto('/checkout.html');
    }


    async addTestProductToCart() {

        await this.page.evaluate(() => {

            localStorage.setItem(
                'cart',
                JSON.stringify([
                    {
                        name: 'Automation Test Shirt',
                        price: 19.99
                    }
                ])
            );

        });
    }


    async fillCustomerInformation(name, email, address) {

        await this.nameInput.fill(name);

        await this.emailInput.fill(email);

        await this.addressInput.fill(address);
    }


    async placeOrder() {

        await expect(
            this.placeOrderButton
        ).toBeVisible();

        await this.placeOrderButton.click();
    }


    async getNameError() {
        return await this.nameError.textContent();
    }


    async getEmailError() {
        return await this.emailError.textContent();
    }


    async getAddressError() {
        return await this.addressError.textContent();
    }


    async getConfirmationMessage() {
        return await this.orderConfirmation.textContent();
    }
}


module.exports = CheckoutPage;