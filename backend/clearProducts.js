const db = require('./db');

db.prepare(`
    DELETE FROM products
    WHERE name NOT IN ('Classic White Tee', 'Black Crew Neck', 'Navy Striped Tee', 'Product Test 1')
    `).run();

console.log('Test products cleared, only the 4 originals kept.');