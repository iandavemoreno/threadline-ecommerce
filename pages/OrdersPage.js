class OrdersPage {

    constructor(page) {
        this.page = page;

        // Access gate (viewing orders requires being logged in)
        this.accessMessage = page.locator('#orders-access-message');
        this.ordersContent = page.locator('#orders-content');

        this.noOrdersMessage = page.locator('#no-orders-message');
        this.ordersList = page.locator('#orders-list');
    }


    async goto() {
        await this.page.goto('/orders.html');
    }


    getOrderContaining(productName) {
        return this.ordersList.locator('.order', {
            hasText: productName
        });
    }


    getOrderStatus(productName) {
        return this.getOrderContaining(productName).locator('.order-status');
    }
}


module.exports = OrdersPage;
