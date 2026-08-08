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

app.listen(PORT, () => {
    console.log('Server running at http://localhost:' + PORT);
});

