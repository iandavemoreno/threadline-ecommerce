# ThreadLine 🧵

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
- Delete existing products
- Toast notifications for user feedback

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript (vanilla, no framework)
- **Backend:** Node.js, Express, better-sqlite3
- **Testing:** Playwright (end-to-end, cross-browser)
- **CI/CD:** GitHub Actions

## Automated Testing

The full user and admin journey is covered by an automated Playwright test suite, run across Chromium, Firefox, and WebKit on every push via GitHub Actions.

| Test file | Coverage |
|---|---|
| `homepage.spec.js` | Homepage loads with correct title |
| `signup.spec.js` | New user can sign up successfully |
| `signup-duplicate.spec.js` | Signup correctly rejects an already-used email |
| `login.spec.js` | User can log in with valid credentials |
| `login-wrong-password.spec.js` | Login correctly rejects an incorrect password |
| `cart.spec.js` | Add to cart updates count; cart page shows correct item/total |
| `checkout.spec.js` | Full purchase flow, order confirmation, cart clears after order |
| `admin.spec.js` | Admin login, add product, verify toast/list, delete, verify removal |

Run the suite locally:
```bash
npx playwright test
```

View the last HTML report:
```bash
npx playwright show-report
```

## Bugs Found & Fixed Along the Way

Part of the value of this project was finding and fixing real bugs through testing:

- **Toast notification disappearing instantly** — caused by VS Code Live Server auto-reloading the page whenever the backend wrote to the SQLite database file
- **Checkout allowed with an empty cart** — added validation and disabled the "Proceed to Checkout" button when the cart is empty
- **Malformed HTML** in the cart page footer (`/p>` rendering as visible text)
- **Missing `type="button"`** on dynamically generated delete buttons (defensive fix)
- **Typo** causing the admin product list to fail to refresh after adding a product

## Project Structure

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
   npx playwright test
```

---

Built by [Ian Dave Moreno](https://github.com/iandavemoreno) as a QA/automation portfolio project.