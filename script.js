// Show a "My Orders" link for any logged-in user, and an Admin link on top
// of that for admins
const loggedInUserNav = JSON.parse(localStorage.getItem('loggedInUser') || 'null');
if (loggedInUserNav) {
  const nav = document.querySelector('header nav');
  if (nav) {
    const ordersLink = document.createElement('a');
    ordersLink.href = 'orders.html';
    ordersLink.textContent = 'My Orders';
    nav.appendChild(ordersLink);

    if (loggedInUserNav.role === 'admin') {
      const adminLink = document.createElement('a');
      adminLink.href = 'admin.html';
      adminLink.textContent = 'Admin';
      nav.appendChild(adminLink);
    }
  }
}

function loadProducts() {
    const listEl = document.getElementById('product-list');

    if (!listEl) return;

    const searchInput = document.getElementById('product-search');
    const searchBtn = document.getElementById('search-btn');
    const clearBtn = document.getElementById('clear-search-btn');
    const categoryFilter = document.getElementById('category-filter');
    const noProductsMessage = document.getElementById('no-products-message');

    let allProducts = [];

    fetch('http://localhost:3000/api/products')
        .then(function (response) {
            return response.json();
        })
        .then(function (products) {

            allProducts = products;

            // Populate the category filter from whatever categories
            // actually exist in the catalog, rather than a hardcoded list -
            // new categories created through the admin panel just show up.
            // loadProducts() re-runs after every addToCart (for the live
            // stock countdown), so this rebuilds the option list from
            // scratch each time rather than appending onto itself, and
            // restores whatever was previously selected so the filter
            // doesn't silently reset on every add-to-cart click.
            if (categoryFilter) {

                const previousSelection = categoryFilter.value;

                categoryFilter.innerHTML = '<option value="">All Categories</option>';

                const categories = Array.from(
                    new Set(allProducts.map(function (product) {
                        return product.category;
                    }))
                ).sort();

                categories.forEach(function (category) {
                    const option = document.createElement('option');
                    option.value = category;
                    option.textContent = category;
                    categoryFilter.appendChild(option);
                });

                if (categories.indexOf(previousSelection) !== -1) {
                    categoryFilter.value = previousSelection;
                }
            }

            // Search and category filter combine - e.g. searching "Black"
            // within the "T-Shirts" category only matches products that
            // satisfy both at once.
            function applyFilters() {

                const searchTerm = (searchInput ? searchInput.value : '')
                    .trim()
                    .toLowerCase();

                const selectedCategory = categoryFilter ? categoryFilter.value : '';

                const filtered = allProducts.filter(function (product) {

                    const matchesSearch = product.name
                        .toLowerCase()
                        .includes(searchTerm);

                    const matchesCategory =
                        !selectedCategory || product.category === selectedCategory;

                    return matchesSearch && matchesCategory;
                });

                displayProducts(filtered);
            }

            function displayProducts(productsToDisplay) {

                let html = '';

                if (productsToDisplay.length === 0) {
                    listEl.innerHTML = '';
                    noProductsMessage.style.display = 'block';
                    return;
                }

                noProductsMessage.style.display = 'none';

                productsToDisplay.forEach(function (product) {

                    html += '<div class="product">';

                    html += '<h3>' + product.name + '</h3>';

                    html += '<p class="product-category">' + product.category + '</p>';

                    html += '<p class="product-price">$' + product.price.toFixed(2) + '</p>';

                    // How many of this product are already sitting in the
                    // cart - "remaining" is what's left to add, and it
                    // recalculates on every render (loadProducts() re-runs
                    // after each addToCart), so the count updates live as
                    // you click. The backend's own check at checkout time is
                    // still the actual source of truth.
                    const inCartCount = getCart().filter(function (item) {
                        return item.productId === product.id;
                    }).length;

                    const remaining = product.stock - inCartCount;

                    if (product.stock === 0) {
                        html += '<p class="stock-message out-of-stock">Out of stock</p>';
                    } else if (remaining <= 0) {
                        html += '<p class="stock-message">All ' + product.stock + ' in stock are already in your cart</p>';
                    } else {
                        html += '<p class="stock-message">' + remaining + ' in stock</p>';
                    }

                    html += '<button' + (remaining > 0 ? '' : ' disabled') +
                        ' onclick="addToCart(' +
                        product.id +
                        ', \'' +
                        product.name.replace(/'/g, "\\'") +
                        '\', ' +
                        product.price +
                        ')">Add to Cart</button>';

                    html += '</div>';
                });

                listEl.innerHTML = html;
            }


            // Display all products when the page loads
            applyFilters();


            // Search button
            if (searchBtn) {
                searchBtn.addEventListener('click', function () {
                    applyFilters();
                });
            }


            // Search when pressing Enter
            if (searchInput) {
                searchInput.addEventListener('keydown', function (event) {

                    if (event.key === 'Enter') {
                        searchBtn.click();
                    }

                });
            }


            // Clear search text only - the category filter (if any) stays
            // applied, matching what "Clear" is labeled next to.
            if (clearBtn) {
                clearBtn.addEventListener('click', function () {

                    searchInput.value = '';

                    applyFilters();

                    searchInput.focus();
                });
            }


            // Category filter
            if (categoryFilter) {
                categoryFilter.addEventListener('change', function () {
                    applyFilters();
                });
            }

        })
        .catch(function () {

            listEl.innerHTML =
                '<p>Unable to load products. Is the backend running?</p>';

        });
}

loadProducts();

function getCart() {
  const cartData = localStorage.getItem('cart');
  return cartData ? JSON.parse(cartData) : [];
}

function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function addToCart(id, name, price) {
  const cart = getCart();
  cart.push({ productId: id, name: name, price: price });
  saveCart(cart);
  updateCartCount();
  showToast(name + ' added to cart!');
  // Re-render so the stock message/button reflect what's now in the cart
  loadProducts();
}

function updateCartCount() {
  const cart = getCart();
  const countEl = document.getElementById('cart-count');
  if (countEl) {
    countEl.textContent = cart.length;
  }
}

updateCartCount();

function renderCart() {
  const cartItemsEl = document.getElementById('cart-items');
  if (!cartItemsEl) return; // we're not on the cart page, do nothing

  const cart = getCart();

  if (cart.length === 0) {
    cartItemsEl.innerHTML = '<p>Your cart is empty.</p>';
    document.getElementById('cart-total').textContent = '';
    document.getElementById('checkout-btn').disabled = true;
    document.getElementById('checkout-link').style.pointerEvents = 'none';
    return;
  }

  // Cart has items, so enable checkout
  document.getElementById('checkout-btn').disabled = false;
  document.getElementById('checkout-link').style.pointerEvents = 'auto';

  let html = '';
  let total = 0;

  cart.forEach(function (item, index) {
    html += '<div class="product">';
    html += '<h3>' + item.name + '</h3>';
    html += '<p>$' + item.price.toFixed(2) + '</p>';
    html += '<button onclick="removeFromCart(' + index + ')">Remove</button>';
    html += '</div>';
    total += item.price;
  });

  cartItemsEl.innerHTML = html;
  document.getElementById('cart-total').textContent = 'Total: $' + total.toFixed(2);
}

let itemToRemove = null;

function removeFromCart(index) {
    const cart = getCart();
    const product = cart[index];

    if (!product) {
        return;
    }

    itemToRemove = index;

    const modal = document.getElementById('remove-modal');
    const message = document.getElementById('remove-message');

    if (modal && message) {
        message.textContent =
            'Are you sure you want to remove "' + product.name + '" from your cart?';

        modal.classList.add('show');
    }
}

renderCart();

function validateCheckoutForm(name, email,address) {
  let isValid = true;

  document.getElementById('name-error').textContent = '';
  document.getElementById('email-error').textContent = '';
  document.getElementById('address-error').textContent = '';

  if (name.trim() === '') {
    document.getElementById('name-error').textContent = 'Name is required.';
    isValid = false;
  }

  if (!email.includes('@') || !email.includes('.')) {
    document.getElementById('email-error').textContent = 'Enter a valid email.';
    isValid = false;
  }

  if (address.trim() === '') {
    document.getElementById('address-error').textContent = 'Address is required.';
    isValid = false;
  }

  return isValid;
}

// Coupon codes at checkout. appliedCoupon is only ever set from a
// successful /api/coupons/:code response - the discount shown here is for
// UI feedback only, since the order itself re-validates the code and
// recalculates the discount server-side rather than trusting this value.
// Declared here (before it's first read below) because `let` bindings,
// unlike function declarations, aren't usable before their own line runs -
// referencing it any earlier throws a ReferenceError and stops the rest of
// the script from executing on this page.
let appliedCoupon = null;

// Checkout requires being logged in - the account is what "My Orders" later
// looks up orders by, so the email field is locked to it rather than
// free-typed.
const checkoutAccessMessage = document.getElementById('checkout-access-message');

if (checkoutAccessMessage) {
  const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser') || 'null');

  if (!loggedInUser) {
    checkoutAccessMessage.textContent = 'You must be logged in to check out.';
  } else {
    document.getElementById('checkout-content').style.display = 'block';

    const emailInput = document.getElementById('email');
    if (emailInput) {
      emailInput.value = loggedInUser.email;
      emailInput.readOnly = true;
    }

    renderOrderSummary();
  }
}

function renderOrderSummary() {
  const summaryEl = document.getElementById('order-summary');
  if (!summaryEl) return;

  const cart = getCart();
  const subtotal = cart.reduce(function (sum, item) { return sum + item.price; }, 0);
  const discountAmount = appliedCoupon
    ? Math.round(subtotal * (appliedCoupon.discountPercent / 100) * 100) / 100
    : 0;
  const total = subtotal - discountAmount;

  document.getElementById('summary-subtotal').textContent = subtotal.toFixed(2);

  const discountRow = document.getElementById('summary-discount-row');
  if (discountAmount > 0) {
    discountRow.style.display = 'block';
    document.getElementById('summary-discount').textContent = discountAmount.toFixed(2);
  } else {
    discountRow.style.display = 'none';
  }

  document.getElementById('summary-total').textContent = total.toFixed(2);
}

const applyCouponBtn = document.getElementById('apply-coupon-btn');

if (applyCouponBtn) {
  applyCouponBtn.addEventListener('click', function () {
    const couponMessage = document.getElementById('coupon-message');
    const code = document.getElementById('coupon-code').value.trim();

    couponMessage.textContent = '';
    couponMessage.className = '';

    if (!code) {
      appliedCoupon = null;
      couponMessage.textContent = 'Enter a promo code first.';
      couponMessage.className = 'error';
      renderOrderSummary();
      return;
    }

    fetch('http://localhost:3000/api/coupons/' + encodeURIComponent(code))
      .then(function (response) {
        return response.json().then(function (data) {
          return { status: response.status, data: data };
        });
      })
      .then(function (result) {
        if (result.status === 200) {
          appliedCoupon = { code: result.data.code, discountPercent: result.data.discountPercent };
          couponMessage.textContent =
            'Applied "' + appliedCoupon.code + '" - ' + appliedCoupon.discountPercent + '% off.';
          couponMessage.className = 'coupon-success';
        } else {
          appliedCoupon = null;
          couponMessage.textContent = result.data.error || 'Invalid coupon code.';
          couponMessage.className = 'error';
        }
        renderOrderSummary();
      })
      .catch(function () {
        appliedCoupon = null;
        couponMessage.textContent = 'Something went wrong. Is the backend running?';
        couponMessage.className = 'error';
        renderOrderSummary();
      });
  });
}

const checkoutForm = document.getElementById('checkout-form');

if (checkoutForm) {
  checkoutForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const cart = getCart();
    if (cart.length === 0) {
      document.getElementById('order-confirmation').innerHTML = '<p class="error"> Your cart is empty. Add items before checking out.</p>';
      return;
    }

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const address = document.getElementById('address').value;

    const isValid = validateCheckoutForm(name, email, address);

    if (!isValid) return;

    const items = cart.map(function (item) {
      return { productId: item.productId, quantity: 1 };
    });

    fetch('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        customerName: name,
        address: address,
        items: items,
        couponCode: appliedCoupon ? appliedCoupon.code : null
      })
    })
    .then(function (response) {
      return response.json().then(function (data) {
        return { status: response.status, data: data };
      });
    })
    .then(function (result) {
      if (result.status === 201) {
        localStorage.removeItem('cart');
        updateCartCount();
        checkoutForm.style.display = 'none';
        document.getElementById('order-summary').style.display = 'none';

        let confirmationHtml = '<p> Thank you, ' + name + '! Your order has been placed. </p>';

        if (result.data.discountAmount > 0) {
          confirmationHtml +=
            '<p>Discount applied (' + result.data.couponCode + '): -$' +
            result.data.discountAmount.toFixed(2) + '</p>';
        }

        confirmationHtml += '<p class="order-total">Total: $' + result.data.total.toFixed(2) + '</p>';

        document.getElementById('order-confirmation').innerHTML = confirmationHtml;
      } else {
        document.getElementById('order-confirmation').innerHTML =
          '<p class="error">' + (result.data.error || 'Something went wrong placing your order.') + '</p>';
      }
    })
    .catch(function () {
      document.getElementById('order-confirmation').innerHTML =
        '<p class="error">Something went wrong. Is the backend running?</p>';
    });
  });
}

