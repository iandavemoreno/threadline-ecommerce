const { expect } = require('@playwright/test');

class CartPage {

    constructor(page) {
        this.page = page;

        this.cartItems = page.locator('#cart-items');
        this.cartTotal = page.locator('#cart-total');

        this.checkoutButton = page.locator('#checkout-btn');
        this.checkoutLink = page.locator('#checkout-link');

        this.toast = page.locator('#toast');

        // Remove confirmation modal
        this.removeModal = page.locator('#remove-modal');
        this.removeMessage = page.locator('#remove-message');

        // We will use the button text for now
        this.confirmRemoveButton =
            this.removeModal.getByRole('button', {
                name: 'Remove',
                exact: true
            });

        this.cancelRemoveButton =
            this.removeModal.getByRole('button', {
                name: 'Cancel',
                exact: true
            });
    }


    async goto() {
        await this.page.goto('/cart.html');
    }


    getProduct(productName) {
        return this.page.locator('.product', {
            hasText: productName
        });
    }


    async removeProduct(productName) {

        const productRow =
            this.getProduct(productName);

        await productRow
            .locator('button:has-text("Remove")')
            .click();
    }


    async confirmRemove() {

        await expect(this.removeModal)
            .toBeVisible();

        await this.confirmRemoveButton.click();
    }


    async cancelRemove() {

        await expect(this.removeModal)
            .toBeVisible();

        await this.cancelRemoveButton.click();
    }


    async getTotalText() {
        return await this.cartTotal.textContent();
    }


    async isCheckoutDisabled() {
        return await this.checkoutButton.isDisabled();
    }
}


module.exports = CartPage;