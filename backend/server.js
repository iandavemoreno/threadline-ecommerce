const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello from the backend server!');
});

app.get('/api/products', (req, res) => {
    const products = db.prepare('SELECT * FROM products').all();
    res.json(products);
});

app.post('/api/signup', (req, res) =>{
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.'});
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
        return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const insert = db.prepare('INSERT INTO users (email, password, role) VALUES (?, ?, ?)');
    insert.run(email, hashedPassword, 'user');
    
    res.status(201).json({ message: 'Account created successfully.' });
})

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.'});
    }

    const passwordMatches = bcrypt.compareSync(password, user.password);
    if (!passwordMatches) {
        return res.status(401).json({ error: 'Invalid email or password.' });
    }

    res.json({ message: 'Login successful.', email: user.email, role: user.role });
});

function requireAdmin(req, res, next) {
    const userEmail = req.headers['x-user-email'];

    if(!userEmail) {
        return res.status(401).json({ error: 'Not logged in.'});
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(userEmail);

    if(!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required.'});
    }

    next();
}

app.post('/api/admin/products', requireAdmin, (req, res) => {
    const { name, price } = req.body;

    if (!name || !price) {
        return res.status(400).json({ error: 'Name and price are required.'});
    }

    const existing = db.prepare('SELECT id FROM products WHERE name = ?').get(name);
    if (existing) {
        return res.status(409).json({error: 'A product with that name already exists.'});
    }

    const insert = db.prepare('INSERT INTO products (name, price) VALUES (?, ?)');
    const result = insert.run(name, price);

    res.status(201).json({ id: result.lastInsertRowid, name: name, price: price});
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ message: 'Product deleted.'});
});

app.listen(PORT, () => {
    console.log('Server running at http://localhost:' + PORT);
});

