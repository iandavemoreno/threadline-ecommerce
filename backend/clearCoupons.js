const db = require('./db');

db.prepare("DELETE FROM coupons WHERE code NOT IN ('SAVE20', 'WELCOME10')").run();
console.log('Test coupons cleared, SAVE20 and WELCOME10 kept.');