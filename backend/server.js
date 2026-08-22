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

app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const { name, price } = req.body;

    if (!name || !price) {
        return res.status(400).json({ error: 'Name and price are required.' });
    }

    const existing = db.prepare('SELECT id FROM products WHERE name = ? AND id != ?').get(name, id);
    if (existing) {
        return res.status(409).json({ error: 'A product with that name already exists.'});
    }

    const update = db.prepare('UPDATE products SET name = ?, price = ? WHERE id = ?');
    const result = update.run(name, price, id);

    if(result.changes === 0) {
        return res.status(404).json({ error: 'Product not found'});
    }

    res.json({ id, name, price });
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ message: 'Product deleted.'});
});

app.post('/api/orders', (req, res) => {

    const {
        email,
        customerName,
        address,
        items
    } = req.body;


    // Validate required information
    if (
        !email ||
        !customerName ||
        !address ||
        !items ||
        items.length === 0
    ) {
        return res.status(400).json({
            error: 'Customer information and order items are required.'
        });
    }


    // Find the user
    const user = db
        .prepare('SELECT id, email FROM users WHERE email = ?')
        .get(email);

    if (!user) {
        return res.status(404).json({
            error: 'User not found.'
        });
    }


    // Calculate the total using prices from the database
    let total = 0;
    const orderItems = [];


    for (const item of items) {

        const product = db
            .prepare(
                'SELECT id, name, price FROM products WHERE id = ?'
            )
            .get(item.productId);


        if (!product) {
            return res.status(404).json({
                error: `Product with ID ${item.productId} not found.`
            });
        }


        const quantity = Number(item.quantity) || 1;

        total += product.price * quantity;


        orderItems.push({
            productId: product.id,
            productName: product.name,
            price: product.price,
            quantity
        });
    }


    // Create order and order items together
    const createOrder = db.transaction(() => {

        const orderResult = db
            .prepare(`
                INSERT INTO orders (
                    user_id,
                    customer_name,
                    email,
                    address,
                    total
                )
                VALUES (?, ?, ?, ?, ?)
            `)
            .run(
                user.id,
                customerName,
                email,
                address,
                total
            );


        const orderId = orderResult.lastInsertRowid;


        const insertItem = db.prepare(`
            INSERT INTO order_items (
                order_id,
                product_id,
                product_name,
                price,
                quantity
            )
            VALUES (?, ?, ?, ?, ?)
        `);


        for (const item of orderItems) {

            insertItem.run(
                orderId,
                item.productId,
                item.productName,
                item.price,
                item.quantity
            );

        }


        return orderId;
    });


    const orderId = createOrder();


    // Send successful response
    res.status(201).json({
        message: 'Order placed successfully.',
        orderId,
        total
    });

});

app.get('/api/orders', (req, res) => {
    const userEmail = req.headers['x-user-email'];

    if (!userEmail) {
        return res.status(401).json({ error: 'Not logged in.' });
    }

    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(userEmail);

    if (!user) {
        return res.status(404).json({ error: 'User not found.' });
    }

    const orders = db
        .prepare(`
            SELECT id, customer_name, email, address, total, created_at
            FROM orders
            WHERE user_id = ?
            ORDER BY created_at DESC
        `)
        .all(user.id);

    const getItems = db.prepare(
        'SELECT product_id, product_name, price, quantity FROM order_items WHERE order_id = ?'
    );

    const ordersWithItems = orders.map((order) => ({
        ...order,
        items: getItems.all(order.id)
    }));

    res.json(ordersWithItems);
});

app.listen(PORT, () => {
    console.log('Server running at http://localhost:' + PORT);
});

