function createTestProduct() {
    return {
        name: `Automation Test Shirt ${Date.now()}`,
        price: 25.99
    };
}

module.exports = {
    createTestProduct
};