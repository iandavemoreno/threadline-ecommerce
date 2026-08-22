class AdminPage {

    constructor(page) {
        this.page = page;

        this.adminContent = page.locator('#admin-content');

        this.productNameInput = page.locator('#product-name');
        this.productPriceInput = page.locator('#product-price');
        this.productStockInput = page.locator('#product-stock');
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


    // stock defaults to 10 so existing callers that only ever cared about
    // name/price (written before stock tracking existed) don't need to
    // change - the add-product form now requires a stock value to submit.
    async addProduct(name, price, stock = 10) {
        await this.productNameInput.fill(name);
        await this.productPriceInput.fill(String(price));
        await this.productStockInput.fill(String(stock));

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


    async editProduct(productName, newName, newPrice) {
        await this.getProduct(productName)
            .locator('button:has-text("Edit")')
            .click();

        await this.page.fill('input[id^="edit-name-"]', newName);
        await this.page.fill('input[id^="edit-price-"]', String(newPrice));

        const updateResponsePromise = this.page.waitForResponse(resp =>
            resp.url().includes('/api/admin/products/') &&
            resp.request().method() === 'PUT'
        );

        await this.page.click('button:has-text("Save")');
        await updateResponsePromise;
    }
}


module.exports = AdminPage;
