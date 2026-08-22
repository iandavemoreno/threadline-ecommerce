class AdminPage {

    constructor(page) {
        this.page = page;

        this.adminContent = page.locator('#admin-content');

        this.productNameInput = page.locator('#product-name');
        this.productPriceInput = page.locator('#product-price');
        this.addProductForm = page.locator('#add-product-form');
        this.addProductButton =
            this.addProductForm.locator('button[type="submit"]');

        this.productList = page.locator('#admin-product-list');
        this.toast = page.locator('#toast');
    }


    async goto() {
        await this.page.goto('/admin.html');
    }


    getProduct(productName) {
        return this.productList.locator('.product', {
            hasText: productName
        });
    }


    async addProduct(name, price) {
        await this.productNameInput.fill(name);
        await this.productPriceInput.fill(String(price));

        const addResponsePromise = this.page.waitForResponse(resp =>
            resp.url().includes('/api/admin/products') &&
            resp.request().method() === 'POST'
        );

        await this.addProductButton.click();
        await addResponsePromise;
    }


    async deleteProduct(productName) {
        this.page.once('dialog', async dialog => {
            await dialog.accept();
        });

        await this.getProduct(productName)
            .locator('button:has-text("Delete")')
            .click();
    }
}


module.exports = AdminPage;
