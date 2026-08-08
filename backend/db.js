const Database = require('better-sqlite3');
const db = new Database('shop.db');

db.exec(`
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user'
        )
`);

const count = db.prepare('SELECT COUNT(*) AS total FROM products').get();

if (count.total === 0) {
    const insert = db.prepare('INSERT INTO products (name, price) VALUES (?, ?)');
    insert.run('Classic White Tee', 20.00);
    insert.run('Black Crew Neck', 25.00);
    insert.run('Navy Striped Tee', 22.00);
}

module.exports = db;