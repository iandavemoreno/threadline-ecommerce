# ThreadLine — Practice E-Commerce Site

A full-stack e-commerce site built from scratch to practice web development and, eventually, automated testing with Playwright.

## Features
- Product catalog pulled from a live backend API
- Shopping cart (persisted with localStorage)
- Checkout form with client-side validation
- User signup and login with hashed passwords (bcrypt)
- SQLite database for products and users

## Tech Stack
**Frontend:** HTML, CSS, JavaScript (no framework — built to learn fundamentals)
**Backend:** Node.js, Express
**Database:** SQLite (via better-sqlite3)

## Running Locally

**1. Start the backend:**

Backend runs at `http://localhost:3000`

**2. Serve the frontend:**
Open `index.html` with a local server (e.g. VS Code's Live Server extension). Do not open it directly as a file — the frontend depends on `fetch()` calls that require a proper server context.

## Project Status
User-side flow (browse, cart, checkout, signup, login) is complete. Admin dashboard and role-based access are in progress.

## About This Project
Built as a learning project to go from zero web development experience to a working full-stack application, with the end goal of practicing UI test automation on a real, self-built site.