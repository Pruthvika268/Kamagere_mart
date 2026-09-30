/* =========================================================
   KAMAGERE MART - MAIN FRONTEND
   Single cart source of truth: localStorage key "km_cart"
   Cart format: { "1": 2, "3": 1 }
========================================================= */

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const CART_KEY = "km_cart";
const BUY_NOW_KEY = "km_buy_now";
const USER_KEY = "km_user";
const ADDRESS_KEY = "km_address";
const ORDERS_KEY = "km_orders";

function readCart() {
    try {
        const saved = JSON.parse(localStorage.getItem(CART_KEY) || "{}");
        return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
    } catch {
        return {};
    }
}

function migrateOldProductCart() {
    // Older product.js used "kamagereCart" as an array.
    // Convert it once so existing test data is not lost.
    try {
        const old = JSON.parse(localStorage.getItem("kamagereCart") || "null");
        if (Array.isArray(old) && old.length) {
            const cart = readCart();
            old.forEach(item => {
                const id = String(item.id);
                cart[id] = Number(item.quantity || 1);
            });
            localStorage.setItem(CART_KEY, JSON.stringify(cart));
            localStorage.removeItem("kamagereCart");
        }
    } catch {
        // Ignore malformed legacy data.
    }
}

migrateOldProductCart();

const state = {
    cart: readCart(),
    user: JSON.parse(localStorage.getItem(USER_KEY) || "null"),
    address: localStorage.getItem(ADDRESS_KEY) || "",
    orders: JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]"),
    category: "All",
    query: new URLSearchParams(location.search).get("search") || ""
};

const path = location.pathname;
const page = path.includes("/pages/")
    ? path.split("/").pop().replace(".html", "")
    : "home";
const base = path.includes("/pages/") ? "../" : "";

function save() {
    localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
    localStorage.setItem(ORDERS_KEY, JSON.stringify(state.orders));
    localStorage.setItem(ADDRESS_KEY, state.address);

    if (state.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(state.user));
    } else {
        localStorage.removeItem(USER_KEY);
    }
}

function syncCartFromStorage() {
    state.cart = readCart();
    return state.cart;
}

function cartCount() {
    const cart = syncCartFromStorage();
    return Object.values(cart).reduce((sum, qty) => sum + Number(qty || 0), 0);
}

function cartItems() {
    return PRODUCTS
        .filter(product => Number(state.cart[product.id] || 0) > 0)
        .map(product => ({
            ...product,
            qty: Number(state.cart[product.id])
        }));
}

function subtotal() {
    return cartItems().reduce((sum, product) => {
        return sum + Number(product.price) * Number(product.qty);
    }, 0);
}

/* Delivery rule:
   subtotal < ₹199  => ₹25
   subtotal >= ₹199 => FREE
*/
function delivery() {
    const amount = subtotal();
    return amount === 0 ? 0 : amount < 199 ? 25 : 0;
}

