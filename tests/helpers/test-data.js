// Timestamp alone (Date.now()) is only millisecond-precision. Under
// Playwright's parallel workers, two different spec files can generate a
// "unique" value in the exact same millisecond and collide (e.g. two specs
// both signing up `testuser<timestamp>@example.com` at once, causing a
// spurious 409). Appending a random suffix makes collisions effectively
// impossible regardless of how many tests run in parallel.

function uniqueSuffix() {
    return `${Date.now()}${Math.floor(Math.random() * 1000000)}`;
}

function createTestProduct() {
    return {
        name: `Automation Test Shirt ${uniqueSuffix()}`,
        price: 25.99
    };
}

function createUniqueEmail(prefix = 'testuser') {
    return `${prefix}${uniqueSuffix()}@example.com`;
}

module.exports = {
    createTestProduct,
    createUniqueEmail
};
