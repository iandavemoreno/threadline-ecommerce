// Playwright global setup — runs once before the whole suite.
//
// Bootstraps the shared admin test account so specs never have to rely on it
// already existing (e.g. after shop.db has been wiped/recreated). This
// replaces manually signing up through the browser and running
// backend/makeAdmin.js by hand every time the database resets.
//
// Requires the backend to already be running (npm run dev inside backend/),
// same as every other test in this suite.

const { API_BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD } = require('./helpers/config');

async function globalSetup() {
    // 1. Try to create the admin test account via the real signup API.
    //    409 means it already exists from a previous run — that's fine.
    const signupResponse = await fetch(`${API_BASE_URL}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });

    if (signupResponse.status !== 201 && signupResponse.status !== 409) {
        const body = await signupResponse.text();
        throw new Error(
            `Global setup: unexpected response creating admin account ` +
            `(${signupResponse.status}): ${body}`
        );
    }

    // 2. Promote it to the admin role directly in the database — there's no
    //    API route for this (by design, so a regular user can't self-promote),
    //    so we reuse the same db connection backend/makeAdmin.js uses.
    const db = require('../backend/db');
    const result = db
        .prepare('UPDATE users SET role = ? WHERE email = ?')
        .run('admin', ADMIN_EMAIL);

    if (result.changes === 0) {
        throw new Error(
            `Global setup: no user found with email ${ADMIN_EMAIL} to promote to admin.`
        );
    }
}

module.exports = globalSetup;
