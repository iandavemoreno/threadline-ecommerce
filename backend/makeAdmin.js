const db = require('./db');

const email = 'admintest@example.com'; //change this to the account you want to make admin

const result = db.prepare('UPDATE users SET role = ? WHERE email = ?').run('admin', email);

if (result.changes === 0) {
    console.log('No user found with that email.');
} else {
    console.log(email + ' is now an admin');
    
}