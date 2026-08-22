# ThreadLine 🧵

![Playwright Tests](https://github.com/iandavemoreno/threadline-ecommerce/actions/workflows/playwright.yml/badge.svg)

A full-stack e-commerce web application built as a hands-on learning project — combining a plain HTML/CSS/JavaScript frontend with a Node.js/Express/SQLite backend, and a complete automated test suite using Playwright.

This project was built from scratch as a personal QA/automation practice ground: implement a feature, break it, find the bug, fix it, then write a regression test so it never breaks again.

## Features

**Customer-facing**
- Account signup & login
- Browse products
- Add to cart, view cart, adjust quantities
- Checkout with order confirmation

**Admin dashboard**
- Admin-only access control
- Add new products
- Edit existing products
- Delete existing products
- Toast notifications for user feedback

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript (vanilla, no framework)
- **Backend:** Node.js, Express, better-sqlite3
- **Testing:** Playwright (end-to-end, cross-browser, UI + API), Page Object Model
- **CI/CD:** GitHub Actions

## Automated Testing

The full user and admin journey is covered by an automated Playwright test suite, run across Chromium, Firefox, and WebKit on every push via GitHub Actions. Tests follow the Page Object Model (POM) pattern (see `pages/`), and shared test credentials/data live in `tests/helpers/`. A dedicated `tests/global-setup.js` script bootstraps the shared admin test account before any test runs.

A subset of the fastest, highest-value tests are tagged `@smoke` for quick sanity checks.

| Test file | Coverage |
|---|---|
| `homepage.spec.js` | Homepage loads with correct title |
| `auth/signup.spec.js` | New user can sign up successfully |
| `auth/signup-duplicate.spec.js` | Signup correctly rejects an already-used email |
| `auth/login.spec.js` | User can log in with valid credentials |
| `auth/login-wrong-password.spec.js` | Login correctly rejects an incorrect password |
| `cart/cart-pom.spec.js` | Add to cart updates count; cart page shows correct item/total (POM) |
| `checkout/checkout.spec.js` | Full purchase flow, order confirmation, cart clears after order |
| `checkout/checkout-pom.spec.js` | Full purchase flow, order confirmation, cart clears after order (POM) |
| `admin/admin.spec.js` | Admin login, add product, verify toast/list, delete, verify removal |
| `admin/admin-edit-product.spec.js` | Admin can edit an existing product's name and price |
| `products/product-search.spec.js` | Product search: find newly-created product, case-insensitivity, search via Enter key |
| `products/product-search-pom.spec.js` | Product search flows (POM) |
| `api/auth-api.spec.js` | Signup/login API contract tests (no UI) |
| `api/admin-products-api.spec.js` | Admin product create/edit/delete API contract tests (no UI) |
| `api/order-api.spec.js` | Order placement API contract tests, including validation and error cases |
| `api/webkit-login.spec.js` | Confirms the login API works correctly under WebKit |

Run the full suite locally:
```bash
npm test
```

Run just the smoke tests:
```bash
npm run test:smoke
```

View the last HTML report:
```bash
npm run test:report
```

## Bugs Found & Fixed Along the Way

Part of the value of this project was finding and fixing real bugs through testing:

- **Toast notification disappearing instantly** — caused by VS Code Live Server auto-reloading the page whenever the backend wrote to the SQLite database file
- **Checkout allowed with an empty cart** — added validation and disabled the "Proceed to Checkout" button when the cart is empty
- **Malformed HTML** in the cart page footer (`/p>` rendering as visible text)
- **Missing `type="button"`** on dynamically generated delete buttons (defensive fix)
- **Typo** causing the admin product list to fail to refresh after adding a product
- **`shop.db` path resolution bug** — the backend resolved its SQLite file relative to the process's working directory instead of the `backend/` folder, silently creating a second, divergent database depending on how the server was started
- **Flaky parallel test runs** — `Date.now()`-only test data generation caused email collisions between specs running in parallel; fixed with a shared `Date.now()` + random-suffix helper
- **Stale CI credentials** — a leftover manual admin-bootstrap step in the GitHub Actions workflow still used an old password, silently broken since a credentials update; removed in favor of the automated `global-setup.js` bootstrap so there's a single source of truth

## Project Structure

```
my-shop/
├── .github/workflows/
│   └── playwright.yml          # CI: installs deps, boots backend + frontend, runs the suite
├── backend/
│   ├── server.js                # Express app & API routes
│   ├── db.js                    # better-sqlite3 setup
│   ├── makeAdmin.js              # promotes a user to admin
│   └── resetAdminPassword.js     # resets the test admin's password
├── pages/                       # Page Object Model classes used by the tests
│   ├── HomePage.js
│   ├── LoginPage.js
│   ├── SignupPage.js
│   ├── CartPage.js
│   ├── CheckoutPage.js
│   └── AdminPage.js
├── tests/
│   ├── global-setup.js          # bootstraps the shared admin test account
│   ├── homepage.spec.js
│   ├── helpers/
│   │   ├── config.js             # shared base URL / test credentials
│   │   └── test-data.js          # unique test data generators
│   ├── auth/                    # signup & login specs
│   ├── admin/                   # admin dashboard specs
│   ├── cart/                    # cart specs
│   ├── checkout/                # checkout specs
│   ├── products/                # product search specs
│   └── api/                     # API-only contract tests (no browser UI)
├── index.html / login.html / signup.html / cart.html / checkout.html / admin.html
├── script.js
├── style.css
├── playwright.config.js
└── package.json
```

## Running Locally

1. Install backend dependencies and start the server:
```bash
   cd backend
   npm install
   npm run dev
```
2. Serve the frontend (e.g. VS Code Live Server) on `http://127.0.0.1:5500`
3. Install root dependencies and Playwright browsers:
```bash
   npm install
   npx playwright install
```
4. Run the tests:
```bash
   npm test
```

---

Built by [Ian Dave Moreno](https://github.com/iandavemoreno) as a QA/automation portfolio project.
