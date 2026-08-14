class HomePage {

    constructor(page) {
        this.page = page;

        this.productList = page.locator('#product-list');

        this.searchInput = page.locator('#product-search');
        this.searchButton = page.locator('#search-btn');
        this.clearSearchButton = page.locator('#clear-search-btn');

        this.noProductsMessage =
            page.locator('#no-products-message');
    }


    async goto() {
        await this.page.goto('/index.html');
    }


    async searchProduct(productName) {
        await this.searchInput.fill(productName);
        await this.searchButton.click();
    }


    async searchProductWithEnter(productName) {
        await this.searchInput.fill(productName);
        await this.searchInput.press('Enter');
    }


    async clearSearch() {
        await this.clearSearchButton.click();
    }
}


module.exports = HomePage;