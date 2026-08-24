const { expect } = require('@playwright/test');

class CheckoutPage {

    constructor(page) {
        this.page = page;

        // Access gate (checkout requires being logged in)
        this.accessMessage = page.locator('#checkout-access-message');
        this.checkoutContent = page.locator('#checkout-content');

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

        // Coupon code
        this.couponCodeInput = page.locator('#coupon-code');
        this.applyCouponButton = page.locator('#apply-coupon-btn');
        this.couponMessage = page.locator('#coupon-message');

        // Order summary (subtotal/discount/total shown before placing the order)
        this.orderSummary = page.locator('#order-summary');
        this.summarySubtotal = page.locator('#summary-subtotal');
        this.summaryDiscountRow = page.locator('#summary-discount-row');
        this.summaryDiscount = page.locator('#summary-discount');
        this.summaryTotal = page.locator('#summary-total');
    }


    async goto() {
        await this.page.goto('/checkout.html');
    }


    // productId must be a real product id from the database - checkout now
    // posts to the orders API, which looks products up by id.
    async addTestProductToCart(productId, name = 'Automation Test Shirt', price = 19.99) {

        await this.page.evaluate(({ productId, name, price }) => {

            localStorage.setItem(
                'cart',
                JSON.stringify([
                    {
                        productId: productId,
                        name: name,
                        price: price
                    }
                ])
            );

        }, { productId, name, price });
    }


    // The email field is locked to the logged-in account since checkout now
    // requires being logged in, so only name/address are user-fillable.
    async fillCustomerInformation(name, address) {

        await this.nameInput.fill(name);

        await this.addressInput.fill(address);
    }


    async applyCoupon(code) {
        await this.couponCodeInput.fill(code);
        await this.applyCouponButton.click();
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