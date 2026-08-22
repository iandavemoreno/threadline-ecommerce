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

    // bcrypt.hash (async) instead of hashSync: hashSync blocks Node's single
    // JS thread for the entire ~50-100ms cost of hashing, so several
    // signups/logins arriving close together (e.g. Playwright's parallel
    // workers) queue up back to back and can push later requests past their
    // timeout. The async form chunks the same work via setImmediate so other
    // pending requests get a chance to finish in between.
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            return res.status(500).json({ error: 'Something went wrong creating your account.' });
        }

        const insert = db.prepare('INSERT INTO users (email, password, role) VALUES (?, ?, ?)');
        insert.run(email, hashedPassword, 'user');

        res.status(201).json({ message: 'Account created successfully.' });
    });
})

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.'});
    }

    bcrypt.compare(password, user.password, (err, passwordMatches) => {
        if (err) {
            return res.status(500).json({ error: 'Something went wrong logging you in.' });
        }

        if (!passwordMatches) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        res.json({ message: 'Login successful.', email: user.email, role: user.role });
    });
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

// Products created without a stock/category value (e.g. older API
// callers/tests that predate these fields) default to these rather than
// being rejected.
const DEFAULT_STOCK = 10;
const DEFAULT_CATEGORY = 'Uncategorized';

function parseStock(stock) {
    if (stock === undefined || stock === null || stock === '') {
        return null;
    }

    const stockNumber = Number(stock);

    if (!Number.isInteger(stockNumber) || stockNumber < 0) {
        return NaN;
    }

    return stockNumber;
}

function parseCategory(category) {
    if (category === undefined || category === null || String(category).trim() === '') {
        return null;
    }

    return String(category).trim();
}

app.post('/api/admin/products', requireAdmin, (req, res) => {
    const { name, price } = req.body;

    if (!name || !price) {
        return res.status(400).json({ error: 'Name and price are required.'});
    }

    let stockNumber = parseStock(req.body.stock);

    if (Number.isNaN(stockNumber)) {
        return res.status(400).json({ error: 'Stock must be a whole number of 0 or more.' });
    }

    if (stockNumber === null) {
        stockNumber = DEFAULT_STOCK;
    }

    const categoryValue = parseCategory(req.body.category) || DEFAULT_CATEGORY;

    const existing = db.prepare('SELECT id FROM products WHERE name = ?').get(name);
    if (existing) {
        return res.status(409).json({error: 'A product with that name already exists.'});
    }

    const insert = db.prepare('INSERT INTO products (name, price, stock, category) VALUES (?, ?, ?, ?)');
    const result = insert.run(name, price, stockNumber, categoryValue);

    res.status(201).json({
        id: result.lastInsertRowid,
        name: name,
        price: price,
        stock: stockNumber,
        category: categoryValue
    });
});

app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const { name, price } = req.body;

    if (!name || !price) {
        return res.status(400).json({ error: 'Name and price are required.' });
    }

    const existingProduct = db.prepare('SELECT stock, category FROM products WHERE id = ?').get(id);

    if (!existingProduct) {
        return res.status(404).json({ error: 'Product not found'});
    }

    let stockNumber = parseStock(req.body.stock);

    if (Number.isNaN(stockNumber)) {
        return res.status(400).json({ error: 'Stock must be a whole number of 0 or more.' });
    }

    // Stock/category left unspecified on an edit keep whatever they already
    // were, rather than silently resetting them.
    if (stockNumber === null) {
        stockNumber = existingProduct.stock;
    }

    const categoryValue = parseCategory(req.body.category) || existingProduct.category;

    const existingNameClash = db.prepare('SELECT id FROM products WHERE name = ? AND id != ?').get(name, id);
    if (existingNameClash) {
        return res.status(409).json({ error: 'A product with that name already exists.'});
    }

    const update = db.prepare('UPDATE products SET name = ?, price = ?, stock = ?, category = ? WHERE id = ?');
    update.run(name, price, stockNumber, categoryValue, id);

    res.json({ id, name, price, stock: stockNumber, category: categoryValue });
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ message: 'Product deleted.'});
});

// Thrown from inside the orders transaction below to reject the whole order
// (and roll back any stock already decremented for earlier items in the
// same order) with a specific status/message, without special-casing
// db.transaction()'s return value.
class OrderValidationError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

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


    // Look up products, reserve stock, and create the order + order items
    // all inside one transaction so a stock failure partway through a
    // multi-item order rolls back everything that came before it - nothing
    // gets decremented for an order that ultimately doesn't go through.
    const createOrder = db.transaction(() => {

        let total = 0;
        const orderItems = [];

        for (const item of items) {

            const product = db
                .prepare(
                    'SELECT id, name, price FROM products WHERE id = ?'
                )
                .get(item.productId);

            if (!product) {
                throw new OrderValidationError(
                    404,
                    `Product with ID ${item.productId} not found.`
                );
            }

            const quantity = Number(item.quantity) || 1;

            // Atomic check-and-decrement: the WHERE clause only lets this
            // succeed if there's still enough stock, so two orders racing
            // for the last units can't both succeed.
            const decrement = db
                .prepare(
                    'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?'
                )
                .run(quantity, product.id, quantity);

            if (decrement.changes === 0) {
                const current = db
                    .prepare('SELECT stock FROM products WHERE id = ?')
                    .get(product.id);

                throw new OrderValidationError(
                    409,
                    `Only ${current.stock} left in stock for ${product.name}.`
                );
            }

            total += product.price * quantity;

            orderItems.push({
                productId: product.id,
                productName: product.name,
                price: product.price,
                quantity
            });
        }


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


        return { orderId, total };
    });


    try {

        const { orderId, total } = createOrder();

        res.status(201).json({
            message: 'Order placed successfully.',
            orderId,
            total
        });

    } catch (err) {

        if (err instanceof OrderValidationError) {
            return res.status(err.status).json({ error: err.message });
        }

        throw err;
    }

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

