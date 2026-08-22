// Centralized test configuration.
// Frontend base URL is already handled by playwright.config.js's `use.baseURL`
// (http://127.0.0.1:5500), so page.goto() calls stay relative ('/login.html', etc).
// This file covers everything else that used to be hardcoded/duplicated across
// individual spec files: the backend API origin and the shared admin test account.
//
// Every value can be overridden with an environment variable (useful for CI or
// running against a different backend port) and falls back to the values this
// project has always used locally.

const API_BASE_URL = process.env.TEST_API_BASE_URL || 'http://127.0.0.1:3000';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admintest@example.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Admin123!';

module.exports = {
    API_BASE_URL,
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
};
