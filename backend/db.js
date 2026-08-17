const Database = require('better-sqlite3');

const db = new Database('shop.db');


// ========================================
// PRODUCTS TABLE
// ========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL
    )
`);


// ========================================
// USERS TABLE
// ========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user'
    )
`);


// ========================================
// ORDERS TABLE
// ========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        customer_name TEXT NOT NULL,
        email TEXT NOT NULL,
        address TEXT NOT NULL,
        total REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);


// ========================================
// ORDER ITEMS TABLE
// ========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        price REAL NOT NULL,
        quantity INTEGER NOT NULL
    )
`);


// ========================================
// DEFAULT PRODUCTS
// ========================================

const count = db
    .prepare('SELECT COUNT(*) AS total FROM products')
    .get();

if (count.total === 0) {

    const insert = db.prepare(
        'INSERT INTO products (name, price) VALUES (?, ?)'
    );

    insert.run('Classic White Tee', 20.00);
    insert.run('Black Crew Neck', 25.00);
    insert.run('Navy Striped Tee', 22.00);
}


// ========================================
// EXPORT DATABASE
// ========================================

module.exports = db;