function money(value) {
    return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function toast(message) {
    const existing = document.querySelector(".toast");
    if (existing) existing.remove();

    const element = document.createElement("div");
    element.className = "toast";
    element.textContent = message;
    document.body.appendChild(element);

    setTimeout(() => element.remove(), 2200);
}

function add(id, quantity = 1) {
    const product = PRODUCTS.find(item => Number(item.id) === Number(id));
    if (!product) return;

    const key = String(id);
    state.cart[key] = Number(state.cart[key] || 0) + Number(quantity);
    save();
    render();
    toast(`${product.name} added to cart`);
}

function change(id, delta) {
    syncCartFromStorage();

    const key = String(id);
    const nextQuantity = Number(state.cart[key] || 0) + Number(delta);

    if (nextQuantity <= 0) {
        delete state.cart[key];
    } else {
        state.cart[key] = nextQuantity;
    }

    save();
    render();
}

function nav(active = "") {
    const accountPage = state.user ? "pages/profile.html" : "pages/auth.html";

    return `
        <header class="header">
            <div class="container header-row">
                <a class="logo" href="${base}index.html">
                    <span class="logo-mark">KM</span>
                    <span>Kamagere Mart</span>
                </a>

                <div class="search">
                    <span class="search-icon">⌕</span>
                    <input
                        id="searchInput"
                        type="search"
                        placeholder="Search for atta, milk, snacks..."
                        value="${state.query}"
                    >
                </div>

                <div class="header-actions">
                    <button class="nav-btn desktop" onclick="location.href='${base}pages/orders.html'">
                        Orders
                    </button>

                    <button class="icon-btn" onclick="location.href='${base}pages/cart.html'" aria-label="Cart">
                        🛒 <span class="badge">${cartCount()}</span>
                    </button>

                    <button class="icon-btn" onclick="location.href='${base}${accountPage}'" aria-label="Profile">
                        👤
                    </button>
                </div>
            </div>
        </header>
    `;
}

function bottom(active) {
    const accountPage = state.user ? "pages/profile.html" : "pages/auth.html";

    return `
        <nav class="bottom-nav">
            <a class="${active === "home" ? "active" : ""}" href="${base}index.html">
                ⌂<span>Home</span>
            </a>
            <a class="${active === "orders" ? "active" : ""}" href="${base}pages/orders.html">
                ▤<span>Orders</span>
            </a>
            <a class="${active === "cart" ? "active" : ""}" href="${base}pages/cart.html">
                🛒<span>Cart${cartCount() ? ` (${cartCount()})` : ""}</span>
            </a>
            <a class="${active === "profile" ? "active" : ""}" href="${base}${accountPage}">
                ●<span>Profile</span>
            </a>
        </nav>
    `;
}

function footer() {
    return `
        <footer class="footer">
            <div class="container footer-grid">
                <div>
                    <h3>Kamagere Mart</h3>
                    <p>Fresh essentials, delivered to your doorstep.</p>
                    <p class="muted">Frontend demo ready for Apps Script / GCP integration.</p>
                </div>
                <div>
                    <h3>Shop</h3>
                    <a href="${base}index.html">Home</a>
                    <a href="${base}pages/cart.html">Cart</a>
                    <a href="${base}pages/orders.html">Orders</a>
                </div>
                <div>
                    <h3>Account</h3>
                    <a href="${base}pages/auth.html">Login / Register</a>
                    <a href="${base}pages/profile.html">Profile</a>
                </div>
            </div>
        </footer>
    `;
}

function productCard(product) {
    return `
        <article class="card product-card-clickable" onclick="openProduct(${product.id})">
            <div class="product-img">
                <span>${product.unit}</span>
                <img
                    src="${base}${product.image}"
                    alt="${product.name}"
                    loading="lazy"
                    onerror="this.style.display='none'"
                >
            </div>

            <div class="card-body">
                <div class="product-name">${product.name}</div>
                <div class="muted">${product.category}</div>

                <div class="price-row">
                    <span class="price">${money(product.price)}</span>
                    <button
                        class="add"
                        onclick="event.stopPropagation(); add(${product.id})"
                        aria-label="Add ${product.name} to cart"
                    >
                        +
                    </button>
                </div>
            </div>
        </article>
    `;
}

function filteredProducts() {
    const query = state.query.toLowerCase().trim();

    return PRODUCTS.filter(product => {
        const categoryMatch = state.category === "All" || product.category === state.category;
        const searchMatch = !query ||
            product.name.toLowerCase().includes(query) ||
            product.category.toLowerCase().includes(query);

        return categoryMatch && searchMatch;
    });
}

function home() {
    return `
        ${nav("home")}
        <main>
            <section class="hero">
                <div class="container hero-grid">
                    <div class="hero-copy">
                        <div class="eyebrow">Kamagere Mart</div>
                        <h1>Daily essentials, right at your doorstep.</h1>
                        <p>Shop groceries, dairy, snacks and household essentials with a simple, mobile-friendly checkout.</p>
                        <div class="location">📍 Delivering to <b>${state.address || "Set your address"}</b></div>
                        <br>
                        <button class="btn btn-primary" onclick="document.getElementById('products')?.scrollIntoView({behavior:'smooth'})">
                            Shop now →
                        </button>
                    </div>
                    <div class="hero-card">🛍️🥦🥛</div>
                </div>
            </section>

            <section class="section">
                <div class="container">
                    <div class="section-head"><h2>Shop by category</h2></div>
                    <div class="chips">
                        ${CATEGORIES.map(category => `
                            <button
                                class="chip ${state.category === category ? "active" : ""}"
                                onclick="setCategory('${category}')"
                            >
                                ${category}
                            </button>
                        `).join("")}
                    </div>
                </div>
            </section>

            <section class="section" id="products">
                <div class="container">
                    <div class="section-head">
                        <h2>${state.query ? `Search results for "${state.query}"` : "Popular essentials"}</h2>
                        <span class="muted">${filteredProducts().length} items</span>
                    </div>

                    <div class="grid">
                        ${filteredProducts().map(productCard).join("") || `
                            <div class="empty" style="grid-column:1/-1">
                                <div class="emoji">🔎</div>
                                No products found.
                            </div>
                        `}
                    </div>
                </div>
            </section>

            <section class="section">
                <div class="container">
                    <div class="panel">
                        <b>Delivery information</b>
                        <p class="muted">Orders below ₹199 have a ₹25 delivery charge. Orders of ₹199 or more get free delivery.</p>
                    </div>
                </div>
            </section>
        </main>
        ${footer()}
        ${bottom("home")}
    `;
}

function setCategory(category) {
    state.category = category;
    render();
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
}

function bindSearch() {
    const input = $("#searchInput");
    if (!input) return;

    input.addEventListener("input", event => {
        state.query = event.target.value;
        render();
        const refreshed = $("#searchInput");
        if (refreshed) {
            refreshed.focus();
            refreshed.setSelectionRange(refreshed.value.length, refreshed.value.length);
        }
    });
}

function cartPage() {
    const items = cartItems();
    const currentSubtotal = subtotal();
    const currentDelivery = delivery();
    const total = currentSubtotal + currentDelivery;

    return `
        ${nav("cart")}
        <main class="page">
            <div class="container">
                <h1 class="page-title">Your Cart</h1>

                ${items.length ? `
                    <div class="layout-2">
                        <section class="panel">
                            ${items.map(product => `
                                <div class="cart-item">
                                    <div class="thumb">
                                        <img
                                            src="${base}${product.image}"
                                            alt="${product.name}"
                                            loading="lazy"
                                            onerror="this.src='${base}assets/products/placeholder.jpg'; this.onerror=null;"
                                        >
                                    </div>

                                    <div class="cart-product-info">
                                        <b>${product.name}</b>
                                        <div class="muted">${product.unit}</div>
                                        <div class="qty">
                                            <button onclick="change(${product.id}, -1)" aria-label="Decrease quantity">−</button>
                                            <b>${product.qty}</b>
                                            <button onclick="change(${product.id}, 1)" aria-label="Increase quantity">+</button>
                                        </div>
                                    </div>

                                    <b class="cart-item-price">${money(product.price * product.qty)}</b>
                                </div>
                            `).join("")}
                        </section>

                        <aside class="panel">
                            <h3>Order summary</h3>
                            <div class="summary-row">
                                <span>Subtotal</span>
                                <b>${money(currentSubtotal)}</b>
                            </div>
                            <div class="summary-row">
                                <span>Delivery</span>
                                <b>${currentDelivery ? money(currentDelivery) : "FREE"}</b>
                            </div>
                            <div class="summary-row total">
                                <span>Total</span>
                                <span>${money(total)}</span>
                            </div>
                            <button
                                class="btn btn-primary"
                                style="width:100%;margin-top:14px"
                                onclick="goToCheckout()"
                            >
                                Proceed to Checkout
                            </button>
                        </aside>
                    </div>
                ` : `
                    <div class="panel empty">
                        <div class="emoji">🛒</div>
                        <h2>Your cart is empty</h2>
                        <p>Add some essentials to get started.</p>
                        <a class="btn btn-primary" href="${base}index.html">Continue shopping</a>
                    </div>
                `}
            </div>
        </main>
        ${bottom("cart")}
    `;
}

function getBuyNowItem() {
    try {
        const saved = JSON.parse(localStorage.getItem(BUY_NOW_KEY) || "null");

        if (!saved || typeof saved !== "object") return null;

        const product = PRODUCTS.find(
            item => Number(item.id) === Number(saved.id)
        );

        const qty = Number(saved.qty || 0);

        if (!product || qty <= 0) return null;

        return {
            ...product,
            qty
        };
    } catch {
        return null;
    }
}

function getCheckoutItems() {
    const buyNowItem = getBuyNowItem();

    // If Buy Now was used, checkout contains ONLY that product.
    if (buyNowItem) {
        return [buyNowItem];
    }

    // Normal checkout from Cart.
    return cartItems();
}

function checkoutSubtotal(items) {
    return items.reduce(
        (sum, product) =>
            sum + Number(product.price) * Number(product.qty),
        0
    );
}

function checkoutDelivery(amount) {
    // Below ₹199 => ₹25
    // ₹199 or more => FREE
    if (amount <= 0) return 0;
    return amount < 199 ? 25 : 0;
}

function checkout() {
    const items = getCheckoutItems();

    if (!items.length) {
        return `
            ${nav()}
            <main class="page">
                <div class="container">
                    <div class="panel empty">
                        <div class="emoji">🛒</div>
                        <h2>No items to checkout</h2>
                        <p>Add products to your cart or use Buy Now from a product page.</p>
                        <a class="btn btn-primary" href="${base}index.html">Shop now</a>
                    </div>
                </div>
            </main>
            ${bottom()}
        `;
    }

    const isBuyNow = Boolean(getBuyNowItem());
    const currentSubtotal = checkoutSubtotal(items);
    const currentDelivery = checkoutDelivery(currentSubtotal);
    const total = currentSubtotal + currentDelivery;

    return `
        ${nav()}
        <main class="page">
            <div class="container">
                <h1 class="page-title">Checkout</h1>

                ${
                    isBuyNow
                        ? `
                            <div class="notice" style="margin-bottom:16px">
                                ⚡ Buy Now checkout — only the selected product is included.
                            </div>
                        `
                        : `
                            <div class="notice" style="margin-bottom:16px">
                                🛒 Cart checkout — all products currently in your cart are included.
                            </div>
                        `
                }

                <div class="layout-2">
                    <section class="panel">
                        <h3>Delivery address</h3>

                        <div class="field">
                            <label for="address">Address</label>
                            <textarea
                                id="address"
                                rows="4"
                                placeholder="House/flat, street, area, city, PIN"
                            >${state.address}</textarea>
                        </div>

                        <br>

                        <button
                            class="btn btn-outline"
                            onclick="useLocation()"
                        >
                            📍 Use my current location
                        </button>

                        <h3 style="margin-top:28px">
                            Payment mode
                        </h3>

                        <label class="payment-option selected">
                            <input
                                type="radio"
                                name="pay"
                                value="COD"
                                checked
                            >
                            Cash on Delivery
                        </label>

                        <label class="payment-option">
                            <input
                                type="radio"
                                name="pay"
                                value="UPI"
                            >
                            UPI
                        </label>

                        <div class="notice">
                            UPI can be connected to a payment gateway / Apps Script backend later.
                        </div>
                    </section>

                    <aside class="panel">
                        <h3>Order summary</h3>

                        ${items.map(product => `
                            <div class="summary-row">
                                <span>
                                    ${product.name} × ${product.qty}
                                </span>

                                <b>
                                    ${money(product.price * product.qty)}
                                </b>
                            </div>
                        `).join("")}

                        <div class="summary-row">
                            <span>Subtotal</span>
                            <b>${money(currentSubtotal)}</b>
                        </div>

                        <div class="summary-row">
                            <span>Delivery</span>
                            <b>
                                ${
                                    currentDelivery
                                        ? money(currentDelivery)
                                        : "FREE"
                                }
                            </b>
                        </div>

                        <div class="summary-row total">
                            <span>Total</span>
                            <span>${money(total)}</span>
                        </div>

                        <button
                            class="btn btn-primary"
                            style="width:100%"
                            onclick="placeOrder()"
                        >
                            Place Order
                        </button>
                    </aside>
                </div>
            </div>
        </main>

        ${bottom()}
    `;
}

function useLocation() {
    if (!navigator.geolocation) {
        toast("Location is not supported by this browser");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        position => {
            state.address = `GPS: ${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`;
            save();
            render();
            toast("Location captured");
        },
        () => toast("Location permission was denied")
    );
}

function placeOrder() {
    const address = $("#address")?.value.trim();

    if (!address) {
        toast("Please enter delivery address");
        return;
    }

    const items = getCheckoutItems();

    if (!items.length) {
        toast("No items to checkout");
        return;
    }

    state.address = address;

    const payment =
        $('input[name="pay"]:checked')?.value || "COD";

    const currentSubtotal =
        checkoutSubtotal(items);

    const currentDelivery =
        checkoutDelivery(currentSubtotal);

    const isBuyNow =
        Boolean(getBuyNowItem());

    const order = {
        id: "KM" + Date.now().toString().slice(-7),
        date: new Date().toLocaleString("en-IN"),

        items: items.map(item => ({
            id: item.id,
            name: item.name,
            category: item.category,
            unit: item.unit,
            price: Number(item.price),
            image: item.image,
            qty: Number(item.qty)
        })),

        subtotal: currentSubtotal,

        delivery: currentDelivery,

        total:
            currentSubtotal +
            currentDelivery,

        address,

        payment,

        status: "Confirmed",

        source:
            isBuyNow
                ? "Buy Now"
                : "Cart"
    };

    state.orders.unshift(order);

    /*
     * IMPORTANT:
     *
     * Buy Now:
     *   Clear ONLY the temporary Buy Now item.
     *   Do NOT touch the user's existing cart.
     *
     * Cart checkout:
     *   Clear the cart after the order is placed.
     */
    if (isBuyNow) {
        localStorage.removeItem(BUY_NOW_KEY);
    } else {
        state.cart = {};
    }

    save();

    toast("Order placed successfully");

    setTimeout(() => {
        location.href = "orders.html";
    }, 500);
}

function orders() {
    return `
        ${nav("orders")}
        <main class="page">
            <div class="container">
                <h1 class="page-title">Orders</h1>
                ${state.orders.length ? `
                    <div class="panel">
                        ${state.orders.map(order => `
                            <div class="order">
                                <div>
                                    <b>Order #${order.id}</b>
                                    <div class="muted">${order.date} · ${order.items.length} product(s)</div>
                                    <div class="muted">${order.payment} · ${order.address}</div>
                                </div>
                                <div style="text-align:right">
                                    <span class="status">${order.status}</span>
                                    <div style="margin-top:7px;font-weight:800">${money(order.total)}</div>
                                </div>
                            </div>
                        `).join("")}
                    </div>
                ` : `
                    <div class="panel empty">
                        <div class="emoji">📦</div>
                        <h2>No orders yet</h2>
                        <p>Your placed orders will appear here.</p>
                        <a class="btn btn-primary" href="${base}index.html">Start shopping</a>
                    </div>
                `}
            </div>
        </main>
        ${bottom("orders")}
    `;
}

function profile() {
    if (!state.user) return auth();

    return `
        ${nav("profile")}
        <main class="page">
            <div class="container">
                <h1 class="page-title">Profile</h1>
                <div class="layout-2">
                    <section class="panel">
                        <h3>Account details</h3>
                        <div class="form-grid">
                            <div class="field">
                                <label>Full name</label>
                                <input id="pname" value="${state.user.name || ""}">
                            </div>
                            <div class="field">
                                <label>Phone</label>
                                <input value="${state.user.phone || ""}" disabled>
                            </div>
                            <div class="field full">
                                <label>Email</label>
                                <input value="${state.user.email || ""}" disabled>
                            </div>
                            <div class="field full">
                                <label>Delivery address</label>
                                <textarea id="paddr" rows="3">${state.address}</textarea>
                            </div>
                        </div>
                        <br>
                        <button class="btn btn-primary" onclick="saveProfile()">Save changes</button>
                    </section>

                    <aside class="panel">
                        <h3>Quick actions</h3>
                        <a class="btn btn-outline" style="width:100%;margin-bottom:10px" href="orders.html">View orders</a>
                        <button class="btn btn-outline" style="width:100%" onclick="logout()">Log out</button>
                    </aside>
                </div>
            </div>
        </main>
        ${bottom("profile")}
    `;
}

function saveProfile() {
    state.user.name = $("#pname")?.value.trim() || state.user.name;
    state.address = $("#paddr")?.value.trim() || "";
    save();
    toast("Profile updated");
    render();
}

function logout() {
    state.user = null;
    save();
    location.href = "auth.html";
}

function auth() {
    return `
        ${nav()}
        <main class="auth-wrap">
            <section class="auth">
                <div class="tabs">
                    <button id="loginTab" class="active" onclick="authMode('login')">Log in</button>
                    <button id="registerTab" onclick="authMode('register')">Create account</button>
                </div>
                <div id="authBody"></div>
            </section>
        </main>
        ${bottom()}
    `;
}

function authMode(mode) {
    const body = $("#authBody");
    if (!body) return;

    $("#loginTab")?.classList.toggle("active", mode === "login");
    $("#registerTab")?.classList.toggle("active", mode === "register");

    body.innerHTML = mode === "login"
        ? `
            <h1>Welcome back</h1>
            <p class="muted">Log in to track orders and check out faster.</p>
            <div class="field"><label>Phone number</label><input id="phone" placeholder="10-digit mobile number"></div>
            <br>
            <div class="field"><label>Password</label><input id="password" type="password" placeholder="Password"></div>
            <br>
            <button class="btn btn-primary" style="width:100%" onclick="login()">Log in</button>
        `
        : `
            <h1>Create your account</h1>
            <p class="muted">Create a customer profile for checkout and order tracking.</p>
            <div class="field"><label>Full name</label><input id="rname"></div>
            <br>
            <div class="field"><label>Email</label><input id="remail" type="email"></div>
            <br>
            <div class="field"><label>Phone</label><input id="rphone"></div>
            <br>
            <div class="field"><label>Password</label><input id="rpass" type="password"></div>
            <br>
            <div class="field"><label>Delivery address</label><textarea id="raddr" rows="3"></textarea></div>
            <br>
            <button class="btn btn-primary" style="width:100%" onclick="register()">Create account</button>
        `;
}

function login() {
    const phone = $("#phone")?.value.trim();
    if (!phone) return toast("Enter phone number");

    state.user = { name: "Kamagere Customer", phone };
    save();
    location.href = base + "index.html";
}

function register() {
    const name = $("#rname")?.value.trim();
    const email = $("#remail")?.value.trim();
    const phone = $("#rphone")?.value.trim();
    const password = $("#rpass")?.value;

    if (!name || !email || !phone || !password) {
        return toast("Complete all required fields");
    }

    state.user = { name, email, phone };
    state.address = $("#raddr")?.value.trim() || "";
    save();
    location.href = base + "index.html";
}

function render() {
    const app = $("#app");
    if (!app) return;

    app.innerHTML =
        page === "home" ? home() :
        page === "orders" ? orders() :
        page === "cart" ? cartPage() :
        page === "checkout" ? checkout() :
        page === "profile" ? profile() :
        page === "auth" ? auth() :
        home();

    bindSearch();

    if (page === "auth") {
        authMode("login");
    }
}

function openProduct(id) {
    location.href = `${base}pages/product.html?id=${id}`;
}

function goToCheckout() {
    syncCartFromStorage();

    if (!cartItems().length) {
        toast("Your cart is empty");
        return;
    }

    // Cart checkout must use ONLY the existing cart items.
    // Remove any previous Buy Now session so it cannot leak into Cart checkout.
    localStorage.removeItem(BUY_NOW_KEY);

    location.href = "checkout.html";
}

// Keep the header/bottom cart count correct when the user returns to
// index.html with the browser Back button. Browsers can restore a page
// from the back-forward cache without executing the initial render again.
window.addEventListener("pageshow", () => {
    syncCartFromStorage();
    render();
});

// If the cart changes in another tab/window, update this page too.
window.addEventListener("storage", event => {
    if (event.key === CART_KEY || event.key === "kamagereCart") {
        migrateOldProductCart();
        syncCartFromStorage();
        render();
    }
});

// Also refresh when the tab becomes visible again.
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        syncCartFromStorage();
        render();
    }
});

render();
