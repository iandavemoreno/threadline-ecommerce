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

app.get('/api/products/:id', (req, res) => {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);

    if (!product) {
        return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
});

app.get('/api/products/:id/reviews', (req, res) => {
    const product = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id);

    if (!product) {
        return res.status(404).json({ error: 'Product not found' });
    }

    const reviews = db.prepare(`
        SELECT id, reviewer_email, rating, comment, created_at
        FROM reviews
        WHERE product_id = ?
        ORDER BY created_at DESC
    `).all(product.id);

    const reviewCount = reviews.length;

    const averageRating = reviewCount === 0
        ? null
        : Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount) * 10) / 10;

    res.json({
        reviews: reviews.map((r) => ({
            id: r.id,
            reviewerEmail: r.reviewer_email,
            rating: r.rating,
            comment: r.comment,
            createdAt: r.created_at
        })),
        averageRating: averageRating,
        reviewCount: reviewCount
    });
});

// requireLoggedInUser is defined further down (with the profile routes) -
// function declarations are hoisted, so it's already available here.
app.post('/api/products/:id/reviews', requireLoggedInUser, (req, res) => {
    const product = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id);

    if (!product) {
        return res.status(404).json({ error: 'Product not found' });
    }

    const rating = Number(req.body.rating);

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be a whole number from 1 to 5.' });
    }

    const comment = req.body.comment !== undefined ? String(req.body.comment).trim() : '';
    const user = req.currentUser;

    // One review per user per product: submitting again is a real edit
    // (rating/comment/timestamp all update), not a second row - checking
    // for an existing review first also lets the response tell the caller
    // whether this created a new review or updated theirs.
    const existingReview = db
        .prepare('SELECT id FROM reviews WHERE product_id = ? AND user_id = ?')
        .get(product.id, user.id);

    db.prepare(`
        INSERT INTO reviews (product_id, user_id, reviewer_email, rating, comment)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(product_id, user_id) DO UPDATE SET
            rating = excluded.rating,
            comment = excluded.comment,
            created_at = CURRENT_TIMESTAMP
    `).run(product.id, user.id, user.email, rating, comment);

    const saved = db
        .prepare('SELECT id, reviewer_email, rating, comment, created_at FROM reviews WHERE product_id = ? AND user_id = ?')
        .get(product.id, user.id);

    res.status(existingReview ? 200 : 201).json({
        id: saved.id,
        reviewerEmail: saved.reviewer_email,
        rating: saved.rating,
        comment: saved.comment,
        createdAt: saved.created_at,
        updated: !!existingReview
    });
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

// Same X-User-Email convention as requireAdmin, but for any logged-in
// account rather than admins only - used by the profile routes below.
// Stashes the looked-up row on req.currentUser so route handlers don't
// each re-query it.
function requireLoggedInUser(req, res, next) {
    const userEmail = req.headers['x-user-email'];

    if (!userEmail) {
        return res.status(401).json({ error: 'Not logged in.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(userEmail);

    if (!user) {
        return res.status(404).json({ error: 'User not found.' });
    }

    req.currentUser = user;
    next();
}

app.get('/api/profile', requireLoggedInUser, (req, res) => {
    const user = req.currentUser;

    res.json({
        email: user.email,
        role: user.role,
        defaultName: user.default_name,
        defaultAddress: user.default_address
    });
});

app.put('/api/profile', requireLoggedInUser, (req, res) => {
    const user = req.currentUser;

    const defaultName = req.body.defaultName !== undefined
        ? String(req.body.defaultName).trim()
        : user.default_name;

    const defaultAddress = req.body.defaultAddress !== undefined
        ? String(req.body.defaultAddress).trim()
        : user.default_address;

    db.prepare('UPDATE users SET default_name = ?, default_address = ? WHERE id = ?')
        .run(defaultName, defaultAddress, user.id);

    res.json({
        email: user.email,
        role: user.role,
        defaultName: defaultName,
        defaultAddress: defaultAddress
    });
});

app.put('/api/profile/password', requireLoggedInUser, (req, res) => {
    const user = req.currentUser;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new password are required.' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    bcrypt.compare(currentPassword, user.password, (err, matches) => {
        if (err) {
            return res.status(500).json({ error: 'Something went wrong changing your password.' });
        }

        if (!matches) {
            return res.status(401).json({ error: 'Current password is incorrect.' });
        }

        bcrypt.hash(newPassword, 10, (hashErr, hashedPassword) => {
            if (hashErr) {
                return res.status(500).json({ error: 'Something went wrong changing your password.' });
            }

            db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, user.id);

            res.json({ message: 'Password updated successfully.' });
        });
    });
});

// Products created without a stock/category value (e.g. older API
// callers/tests that predate these fields) default to these rather than
// being rejected.
const DEFAULT_STOCK = 10;
const DEFAULT_CATEGORY = 'Uncategorized';
const DEFAULT_DESCRIPTION = '';

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

