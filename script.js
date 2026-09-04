if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(() => console.log('Service worker registered.'))
            .catch((error) => console.error('Service worker registration failed:', error));
    });
}
// Show "My Orders" and "My Profile" links for any logged-in user, and an
// Admin link on top of that for admins
const loggedInUserNav = JSON.parse(localStorage.getItem('loggedInUser') || 'null');
if (loggedInUserNav) {
  const nav = document.querySelector('header nav');
  if (nav) {
    const ordersLink = document.createElement('a');
    ordersLink.href = 'orders.html';
    ordersLink.textContent = 'My Orders';
    nav.appendChild(ordersLink);

    const profileLink = document.createElement('a');
    profileLink.href = 'profile.html';
    profileLink.textContent = 'My Profile';
    nav.appendChild(profileLink);

    if (loggedInUserNav.role === 'admin') {
      const adminLink = document.createElement('a');
      adminLink.href = 'admin.html';
      adminLink.textContent = 'Admin';
      nav.appendChild(adminLink);
    }
  }
}

// Minimal HTML escaping for free-text fields (currently just product
// description) that get rendered into innerHTML - keeps a description
// containing "<" or "&" from breaking the surrounding markup.
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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

    fetch('/api/products')
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

                    if (product.image_url) {
                      html += '<img class="product-image" src="' + product.image_url + '" alt="' + escapeHtml(product.name) + '">';
                    } else {
                      html += '<div class="product-image-placeholder">No Image</div>';
                    }

                    html += '<h3><a href="product.html?id=' + product.id + '">' + product.name + '</a></h3>';

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

// Product detail page (product.html?id=X). Guarded by #product-detail so
// this is a no-op on every other page.
function loadProductDetail() {
  const detailEl = document.getElementById('product-detail');
  if (!detailEl) return;

  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');

  if (!productId) {
    detailEl.innerHTML = '<p class="error">No product specified.</p>';
    return;
  }

  let currentProduct = null;

  function render() {
    if (!currentProduct) return;

    // Same live "how many can I still add" logic as the homepage cards -
    // recalculated on every render so it stays correct after Add to Cart.
    const inCartCount = getCart().filter(function (item) {
      return item.productId === currentProduct.id;
    }).length;

    const remaining = currentProduct.stock - inCartCount;

    let stockHtml;
    if (currentProduct.stock === 0) {
      stockHtml = '<p class="stock-message out-of-stock">Out of stock</p>';
    } else if (remaining <= 0) {
      stockHtml = '<p class="stock-message">All ' + currentProduct.stock + ' in stock are already in your cart</p>';
    } else {
      stockHtml = '<p class="stock-message">' + remaining + ' in stock</p>';
    }

    let html = '';

    if (currentProduct.image_url) {
      html += '<img class="product-detail-image" src="' + currentProduct.image_url + '" alt="' + escapeHtml(currentProduct.name) + '">';
    } else {
      html += '<div class="product-detail-image-placeholder">No Image</div>';
    }
    
    html += '<h2>' + currentProduct.name + '</h2>';
    html += '<p class="product-category">' + currentProduct.category + '</p>';
    html += '<p class="product-price">$' + currentProduct.price.toFixed(2) + '</p>';

    if (currentProduct.description) {
      html += '<p class="product-description">' +
        escapeHtml(currentProduct.description).replace(/\n/g, '<br>') +
        '</p>';
    }

    html += stockHtml;
    html += '<button id="detail-add-to-cart"' + (remaining > 0 ? '' : ' disabled') + '>Add to Cart</button>';

    detailEl.innerHTML = html;

    const addBtn = document.getElementById('detail-add-to-cart');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        addToCart(currentProduct.id, currentProduct.name, currentProduct.price);
        // addToCart() re-renders the homepage's own list (a no-op here
        // since #product-list doesn't exist on this page) - re-render this
        // page's own stock message/button state too.
        render();
      });
    }
  }

  fetch('/api/products/' + productId)
    .then(function (response) {
      if (response.status === 404) {
        detailEl.innerHTML = '<p class="error">Product not found.</p>';
        return null;
      }
      return response.json();
    })
    .then(function (product) {
      if (!product) return;
      currentProduct = product;
      render();
    })
    .catch(function () {
      detailEl.innerHTML = '<p>Unable to load product. Is the backend running?</p>';
    });
}