const signupForm = document.getElementById('signup-form');

if (signupForm) {
    signupForm.addEventListener('submit', function (event) {
        event.preventDefault();

        document.getElementById('signup-email-error').textContent = '';
        document.getElementById('signup-password-error').textContent = '';
        document.getElementById('signup-form-error').textContent = '';

        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;

        let hasError = false;
        if (!email.includes('@') || !email.includes('.')) {
            document.getElementById('signup-email-error').textContent = 'Enter a valid email.';
            hasError = true;
        }
        if (password.length < 6) {
            document.getElementById('signup-password-error').textContent = 'Password must be at least 6 characters.';
            hasError = true;
        }
        if (hasError) return;

        fetch('http://localhost:3000/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: password})
        })
        .then(function (response) {
            return response.json().then(function(data) {
                return {status: response.status, data: data};
            });
        })
        .then(function (result) {
            if (result.status === 201) {
                window.location.href = 'login.html';
            } else {
                document.getElementById('signup-form-error').textContent = result.data.error;
            }
        })
        .catch(function() {
            document.getElementById('signup-form-error').textContent = 'Something went wrong. Is the backend running?';
        });
    });
    }

const loginForm = document.getElementById('login-form');

if (loginForm) {
    loginForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        const emailError = document.getElementById('login-email-error');
        const passwordError = document.getElementById('login-password-error');
        const formError = document.getElementById('login-form-error');

        emailError.textContent = '';
        passwordError.textContent = '';
        formError.textContent = '';

        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        try {
            const response = await fetch('http://127.0.0.1:3000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem(
                    'loggedInUser',
                    JSON.stringify(data)
                );

                window.location.assign('index.html');
                return;
            }

            formError.textContent = data.error || 'Login failed.';

        } catch (error) {
            console.error('Login request failed:', error);

            formError.textContent =
                'Something went wrong. Is the backend running?';
        }
    });
}

