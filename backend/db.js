const Database = require('better-sqlite3');
const path = require('path');

// Always resolve shop.db next to this file, regardless of the directory
// the process was launched from (a bare relative path here would resolve
// against process.cwd(), which silently created two different databases
// depending on whether the server was started from the project root or
// from backend/).
const db = new Database(path.join(__dirname, 'shop.db'));


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

// Migration: add the stock column for databases created before stock
// tracking existed. DEFAULT 10 backfills every existing product with a
// usable stock count instead of leaving them all stuck at 0/out-of-stock.
const productColumns = db.prepare('PRAGMA table_info(products)').all();
const hasStockColumn = productColumns.some((col) => col.name === 'stock');

if (!hasStockColumn) {
    db.exec('ALTER TABLE products ADD COLUMN stock INTEGER NOT NULL DEFAULT 10');
}


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
        'INSERT INTO products (name, price, stock) VALUES (?, ?, ?)'
    );

    insert.run('Classic White Tee', 20.00, 15);
    insert.run('Black Crew Neck', 25.00, 15);
    insert.run('Navy Striped Tee', 22.00, 15);
}


// ========================================
// EXPORT DATABASE
// ========================================

module.exports = db;