// Unlike parseCategory, an explicit empty string here is a real value ("no
// description") rather than "not provided" - only an entirely missing key
// means "leave whatever it already was" on an update.
function parseDescription(description) {
    if (description === undefined || description === null) {
        return null;
    }

    return String(description).trim();
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
    const descriptionValue = parseDescription(req.body.description);
    const finalDescription = descriptionValue === null ? DEFAULT_DESCRIPTION : descriptionValue;

    const existing = db.prepare('SELECT id FROM products WHERE name = ?').get(name);
    if (existing) {
        return res.status(409).json({error: 'A product with that name already exists.'});
    }

    const insert = db.prepare('INSERT INTO products (name, price, stock, category, description) VALUES (?, ?, ?, ?, ?)');
    const result = insert.run(name, price, stockNumber, categoryValue, finalDescription);

    res.status(201).json({
        id: result.lastInsertRowid,
        name: name,
        price: price,
        stock: stockNumber,
        category: categoryValue,
        description: finalDescription
    });
});

app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const { name, price } = req.body;

    if (!name || !price) {
        return res.status(400).json({ error: 'Name and price are required.' });
    }

    const existingProduct = db.prepare('SELECT stock, category, description FROM products WHERE id = ?').get(id);

    if (!existingProduct) {
        return res.status(404).json({ error: 'Product not found'});
    }

    let stockNumber = parseStock(req.body.stock);

    if (Number.isNaN(stockNumber)) {
        return res.status(400).json({ error: 'Stock must be a whole number of 0 or more.' });
    }

    // Stock/category/description left unspecified on an edit keep whatever
    // they already were, rather than silently resetting them. Description
    // is the one exception where an explicitly-sent empty string is a real
    // value (clearing it) rather than "not provided" - see parseDescription.
    if (stockNumber === null) {
        stockNumber = existingProduct.stock;
    }

    const categoryValue = parseCategory(req.body.category) || existingProduct.category;

    const descriptionValue = parseDescription(req.body.description);
    const finalDescription = descriptionValue === null ? existingProduct.description : descriptionValue;

    const existingNameClash = db.prepare('SELECT id FROM products WHERE name = ? AND id != ?').get(name, id);
    if (existingNameClash) {
        return res.status(409).json({ error: 'A product with that name already exists.'});
    }

    const update = db.prepare('UPDATE products SET name = ?, price = ?, stock = ?, category = ?, description = ? WHERE id = ?');
    update.run(name, price, stockNumber, categoryValue, finalDescription, id);

    res.json({ id, name, price, stock: stockNumber, category: categoryValue, description: finalDescription });
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ message: 'Product deleted.'});
});

// Looks up a coupon by code (case-insensitive) so checkout can show the
// discount before the order is actually placed. The order itself
// re-validates the code server-side rather than trusting whatever the
// client displayed - this endpoint is for UI feedback only.
function findActiveCoupon(code) {
    if (!code || String(code).trim() === '') {
        return null;
    }

    const coupon = db
        .prepare('SELECT code, discount_percent, active FROM coupons WHERE UPPER(code) = ?')
        .get(String(code).trim().toUpperCase());

    if (!coupon || !coupon.active) {
        return null;
    }

    return coupon;
}

app.get('/api/coupons/:code', (req, res) => {
    const coupon = findActiveCoupon(req.params.code);

    if (!coupon) {
        return res.status(404).json({ error: 'Invalid or inactive coupon code.' });
    }

    res.json({ code: coupon.code, discountPercent: coupon.discount_percent });
});

app.get('/api/admin/coupons', requireAdmin, (req, res) => {
    const coupons = db.prepare('SELECT id, code, discount_percent,active FROM coupons ORDER BY code ASC').all();
    res.json(coupons);
});

app.post ('/api/admin/coupons', requireAdmin, (req, res) => {
    const { code, discountPercent } = req.body;

    if (!code || !discountPercent) {
        return res.status(400).json({ error: 'Code and discount percent are required.'});
    }

    const discountNumber = Number(discountPercent);

    if (!Number.isInteger(discountNumber) || discountNumber < 1 || discountNumber > 100) {
        return res.status(400).json({ error: 'Discount percent must be a whole number between  1 and 100.'});
    }

    const codeValue = String(code).trim().toUpperCase();

    if (!codeValue) {
        return res.status(400).json({error: 'Code and discount percent are required.'});
    }

    const existing = db.prepare('SELECT id FROM coupons WHERE UPPER(code) = ?').get(codeValue);
    if (existing) {
        return res.status(409),json({ error: 'A coupon with that code already exists.'});
    }

    const insert = db.prepare('INSERT INTO coupons (code, discount_percent, active) VALUES (?, ?, 1)');
    const result = insert.run(codeValue, discountNumber);

    res.status(201).json({
        id: result.lastInsertRowid,
        code: codeValue,
        discount_percent: discountNumber,
        active: 1
    });
})

