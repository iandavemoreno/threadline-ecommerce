function loadProducts() {
  const listEl = document.getElementById('product-list');
  if (!listEl) return; // not on the homepage, skip

  fetch('http://localhost:3000/api/products')
  .then(function (response) {
    return response.json();
  })
  .then(function (products) {
    let html = '';
    products.forEach(function (product) {
      html += '<div class="product">';
      html += '<h3>' + product.name + '</h3>';
      html += '<p>$' + product.price.toFixed(2) +  '</p>';
      html += '<button onclick="addToCart(\'' + product.name + '\', ' + product.price + ')">Add to Cart</button>';
      html += '</div>';
    });
    listEl.innerHTML = html;
  })
  .catch(function (error) {
    listEl.innerHTML = '<p>Could not load products, is the backend server running?</p>';
    console.error('Error loading products:', error);
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

function addToCart(name, price) {
  const cart = getCart();
  cart.push({ name: name, price: price });
  saveCart(cart);
  updateCartCount();
  alert(name + ' added to cart!');
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

function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
  updateCartCount();
  renderCart();
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
    
    if (isValid) {
      localStorage.removeItem('cart');
      updateCartCount();
      checkoutForm.style.display = 'none';
      document.getElementById('order-confirmation').innerHTML = '<p> Thank you, ' + name + '! Your oreder has been placed. </p>';
    }
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
    loginForm.addEventListener('submit', function (event){
         event.preventDefault();

         document.getElementById('login-email-error').textContent = '';
         document.getElementById('login-password-error').textContent = '';
         document.getElementById('login-form-error').textContent = '';

         const email = document.getElementById('login-email').value;
         const password = document.getElementById('login-password').value;

         fetch ('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: password})
         })
         .then(function (response) {
            return response.json().then(function (data) {
                return { status: response.status, data: data };
            });
         })
         .then(function (result) {
            if  (result.status === 200) {
                localStorage.setItem('loggedInUser', JSON.stringify(result.data));
                window.location.href = 'index.html';
            } else {
                document.getElementById('login-form-error').textContent = result.data.error;
            }
         })
         .catch(function() {
            document.getElementById('login-form-error').textContent = 'Something went wrong. Is the backend running?';
         });
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
    const errorEl = document.getElementById('add-product-error');
    errorEl.textContent = '';

    if (!name || isNaN(price)) {
      errorEl.textContent = 'Enter a valid name and price.';
      return;
    }

    fetch('http://localhost:3000/api/admin/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Email': loggedInUser.email
      },
      body: JSON.stringify({ name: name, price: price})
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
      html += '<div class="product">';
      html += '<h3>' + product.name + '</h3>';
      html += '<p>$' + product.price.toFixed(2) + '(ID: ' + product.id + ')</p>';
      html += '<button type="button" onclick="deleteAdminProduct(' + product.id +')">Delete</button>';
      html += '</div>';
    });
    listEl.innerHTML = html;
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