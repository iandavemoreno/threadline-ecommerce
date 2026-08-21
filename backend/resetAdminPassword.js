const bcrypt = require('bcryptjs');
const db = require('./db');

const email = 'admintest@example.com';
const newPassword = 'Admin123!';

const hashedPassword = bcrypt.hashSync(newPassword, 10);

const result = db
    .prepare('UPDATE users SET password = ?, role = ? WHERE email = ?')
    .run(hashedPassword, 'admin', email);

if (result.changes === 0) {
    console.log('Admin account not found.');
} else {
    console.log('Admin password reset successfully.');
    console.log('Email:', email);
    console.log('Password:', newPassword);
}