app.put('/api/admin/coupons/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const { code, discountPercent, active } = req.body;

    const existingCoupon = db.prepare('SELECT * FROM coupons WHERE id = ?').get(id);
    if (!existingCoupon) {
        return res.status(404).json({ error: 'Coupon not found.'});
    }

    let codeValue = existingCoupon.code;
    if(code !== undefined) {
        codeValue = String(code).trim().toUpperCase();
        if (!codeValue) {
            return res.status(400).json({ error: 'Code cannot be empty. '});
        }
        
        const clash = db.prepare('SELECT id FROM coupons WHERE UPPER(code) =? AND id != ?').get(codeValue, id);
        if(clash) {
            return res.status(409).json({ error: 'A coupon with that code already exists.'});
        }
    }

    let discountValue = existingCoupon.discount_percent;
    if (discountPercent !== undefined) {
        const discountNumber = Number(discountPercent);
        if (!Number.isInteger(discountNumber) || discountNumber < 1 || discountNumber > 100) {
            return res.status(400).json({ error: 'Discount percent must be a whole number between 1 and 100. '});
        }
        discountValue = discountNumber;
    }

    let activeValue = existingCoupon.active;
    if (active !== undefined) {
        activeValue = active ? 1 : 0;
    }

    db.prepare('UPDATE coupons SET code = ?, discount_percent = ?, active = ? WHERE id = ?')
        .run(codeValue, discountValue, activeValue, id);

        res.json({ id: Number(id), code: codeValue, discount_percent: discountValue, active: activeValue});
});

app.delete('/api/admin/coupons/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    db.prepare('DELETE FROM coupons WHERE id = ?').run(id);
    res.json({ message: 'Coupon deleted.'});
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
        items,
        couponCode
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

        let subtotal = 0;
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

            subtotal += product.price * quantity;

            orderItems.push({
                productId: product.id,
                productName: product.name,
                price: product.price,
                quantity
            });
        }


        // Re-validate the coupon against the database here rather than
        // trusting a discount amount computed on the client - the same
        // principle as the stock check above.
        let discountAmount = 0;
        let appliedCouponCode = null;

        if (couponCode) {
            const coupon = findActiveCoupon(couponCode);

            if (!coupon) {
                throw new OrderValidationError(
                    400,
                    'That coupon code is invalid or no longer active.'
                );
            }

            discountAmount = Math.round(subtotal * (coupon.discount_percent / 100) * 100) / 100;
            appliedCouponCode = coupon.code;
        }

        const total = subtotal - discountAmount;


        const orderResult = db
            .prepare(`
                INSERT INTO orders (
                    user_id,
                    customer_name,
                    email,
                    address,
                    total,
                    coupon_code,
                    discount_amount
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `)
            .run(
                user.id,
                customerName,
                email,
                address,
                total,
                appliedCouponCode,
                discountAmount
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


        return { orderId, total, discountAmount, couponCode: appliedCouponCode };
    });


    try {

        const { orderId, total, discountAmount, couponCode: appliedCouponCode } = createOrder();

        res.status(201).json({
            message: 'Order placed successfully.',
            orderId,
            total,
            discountAmount,
            couponCode: appliedCouponCode
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
            SELECT id, customer_name, email, address, total, coupon_code, discount_amount, status, created_at
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

// Allowed order statuses for PUT /api/admin/orders/:id/status - kept as a
// single source of truth so the validation list below can't quietly drift
// from what the admin UI's dropdown actually offers.
const ORDER_STATUSES = ['Pending', 'Shipped', 'Delivered', 'Cancelled'];

app.get('/api/admin/orders', requireAdmin, (req, res) => {
    const orders = db.prepare(`
        SELECT id, customer_name, email, address, total, coupon_code, discount_amount, status, created_at
        FROM orders
        ORDER BY created_at DESC
        `)
        .all();

    const getItems = db.prepare(
        'SELECT product_id, product_name, price, quantity FROM order_items WHERE order_id = ?'
        );

    const ordersWithItems = orders.map((order) => ({
        ...order,
        items: getItems.all(order.id)
    }));

    res.json(ordersWithItems);
});

app.put('/api/admin/orders/:id/status', requireAdmin, (req, res) => {
    const { status } = req.body;

    if (!ORDER_STATUSES.includes(status)) {
        return res.status(400).json({
            error: `Status must be one of : ${ORDER_STATUSES.join(', ')}.`
        });
    }

    const order = db.prepare(`SELECT id FROM orders WHERE id = ?`).get(req.params.id);

    if (!order) {
        return res.status(404).json({ error: 'Order not found.' });
    }

    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, order.id);

    res.json({ id: order.id, status});
});

app.listen(PORT, () => {
    console.log('Server running at http://localhost:' + PORT);
});

