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

        // Reviews section
        this.reviewsSummary = page.locator('#reviews-summary');
        this.reviewsList = page.locator('#reviews-list');
        this.reviews = page.locator('#reviews-list .review');
        this.reviewAccessMessage = page.locator('#review-access-message');
        this.reviewForm = page.locator('#review-form');
        this.reviewRatingSelect = page.locator('#review-rating');
        this.reviewCommentInput = page.locator('#review-comment');
        this.reviewMessage = page.locator('#review-message');
        this.toast = page.locator('#toast');
    }


    async goto(productId) {
        await this.page.goto('/product.html?id=' + productId);
    }


    async submitReview(rating, comment) {
        await this.reviewRatingSelect.selectOption(String(rating));

        if (comment !== undefined) {
            await this.reviewCommentInput.fill(comment);
        }

        await this.reviewForm.locator('button[type="submit"]').click();
    }
}


module.exports = ProductDetailPage;
