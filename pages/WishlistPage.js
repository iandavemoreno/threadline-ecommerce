class WishlistPage {

    constructor(page) {
        this.page = page;

        this.wishlistItems = page.locator('#wishlist-items');
        this.noWishlistMessage = page.locator('#no-wishlist-message');
    }


    async goto() {
        await this.page.goto('/wishlist.html');
    }


    getItem(productName) {
        return this.wishlistItems.locator('.product', {
            hasText: productName
        });
    }


    getRemoveButton(productName) {
        return this.getItem(productName).locator('button');
    }


    async removeItem(productName) {
        await this.getRemoveButton(productName).click();
    }
}


module.exports = WishlistPage;