// Signout
const signoutBtn = document.getElementById('signout-btn');

if (signoutBtn) {
  signoutBtn.addEventListener('click', function () {
    localStorage.removeItem('loggedInUser');
    window.location.href = 'login.html';
  });
}

const adminAccessMessage = document.getElementById('admin-access-message');

if (adminAccessMessage){
  const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser') || 'null');

if (!loggedInUser || loggedInUser.role !== 'admin') {
  adminAccessMessage.textContent = 'You must be logged in as an admin to view this page.';
} else {
  document.getElementById('admin-content').style.display = "block";
  loadAdminProducts();

  document.getElementById('add-product-form').addEventListener('submit', function (event) {
    event.preventDefault();

    const name = document.getElementById('product-name').value;
    const price = parseFloat(document.getElementById('product-price').value);
    const stock = parseInt(document.getElementById('product-stock').value, 10);
    const category = document.getElementById('product-category').value.trim();
    const errorEl = document.getElementById('add-product-error');
    errorEl.textContent = '';

    if (!name || isNaN(price) || isNaN(stock) || stock < 0) {
      errorEl.textContent = 'Enter a valid name, price, and stock.';
      return;
    }

    fetch('http://localhost:3000/api/admin/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Email': loggedInUser.email
      },
      body: JSON.stringify({ name: name, price: price, stock: stock, category: category})
    })
    .then(function (response){
      return response.json().then(function (data) {
        return {status: response.status, data: data };
      });
    })
    .then(function (result) {
      if (result.status === 201) {
        document.getElementById('product-name').value = '';
        document.getElementById('product-price').value = '';
        document.getElementById('product-stock').value = '';
        document.getElementById('product-category').value = '';
        errorEl.textContent = '';
        showToast('Product added successfully.');
        loadAdminProducts();
      } else {
        errorEl.textContent = result.data.error;
      }
    });
  });
}
}