loadProductDetail();

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

    // Pre-fill from any saved default shipping info (Profile page) - a
    // fresh account has empty strings for both, so the truthy checks below
    // just leave the fields blank rather than overwriting anything. This
    // only pre-fills; the fields stay editable for this specific order.
    fetch('/api/profile', {
      headers: { 'X-User-Email': loggedInUser.email }
    })
      .then(function (response) { return response.json(); })
      .then(function (profile) {
        const nameInput = document.getElementById('name');
        const addressInput = document.getElementById('address');

        if (nameInput && profile.defaultName) {
          nameInput.value = profile.defaultName;
        }

        if (addressInput && profile.defaultAddress) {
          addressInput.value = profile.defaultAddress;
        }
      })
      .catch(function () {
        // No default shipping info to pre-fill with - not a hard failure,
        // the customer can just type their info in as before.
      });

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

    fetch('/api/coupons/' + encodeURIComponent(code))
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

    fetch('/api/orders', {
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

        fetch('/api/signup', {
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
            const response = await fetch('/api/login', {
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
  loadDashboard();
  loadAdminProducts();
  loadAdminOrders();
  loadAdminCoupons();

  document.getElementById('add-product-form').addEventListener('submit', function (event) {
    event.preventDefault();

    const name = document.getElementById('product-name').value;
    const price = parseFloat(document.getElementById('product-price').value);
    const stock = parseInt(document.getElementById('product-stock').value, 10);
    const category = document.getElementById('product-category').value.trim();
    const description = document.getElementById('product-description').value.trim();
    const errorEl = document.getElementById('add-product-error');
    errorEl.textContent = '';

    if (!name || isNaN(price) || isNaN(stock) || stock < 0) {
      errorEl.textContent = 'Enter a valid name, price, and stock.';
      return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('price', price);
    formData.append('stock', stock);
    formData.append('category', category);
    formData.append('description', description);

    const imageFile = document.getElementById('product-image').files[0];
    if (imageFile) {
      formData.append('image', imageFile);
    }

    fetch('/api/admin/products', {
      method: 'POST',
      headers: {
        'X-User-Email': loggedInUser.email
      },
      body: formData
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
        document.getElementById('product-description').value = '';
        document.getElementById('product-image').value = '';
        errorEl.textContent = '';
        showToast('Product added successfully.');
        loadAdminProducts();
      } else {
        errorEl.textContent = result.data.error;
      }
    });
  });

  document.getElementById('add-coupon-form').addEventListener('submit', function (event) {
    event.preventDefault();

    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser') || 'null');
    const code = document.getElementById('new-coupon-code').value;
    const discountPercent = parseInt(document.getElementById('new-coupon-discount').value, 10);

    if (!code || isNaN(discountPercent) || discountPercent < 1 || discountPercent > 100) {
      showToast('Enter a valid code and discount percent (1-100).', true);
      return;
    }

    fetch('/api/admin/coupons', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Email': loggedInUser.email
      },
      body: JSON.stringify({ code: code, discountPercent: discountPercent })
    })
    .then(function (response) {
      return response.json().then(function (data) {
        return { status: response.status, data: data };
      });
    })
    .then(function (result) {
      if (result.status === 201) {
        document.getElementById('new-coupon-code').value = '';
        document.getElementById('new-coupon-discount').value = '';
        showToast('Coupon added successfully.');
        loadAdminCoupons();
      } else {
        showToast(result.data.error || 'Something went wrong adding the coupon.', true);
      }
    });
  });
}
}

function showToast(message, isError){
  const toastEl = document.getElementById('toast');
  if(!toastEl) return;

  toastEl.textContent = message;
  toastEl.className = 'toast toast-show ' + (isError ? 'toast-error' : '');

  setTimeout(function(){
    toastEl.className = 'toast';
  },2500);
}

// Populated by loadAdminProducts() and read by editAdminProduct() below -
// looking the product up here instead of passing every field through the
// onclick string avoids having to escape a multi-line description into an
// HTML attribute.
let adminProductsCache = [];

function loadAdminProducts() {
  const listEl = document.getElementById('admin-product-list');
  const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser') || 'null');

  fetch('/api/products')
  .then(function (response) {
    return response.json();
  })
  .then(function (products) {
    adminProductsCache = products;

    let html = '';
    products.forEach(function (product) {
      html += '<div class="product" id="product-row-' + product.id + '">';
      html += '<div class="product-view">';
      if (product.image_url) {
        html += '<img class="admin-product-thumb" src="' + product.image_url + '" alt="' + escapeHtml(product.name) + '">';
      }
      html += '<h3>' + product.name + '</h3>';
      html += '<p>$' + product.price.toFixed(2) + ' (ID: ' + product.id + ') - Stock: ' + product.stock + ' - Category: ' + product.category + '</p>';
      html += '<button type="button" onclick="editAdminProduct(' + product.id + ')">Edit</button>';
      html += '<button type="button" onclick="deleteAdminProduct(' + product.id + ')">Delete</button>';
      html += '</div>';
      html += '</div>';
    });
    listEl.innerHTML = html;
  });
}

function editAdminProduct(id) {
  const product = adminProductsCache.find(function (p) {
    return p.id === id;
  });

  if (!product) return;

  const rowEl = document.getElementById('product-row-' + id);
  rowEl.innerHTML =
    '<div class="form-group">' +
      '<label>Name</label>' +
      '<input type="text" id="edit-name-' + id + '" value="' + product.name.replace(/"/g, '&quot;') + '">' +
    '</div>' +
    '<div class="form-group">' +
      '<label>Price</label>' +
      '<input type="text" id="edit-price-' + id + '" value="' + product.price + '">' +
    '</div>' +
    '<div class="form-group">' +
      '<label>Stock</label>' +
      '<input type="text" id="edit-stock-' + id + '" value="' + product.stock + '">' +
    '</div>' +
    '<div class="form-group">' +
      '<label>Category</label>' +
      '<input type="text" id="edit-category-' + id + '" value="' + product.category.replace(/"/g, '&quot;') + '">' +
    '</div>' +
    '<div class="form-group">' +
      '<label>Description</label>' +
      '<textarea id="edit-description-' + id + '" rows="3">' + escapeHtml(product.description || '') + '</textarea>' +
    '</div>' +
    '<div class="form-group">' +
      '<label>Current Image</label>' +
      (product.image_url
        ? '<img class="admin-product-thumb" src="' + product.image_url + '" alt="' + escapeHtml(product.name) + '">'
        : '<p>No image uploaded yet.</p>') +
    '</div>' +
    '<div class="form-group">' +
      '<label>Replace Image (optional)</label>' +
      '<input type="file" id="edit-image-' + id + '" accept="image/*">' +
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
  const description = document.getElementById('edit-description-' + id).value.trim();
  const errorEl = document.getElementById('edit-error-' + id);
  errorEl.textContent = '';

  if (!name || isNaN(price) || isNaN(stock) || stock < 0) {
    errorEl.textContent = 'Enter a valid name, price, and stock.';
    return;
  }

  const formData = new FormData();
  formData.append('name', name);
  formData.append('price', price);
  formData.append('stock', stock);
  formData.append('category', category);
  formData.append('description', description);

  const imageFile = document.getElementById('edit-image-' + id).files[0];
  if (imageFile) {
    formData.append('image', imageFile);
  }

  fetch('/api/admin/products/' + id, {
    method: 'PUT',
    headers: {
      'X-User-Email': loggedInUser.email
    },
    body: formData
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

  fetch('/api/admin/products/' + id, {
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

// All statuses an order can be moved through, in the order they're offered
// in the admin dropdown - kept in one place so it can't drift from the
// backend's own ORDER_STATUSES list.

const ORDER_STATUSES = ['Pending', 'Shipped', 'Delivered', 'Cancelled'];

function loadAdminOrders() {
  const listEl = document.getElementById('admin-order-list');
  if (!listEl) return;

  fetch('/api/admin/orders', {
    headers: { 'X-User-Email': JSON.parse(localStorage.getItem('loggedInUser') || 'null').email }
  })
  .then(function(response) {
    return response.json();
  })
  .then(function(orders) {

    if (orders.length === 0) {
      listEl.innerHTML = '<p>No orders yet.</p>';
      return;
    }

    let html = '';

    orders.forEach(function (order) {
      html += '<div class="product order order-' + order.status.toLowerCase() + '" id="admin-order-' + order.id + '">';
      html += '<h3>Order #' + order.id + '</h3>';
      html += '<p>' + order.customer_name + ' (' + order.email + ')</p>';
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

      html += '<div class="form-group">';
      html += '<label for="order-status-' + order.id + '">Status</label>';
      html += '<select id="order-status-' + order.id + '" class="order-status-select status-' + order.status.toLowerCase() + '" onchange="updateOrderStatus(' + order.id + ', this)">';
    
      ORDER_STATUSES.forEach(function (status) {
        html += '<option value="' + status + '"' + (status === order.status ? ' selected' : '') + '>' + status + '</option>';
      });

      html += '</select>';
      html += '</div>';

      html += '</div>';
    });

    listEl.innerHTML = html;
  })
  .catch(function () {
    listEl.innerHTML = '<p>Unable to load orders. Is the backend running?</p>';
  });
}

function updateOrderStatus(orderId, SelectEl) {
  const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser') || 'null');
  const newStatus = SelectEl.value;

  fetch('/api/admin/orders/' + orderId + '/status', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Email': loggedInUser.email
    },
    body: JSON.stringify({ status: newStatus })
  })
  .then(function (response) {
    return response.json().then(function (data) {
      return { status: response.status, data: data };
    });
  })
  .then(function (result) {
    if (result.status === 200) {
      SelectEl.className = 'order-status-select status-' + newStatus.toLowerCase();
      document.getElementById('admin-order-' + orderId).className = 'product order order-' + newStatus.toLowerCase();
      showToast('Order #' + orderId + ' marked as ' + newStatus + '.');
    } else {
      showToast(result.data.error || 'Something went wrong updating the order.', true);
      loadAdminOrders();
    }
  })
  .catch(function () {
    showToast('Something went wrong. Is the backend running?', true);
    loadAdminOrders();
  });
}

let adminCouponsCache = [];

function loadAdminCoupons() {
  const listEl = document.getElementById('admin-coupon-list');
  if (!listEl) return;

  fetch('/api/admin/coupons', {
    headers: { 'X-User-Email': JSON.parse(localStorage.getItem('loggedInUser') || 'null').email }
  })
  .then(function (response) {
    return response.json();
  })
  .then(function (coupons) {
    adminCouponsCache = coupons;

    if (coupons.length === 0) {
      listEl.innerHTML = '<p>No coupons yet.</p>';
      return;
    }

    let html = '';

    coupons.forEach(function (coupon) {
      html += '<div class="product" id="coupon-row-' + coupon.id + '">';
      html += '<div class="coupon-view">';
      html += '<h3>' + coupon.code + '</h3>';
      html += '<p>' + coupon.discount_percent + '% off - ';
      html += '<span class="order-status ' + (coupon.active ? 'status-delivered' : 'status-cancelled') + '">';
      html += coupon.active ? 'Active' : 'Inactive';
      html += '</span></p>';
      html += '<button type="button" onclick="editAdminCoupon(' + coupon.id + ')">Edit</button>';
      html += '<button type="button" onclick="toggleCouponActive(' + coupon.id + ')">' + (coupon.active ? 'Deactivate' : 'Activate') + '</button>';
      html += '<button type="button" onclick="deleteAdminCoupon(' + coupon.id + ')">Delete</button>';
      html += '</div>';
      html += '</div>';
    });

    listEl.innerHTML = html;
  })
  .catch(function () {
    listEl.innerHTML = '<p>Unable to load coupons. Is the backend running?</p>';
  });
}

function loadDashboard() {
  const revenueEl = document.getElementById('dashboard-revenue');
  if (!revenueEl) return;

  fetch('/api/admin/dashboard', {
    headers: { 'X-User-Email': JSON.parse(localStorage.getItem('loggedInUser') || 'null').email }
  })
  .then(function (response) {
    return response.json();
  })
  .then(function (data) {
    revenueEl.textContent = '$' + data.totalRevenue.toFixed(2);

    document.getElementById('dashboard-count-pending').textContent = data.orderCounts.Pending;
    document.getElementById('dashboard-count-shipped').textContent = data.orderCounts.Shipped;
    document.getElementById('dashboard-count-delivered').textContent = data.orderCounts.Delivered;
    document.getElementById('dashboard-count-cancelled').textContent = data.orderCounts.Cancelled;

    const topProductsEl = document.getElementById('dashboard-top-products');

    if (data.topProducts.length === 0) {
      topProductsEl.innerHTML = '<li>No Sales yet.</li>';
      return;
    }

    let html = '';

    data.topProducts.forEach(function (product) {
      html += '<li>' + product.productName + ' - ' + product.totalQuantity + ' sold</li>';
    });

    topProductsEl.innerHTML = html;
  })
  .catch(function () {
    revenueEl.textContent = 'Unable to load.';
  });
}

function editAdminCoupon(id) {
  const coupon = adminCouponsCache.find(function (c) {
    return c.id === id;
  });

  if (!coupon) return;

  const rowEl = document.getElementById('coupon-row-' + id);
  rowEl.innerHTML =
    '<div class="form-group">' +
      '<label>Code</label>' +
      '<input type="text" id="edit-coupon-code-' + id + '" value="' + coupon.code.replace(/"/g, '&quot;') + '">' +
    '</div>' +
    '<div class="form-group">' +
      '<label>Discount %</label>' +
      '<input type="number" id="edit-coupon-discount-' + id + '" value="' + coupon.discount_percent + '" min="1" max="100">' +
    '</div>' +
    '<p class="error" id="edit-coupon-error-' + id + '"></p>' +
    '<button type="button" onclick="saveAdminCoupon(' + id + ')">Save</button>' +
    '<button type="button" onclick="loadAdminCoupons()">Cancel</button>';
}

function saveAdminCoupon(id) {
  const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser') || 'null');
  const code = document.getElementById('edit-coupon-code-' + id).value;
  const discountPercent = parseInt(document.getElementById('edit-coupon-discount-' + id).value, 10);
  const errorEl = document.getElementById('edit-coupon-error-' + id);
  errorEl.textContent = '';

  if (!code || isNaN(discountPercent) || discountPercent < 1 || discountPercent > 100) {
    errorEl.textContent = 'Enter a valid code and discount percent (1-100).';
    return;
  }

  fetch('/api/admin/coupons/' + id, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Email': loggedInUser.email
    },
    body: JSON.stringify({ code: code, discountPercent: discountPercent })
  })
  .then(function (response) {
    return response.json().then(function (data) {
      return { status: response.status, data: data };
    });
  })
  .then(function (result) {
    if (result.status === 200) {
      showToast('Coupon updated successfully.');
      loadAdminCoupons();
    } else {
      errorEl.textContent = result.data.error;
    }
  })
  .catch(function () {
    errorEl.textContent = 'Something went wrong updating the coupon.';
  });
}

function toggleCouponActive(id) {
  const coupon = adminCouponsCache.find(function (c) {
    return c.id === id;
  });

  if (!coupon) return;

  const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser') || 'null');
  const newActive = coupon.active ? false : true;

  fetch('/api/admin/coupons/' + id, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Email': loggedInUser.email
    },
    body: JSON.stringify({ active: newActive })
  })
  .then(function (response) {
    return response.json().then(function (data) {
      return { status: response.status, data: data };
    });
  })
  .then(function (result) {
    if (result.status === 200) {
      showToast('Coupon ' + (newActive ? 'activated' : 'deactivated') + '.');
      loadAdminCoupons();
    } else {
      showToast(result.data.error || 'Something went wrong updating the coupon.', true);
    }
  })
  .catch(function () {
    showToast('Something went wrong. Is the backend running?', true);
  });
}

function deleteAdminCoupon(id) {
  const confirmed = confirm('Are you sure you want to delete this coupon?');
  if (!confirmed) return;

  const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser') || 'null');

  fetch('/api/admin/coupons/' + id, {
    method: 'DELETE',
    headers: { 'X-User-Email': loggedInUser.email }
  })
  .then(function (response) {
    return response.json();
  })
  .then(function () {
    showToast('Coupon deleted.');
    loadAdminCoupons();
  })
  .catch(function () {
    showToast('Something went wrong deleting the coupon.', true);
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
let allOrderCache = [];

function loadOrders() {
  const listEl = document.getElementById('orders-list');
  if (!listEl) return;

  const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser') || 'null');

  fetch('/api/orders', {
    headers: { 'X-User-Email': loggedInUser.email }
  })
  .then(function (response) {
    return response.json();
  })
  .then(function (orders) {
    allOrdersCache = orders;
    renderOrdersList('All');
  })
  .catch(function () {
    listEl.innerHTML = '<p>Unable to load orders. Is the backend running?</p>';
  });
}

function renderOrdersList(filterStatus) {
  const listEl = document.getElementById('orders-list');
  const noOrdersMessage = document.getElementById('no-orders-message');
  if(!listEl) return;

  const filteredOrders = filterStatus === 'All'
  ? allOrdersCache
  : allOrdersCache.filter(function (order) {
    return order.status === filterStatus;
  });

  if (filteredOrders.length === 0) {
    listEl.innerHTML = '';
    noOrdersMessage.textContent = allOrdersCache.length === 0
      ? "You haven't placed any orders yet."
      : 'No orders found in this category.';
    noOrdersMessage.style.display = 'block';
    return;
  }

  noOrdersMessage.style.display = 'none';

  let html = '';

  filteredOrders.forEach(function (order) {
    html += '<div class="product order" id="order-' + order.id + '">';
    html += '<h3>Order #' + order.id + '</h3>';
    html += '<p class="order-status status-' + order.status.toLowerCase() + '">' + order.status + '</p>';
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

    if (order.status === 'Pending') {
      html += '<button type="button" onclick="cancelOrder(' + order.id + ')">Cancel Order</button>';
    }

    html += '</div>';
  });

  listEl.innerHTML = html;
}

const orderTabs = document.querySelectorAll('.order-tab');

orderTabs.forEach(function (tab) {
  tab.addEventListener('click', function() {
    orderTabs.forEach(function (t) {
      t.classList.remove('active');
    });
    tab.classList.add('active');
    renderOrdersList(tab.dataset.status);
  });
});

// Cancel Order
function cancelOrder(id) {
  const confirmed = confirm('Are you sure you want to cancel this order?');
  if (!confirmed) return;

  const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser') || 'null');

  fetch('/api/orders/' + id + '/cancel', {
    method: 'PUT',
    headers: { 'X-User-Email': loggedInUser.email }
  })
  .then(function (response) {
    return response.json().then(function (data) {
      return { status: response.status, data: data };
    });
  })
  .then(function (result) {
    if (result.status === 200) {
      showToast('Order cancelled.');
      loadOrders();
    } else {
      showToast(result.data.error || 'Something went wrong cancelling the order.', true);
    }
  })
  .catch(function () {
    showToast('Something went wrong. Is the backend running?', true);
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

// My Profile page
function loadProfile(email) {
  fetch('/api/profile', {
    headers: { 'X-User-Email': email }
  })
    .then(function (response) {
      return response.json();
    })
    .then(function (profile) {
      document.getElementById('profile-email').textContent = profile.email;
      document.getElementById('profile-role').textContent = profile.role;
      document.getElementById('default-name').value = profile.defaultName || '';
      document.getElementById('default-address').value = profile.defaultAddress || '';
    })
    .catch(function () {
      document.getElementById('profile-access-message').textContent =
        'Unable to load your profile. Is the backend running?';
    });
}

const profileAccessMessage = document.getElementById('profile-access-message');

if (profileAccessMessage) {
  const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser') || 'null');

  if (!loggedInUser) {
    profileAccessMessage.textContent = 'You must be logged in to view your profile.';
  } else {
    document.getElementById('profile-content').style.display = 'block';
    loadProfile(loggedInUser.email);
  }
}

const shippingForm = document.getElementById('shipping-form');

if (shippingForm) {
  shippingForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser') || 'null');
    const defaultName = document.getElementById('default-name').value.trim();
    const defaultAddress = document.getElementById('default-address').value.trim();
    const messageEl = document.getElementById('shipping-message');
    messageEl.textContent = '';
    messageEl.className = '';

    fetch('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Email': loggedInUser.email
      },
      body: JSON.stringify({ defaultName: defaultName, defaultAddress: defaultAddress })
    })
      .then(function (response) {
        return response.json().then(function (data) {
          return { status: response.status, data: data };
        });
      })
      .then(function (result) {
        if (result.status === 200) {
          messageEl.textContent = 'Shipping info saved.';
          messageEl.className = 'coupon-success';
        } else {
          messageEl.textContent = result.data.error || 'Something went wrong saving your shipping info.';
          messageEl.className = 'error';
        }
      })
      .catch(function () {
        messageEl.textContent = 'Something went wrong. Is the backend running?';
        messageEl.className = 'error';
      });
  });
}

const passwordForm = document.getElementById('password-form');

if (passwordForm) {
  passwordForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser') || 'null');
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmNewPassword = document.getElementById('confirm-new-password').value;
    const messageEl = document.getElementById('password-message');
    messageEl.textContent = '';
    messageEl.className = '';

    if (!currentPassword || !newPassword) {
      messageEl.textContent = 'Enter your current and new password.';
      messageEl.className = 'error';
      return;
    }

    if (newPassword.length < 6) {
      messageEl.textContent = 'New password must be at least 6 characters.';
      messageEl.className = 'error';
      return;
    }

    if (newPassword !== confirmNewPassword) {
      messageEl.textContent = 'New password and confirmation do not match.';
      messageEl.className = 'error';
      return;
    }

    fetch('/api/profile/password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Email': loggedInUser.email
      },
      body: JSON.stringify({ currentPassword: currentPassword, newPassword: newPassword })
    })
      .then(function (response) {
        return response.json().then(function (data) {
          return { status: response.status, data: data };
        });
      })
      .then(function (result) {
        if (result.status === 200) {
          messageEl.textContent = 'Password updated successfully.';
          messageEl.className = 'coupon-success';
          document.getElementById('current-password').value = '';
          document.getElementById('new-password').value = '';
          document.getElementById('confirm-new-password').value = '';
        } else {
          messageEl.textContent = result.data.error || 'Something went wrong changing your password.';
          messageEl.className = 'error';
        }
      })
      .catch(function () {
        messageEl.textContent = 'Something went wrong. Is the backend running?';
        messageEl.className = 'error';
      });
  });
}

// Product reviews & ratings (product.html?id=X). Guarded by #reviews-section
// so this is a no-op on every other page.
function loadReviews(productId) {
  const summaryEl = document.getElementById('reviews-summary');
  const listEl = document.getElementById('reviews-list');
  if (!listEl) return;

  fetch('/api/products/' + productId + '/reviews')
    .then(function (response) { return response.json(); })
    .then(function (data) {
      if (data.reviewCount === 0) {
        summaryEl.textContent = 'No reviews yet.';
        listEl.innerHTML = '';
        return;
      }

      summaryEl.textContent =
        data.averageRating + ' out of 5 (' + data.reviewCount +
        (data.reviewCount === 1 ? ' review' : ' reviews') + ')';

      let html = '';
      data.reviews.forEach(function (review) {
        html += '<div class="review">';
        html += '<p class="review-rating">' + review.rating + ' / 5</p>';
        html += '<p class="review-author">' + escapeHtml(review.reviewerEmail) + '</p>';
        if (review.comment) {
          html += '<p>' + escapeHtml(review.comment).replace(/\n/g, '<br>') + '</p>';
        }
        html += '</div>';
      });

      listEl.innerHTML = html;
    })
    .catch(function () {
      listEl.innerHTML = '<p>Unable to load reviews. Is the backend running?</p>';
    });
}

const reviewsSection = document.getElementById('reviews-section');

if (reviewsSection) {
  const params = new URLSearchParams(window.location.search);
  const reviewsProductId = params.get('id');
  const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser') || 'null');
  const reviewAccessMessage = document.getElementById('review-access-message');
  const reviewForm = document.getElementById('review-form');

  if (reviewsProductId) {
    loadReviews(reviewsProductId);
  }

  if (!loggedInUser) {
    reviewAccessMessage.textContent = 'You must be logged in to leave a review.';
  } else if (reviewsProductId) {
    reviewForm.style.display = 'block';

    reviewForm.addEventListener('submit', function (event) {
      event.preventDefault();

      const rating = document.getElementById('review-rating').value;
      const comment = document.getElementById('review-comment').value.trim();
      const messageEl = document.getElementById('review-message');
      messageEl.textContent = '';
      messageEl.className = '';

      if (!rating) {
        messageEl.textContent = 'Select a rating first.';
        messageEl.className = 'error';
        return;
      }

      fetch('/api/products/' + reviewsProductId + '/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': loggedInUser.email
        },
        body: JSON.stringify({ rating: Number(rating), comment: comment })
      })
        .then(function (response) {
          return response.json().then(function (data) {
            return { status: response.status, data: data };
          });
        })
        .then(function (result) {
          if (result.status === 200 || result.status === 201) {
            showToast(result.data.updated ? 'Your review has been updated.' : 'Thanks for your review!');
            loadReviews(reviewsProductId);
          } else {
            messageEl.textContent = result.data.error || 'Something went wrong submitting your review.';
            messageEl.className = 'error';
          }
        })
        .catch(function () {
          messageEl.textContent = 'Something went wrong. Is the backend running?';
          messageEl.className = 'error';
        });
    });
  }
}