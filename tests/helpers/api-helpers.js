// Shared API setup/teardown helpers, used by UI tests that need real
// accounts/products behind the scenes (e.g. checkout and order history now
// require a logged-in account with a real product id) without cluttering
// every spec file with the same fetch boilerplate.

const { API_BASE_URL } = require('./config');

async function signupUser(request, email, password) {
    await request.post(`${API_BASE_URL}/api/signup`, {
        data: { email, password }
    });
}

async function createProduct(request, adminEmail, product) {
    const response = await request.post(`${API_BASE_URL}/api/admin/products`, {
        headers: { 'X-User-Email': adminEmail },
        data: product
    });

    return response.json();
}

async function deleteProduct(request, adminEmail, productId) {
    await request.delete(`${API_BASE_URL}/api/admin/products/${productId}`, {
        headers: { 'X-User-Email': adminEmail }
    });
}

async function updateOrderStatus(request, adminEmail, orderId, status) {
    await request.put(`${API_BASE_URL}/api/admin/orders/${orderId}/status`, {
        headers: { 'X-User-Email': adminEmail },
        data: { status }
    });
}

module.exports = {
    signupUser,
    createProduct,
    deleteProduct,
    updateOrderStatus
};