function showToast(message, isError){
  const toastEl = document.getElementById('toast');
  if(!toastEl) return;

  toastEl.textContent = message;
  toastEl.className = 'toast toast-show' + (isError ? 'toast-error' : '');

  setTimeout(function(){
    toastEl.className = 'toast';
  },2500);
}

function loadAdminProducts() {
  const listEl = document.getElementById('admin-product-list');
  const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser') || 'null');

  fetch('http://localhost:3000/api/products')
  .then(function (response) {
    return response.json();
  })
  .then(function (products) {
    let html = '';
    products.forEach(function (product) {
      html += '<div class="product" id="product-row-' + product.id + '">';
      html += '<div class="product-view">';
      html += '<h3>' + product.name + '</h3>';
      html += '<p>$' + product.price.toFixed(2) + ' (ID: ' + product.id + ') - Stock: ' + product.stock + ' - Category: ' + product.category + '</p>';
      html += '<button type="button" onclick="editAdminProduct(' + product.id + ', \'' + product.name.replace(/'/g, "\\'") + '\', ' + product.price + ', ' + product.stock + ', \'' + product.category.replace(/'/g, "\\'") + '\')">Edit</button>';
      html += '<button type="button" onclick="deleteAdminProduct(' + product.id + ')">Delete</button>';
      html += '</div>';
      html += '</div>';
    });
    listEl.innerHTML = html;
  });
}

function editAdminProduct(id, currentName, currentPrice, currentStock, currentCategory) {
  const rowEl = document.getElementById('product-row-' + id);
  rowEl.innerHTML =
    '<div class="form-group">' +
      '<label>Name</label>' +
      '<input type="text" id="edit-name-' + id + '" value="' + currentName.replace(/"/g, '&quot;') + '">' +
    '</div>' +
    '<div class="form-group">' +
      '<label>Price</label>' +
      '<input type="text" id="edit-price-' + id + '" value="' + currentPrice + '">' +
    '</div>' +
    '<div class="form-group">' +
      '<label>Stock</label>' +
      '<input type="text" id="edit-stock-' + id + '" value="' + currentStock + '">' +
    '</div>' +
    '<div class="form-group">' +
      '<label>Category</label>' +
      '<input type="text" id="edit-category-' + id + '" value="' + currentCategory.replace(/"/g, '&quot;') + '">' +
    '</div>' +
    '<p class="error" id="edit-error-' + id + '"></p>' +
    '<button type="button" onclick="saveAdminProduct(' + id + ')">Save</button>' +
    '<button type="button" onclick="loadAdminProducts()">Cancel</button>';
}

function saveAdminProduct(id) {
  const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser') || 'null');
  const name = document.getElementById('edit-name-' + id).value;
  const price = parseFloat(document.getElementById('edit-price-' + id).value);
  const stock = parseInt(document.getElementById('edit-stock-' + id).value, 10);
  const category = document.getElementById('edit-category-' + id).value.trim();
  const errorEl = document.getElementById('edit-error-' + id);
  errorEl.textContent = '';

  if (!name || isNaN(price) || isNaN(stock) || stock < 0) {
    errorEl.textContent = 'Enter a valid name, price, and stock.';
    return;
  }

  fetch('http://localhost:3000/api/admin/products/' + id, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Email': loggedInUser.email
    },
    body: JSON.stringify({ name: name, price: price, stock: stock, category: category })
  })
  .then(function (response) {
    return response.json().then(function (data) {
      return { status: response.status, data: data };
    });
  })
  .then(function (result) {
    if (result.status === 200) {
      showToast('Product updated successfully.');
      loadAdminProducts();
    } else {
      errorEl.textContent = result.data.error;
    }
  })
  .catch(function () {
    errorEl.textContent = 'Something went wrong updating the product.';
  });
}

function deleteAdminProduct(id) {
  const confirmed = confirm('Are you sure you want to delete this product?');
  if(!confirmed) return;
  
  const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser') || 'null');

  fetch('http://localhost:3000/api/admin/products/' + id, {
    method: 'DELETE',
    headers: { 'X-User-Email': loggedInUser.email }
  })
  .then(function (response) {
    return response.json();
  })
  .then(function () {
    showToast('Product deleted.');
    loadAdminProducts();
  })
  .catch(function() {
    showToast('Something went wrong deleting the product.', true);
  });
}

const cancelRemoveBtn = document.getElementById('cancel-remove');
const confirmRemoveBtn = document.getElementById('confirm-remove');

if (cancelRemoveBtn) {
    cancelRemoveBtn.addEventListener('click', function () {
        document.getElementById('remove-modal').classList.remove('show');
        itemToRemove = null;
    });
}

if (confirmRemoveBtn) {
    confirmRemoveBtn.addEventListener('click', function () {

        if (itemToRemove === null) {
            return;
        }

        const cart = getCart();
        const product = cart[itemToRemove];

        if (!product) {
            return;
        }

        cart.splice(itemToRemove, 1);
        saveCart(cart);
        updateCartCount();

        document.getElementById('remove-modal').classList.remove('show');

        showToast(product.name + ' removed from cart!');

        itemToRemove = null;

        renderCart();
    });
}

// My Orders page
function loadOrders() {
  const listEl = document.getElementById('orders-list');
  if (!listEl) return;

  const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser') || 'null');
  const noOrdersMessage = document.getElementById('no-orders-message');

  fetch('http://localhost:3000/api/orders', {
    headers: { 'X-User-Email': loggedInUser.email }
  })
  .then(function (response) {
    return response.json();
  })
  .then(function (orders) {

    if (orders.length === 0) {
      listEl.innerHTML = '';
      noOrdersMessage.style.display = 'block';
      return;
    }

    noOrdersMessage.style.display = 'none';

    let html = '';

    orders.forEach(function (order) {
      html += '<div class="product order" id="order-' + order.id + '">';
      html += '<h3>Order #' + order.id + '</h3>';
      html += '<p>' + new Date(order.created_at).toLocaleString() + '</p>';
      html += '<p>Shipping to: ' + order.address + '</p>';
      html += '<ul>';

      order.items.forEach(function (item) {
        html += '<li>' + item.product_name + ' x' + item.quantity + ' - $' + item.price.toFixed(2) + '</li>';
      });

      html += '</ul>';

      if (order.discount_amount > 0) {
        html += '<p>Discount applied (' + order.coupon_code + '): -$' + order.discount_amount.toFixed(2) + '</p>';
      }

      html += '<p class="order-total">Total: $' + order.total.toFixed(2) + '</p>';
      html += '</div>';
    });

    listEl.innerHTML = html;
  })
  .catch(function () {
    listEl.innerHTML = '<p>Unable to load orders. Is the backend running?</p>';
  });
}

const ordersAccessMessage = document.getElementById('orders-access-message');

if (ordersAccessMessage) {
  const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser') || 'null');

  if (!loggedInUser) {
    ordersAccessMessage.textContent = 'You must be logged in to view your orders.';
  } else {
    document.getElementById('orders-content').style.display = 'block';
    loadOrders();
  }
}