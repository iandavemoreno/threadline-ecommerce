const path = require('path');
const Database = require('better-sqlite3');

function getResetToken(email) {
    const db = new Database(path.join(__dirname, '../../backend/shop.db'));
    const user = db.prepare('SELECT reset_token FROM users WHERE email = ?').get(email);
    db.close();

    return user ? user.reset_token : null;
}

module.exports = {
    getResetToken
};