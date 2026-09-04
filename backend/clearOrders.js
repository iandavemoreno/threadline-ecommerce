const db = require('./db');

db.prepare('DELETE FROM order_items').run();
db.prepare('DELETE FROM orders').run();

console.log('All orders and order items cleared');
console.log('Thanks!');