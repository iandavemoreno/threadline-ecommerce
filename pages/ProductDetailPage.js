class ProductDetailPage {

    constructor(page) {
        this.page = page;

        this.detail = page.locator('#product-detail');

        this.name = page.locator('#product-detail h2');
        this.category = page.locator('#product-detail .product-category');
        this.price = page.locator('#product-detail .product-price');
        this.description = page.locator('#product-detail .product-description');
        this.stockMessage = page.locator('#product-detail .stock-message');
        this.addToCartButton = page.locator('#detail-add-to-cart');
        this.errorMessage = page.locator('#product-detail .error');
    }


    async goto(productId) {
        await this.page.goto('/product.html?id=' + productId);
    }
}


module.exports = ProductDetailPage;
