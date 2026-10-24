// ===== Guled Restaurant & Dining — Frontend Logic =====

let menuItems = [];
let cart = [];
let activeCategory = "all";

// ---- DOM refs ----
const menuGrid = document.getElementById("menu-grid");
const categoryTabs = document.getElementById("category-tabs");
const cartBtn = document.getElementById("cart-btn");
const cartCount = document.getElementById("cart-count");
const cartSidebar = document.getElementById("cart-sidebar");
const cartOverlay = document.getElementById("cart-overlay");
const cartClose = document.getElementById("cart-close");
const cartBody = document.getElementById("cart-body");
const cartFooter = document.getElementById("cart-footer");
const cartTotal = document.getElementById("cart-total");
const checkoutBtn = document.getElementById("checkout-btn");
const checkoutModal = document.getElementById("checkout-modal");
const checkoutClose = document.getElementById("checkout-close");
const checkoutForm = document.getElementById("checkout-form");
const checkoutError = document.getElementById("checkout-error");
const checkoutSubmit = document.getElementById("checkout-submit");
const confirmModal = document.getElementById("confirm-modal");
const confirmClose = document.getElementById("confirm-close");
const confirmMsg = document.getElementById("confirm-msg");
const confirmDetails = document.getElementById("confirm-details");

// ---- Utils ----
function formatKsh(n) {
    return "KSH " + Number(n).toLocaleString("en-KE");
}

function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
}

// ---- Menu ----
async function loadMenu() {
    try {
        const res = await fetch("/api/menu");
        if (!res.ok) throw new Error("Failed to load menu");
        menuItems = await res.json();
        renderMenu();
    } catch (err) {
        menuGrid.innerHTML = '<div class="menu-loading">Could not load the menu. Please try again later.</div>';
        console.error(err);
    }
}

function renderMenu() {
    const filtered = activeCategory === "all"
        ? menuItems
        : menuItems.filter(item => item.category === activeCategory);

    if (filtered.length === 0) {
        menuGrid.innerHTML = '<div class="menu-loading">No items in this category.</div>';
        return;
    }

    menuGrid.innerHTML = filtered.map(item => `
        <article class="menu-card" data-id="${item.id}">
            <img class="menu-card-img" src="${item.image_url}" alt="${escapeHtml(item.name)}" loading="lazy">
            <div class="menu-card-body">
                <span class="menu-card-cat">${escapeHtml(item.category)}</span>
                <h3 class="menu-card-name">${escapeHtml(item.name)}</h3>
                <p class="menu-card-desc">${escapeHtml(item.description)}</p>
                <div class="menu-card-bottom">
                    <span class="menu-card-price">${formatKsh(item.price)}</span>
                    <button class="add-btn" data-id="${item.id}">
                        <svg viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
                        Add
                    </button>
                </div>
            </div>
        </article>
    `).join("");

    menuGrid.querySelectorAll(".add-btn").forEach(btn => {
        btn.addEventListener("click", () => addToCart(btn.dataset.id, btn));
    });
}

// Category tabs
categoryTabs.querySelectorAll(".cat-tab").forEach(tab => {
    tab.addEventListener("click", () => {
        categoryTabs.querySelector(".active").classList.remove("active");
        tab.classList.add("active");
        activeCategory = tab.dataset.cat;
        renderMenu();
    });
});

// ---- Cart ----
function addToCart(id, btn) {
    const item = menuItems.find(i => i.id === id);
    if (!item) return;

    const existing = cart.find(c => c.id === id);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ id: item.id, name: item.name, price: item.price, image_url: item.image_url, qty: 1 });
    }

    // Button feedback
    if (btn) {
        const original = btn.innerHTML;
        btn.classList.add("added");
        btn.innerHTML = '<svg viewBox="0 0 20 20" fill="none"><path d="M5 10l3 3 7-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> Added';
        setTimeout(() => {
            btn.classList.remove("added");
            btn.innerHTML = original;
        }, 1200);
    }

    updateCart();
    openCart();
}

function updateQty(id, delta) {
    const item = cart.find(c => c.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
        cart = cart.filter(c => c.id !== id);
    }
    updateCart();
}

function removeFromCart(id) {
    cart = cart.filter(c => c.id !== id);
    updateCart();
}

function cartTotalAmount() {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function cartCountTotal() {
    return cart.reduce((sum, item) => sum + item.qty, 0);
}

function updateCart() {
    const count = cartCountTotal();
    cartCount.textContent = count;
    cartCount.setAttribute("data-count", count);

    if (cart.length === 0) {
        cartBody.innerHTML = `
            <div class="cart-empty">
                <svg viewBox="0 0 48 48" fill="none"><path d="M10 12h28l-3 18a3 3 0 0 1-3 2.5H16a3 3 0 0 1-3-2.5L10 12zM10 12 9 6H5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="18" cy="36" r="2.5" stroke="currentColor" stroke-width="1.4"/><circle cx="30" cy="36" r="2.5" stroke="currentColor" stroke-width="1.4"/></svg>
                <p>Your cart is empty.</p>
                <span>Browse the menu and add some dishes!</span>
            </div>`;
        cartFooter.style.display = "none";
    } else {
        cartBody.innerHTML = cart.map(item => `
            <div class="cart-item" data-id="${item.id}">
                <img class="cart-item-img" src="${item.image_url}" alt="${escapeHtml(item.name)}">
                <div class="cart-item-info">
                    <div class="cart-item-name">${escapeHtml(item.name)}</div>
                    <div class="cart-item-price">${formatKsh(item.price)} each</div>
                    <div class="cart-item-controls">
                        <button class="qty-btn" data-action="decrease" data-id="${item.id}" aria-label="Decrease quantity">&minus;</button>
                        <span class="qty-val">${item.qty}</span>
                        <button class="qty-btn" data-action="increase" data-id="${item.id}" aria-label="Increase quantity">+</button>
                        <button class="cart-item-remove" data-action="remove" data-id="${item.id}">Remove</button>
                    </div>
                </div>
            </div>
        `).join("");

        cartFooter.style.display = "block";
        cartTotal.textContent = formatKsh(cartTotalAmount());

        cartBody.querySelectorAll("[data-action]").forEach(el => {
            el.addEventListener("click", () => {
                const action = el.dataset.action;
                const id = el.dataset.id;
                if (action === "increase") updateQty(id, 1);
                else if (action === "decrease") updateQty(id, -1);
                else if (action === "remove") removeFromCart(id);
            });
        });
    }
}

// ---- Cart sidebar open/close ----
function openCart() {
    cartSidebar.classList.add("open");
    cartOverlay.classList.add("open");
}

function closeCart() {
    cartSidebar.classList.remove("open");
    cartOverlay.classList.remove("open");
}

cartBtn.addEventListener("click", openCart);
cartClose.addEventListener("click", closeCart);
cartOverlay.addEventListener("click", closeCart);

// ---- Checkout ----
checkoutBtn.addEventListener("click", () => {
    if (cart.length === 0) return;
    closeCart();
    checkoutError.classList.remove("show");
    checkoutModal.classList.add("open");
});

checkoutClose.addEventListener("click", () => {
    checkoutModal.classList.remove("open");
});

checkoutModal.addEventListener("click", (e) => {
    if (e.target === checkoutModal) checkoutModal.classList.remove("open");
});

checkoutForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    checkoutError.classList.remove("show");

    const name = document.getElementById("co-name").value.trim();
    const phone = document.getElementById("co-phone").value.trim();
    const address = document.getElementById("co-address").value.trim();
    const notes = document.getElementById("co-notes").value.trim();

    if (!name || !phone || !address) {
        checkoutError.textContent = "Please fill in your name, phone, and delivery address.";
        checkoutError.classList.add("show");
        return;
    }

    const items = cart.map(c => ({
        id: c.id,
        name: c.name,
        price: c.price,
        qty: c.qty,
    }));
    const total = cartTotalAmount();

    checkoutSubmit.disabled = true;
    checkoutSubmit.textContent = "Placing order...";

    try {
        const res = await fetch("/api/order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ customer_name: name, phone, address, items, total, notes }),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || "Something went wrong. Please try again.");
        }

        // Show confirmation
        checkoutModal.classList.remove("open");
        checkoutForm.reset();

        const order = data.order;
        confirmMsg.textContent = `Thanks ${name.split(" ")[0]}! We've received your order and will call ${phone} to confirm shortly.`;

        confirmDetails.innerHTML = `
            <div class="confirm-details-row"><span>Order ID</span><span>${order.id.substring(0, 8).toUpperCase()}</span></div>
            <div class="confirm-details-row"><span>Items</span><span>${cartCountTotal()} dish${cartCountTotal() > 1 ? "es" : ""}</span></div>
            <div class="confirm-details-row"><span>Delivery to</span><span>${escapeHtml(address.substring(0, 40))}${address.length > 40 ? "..." : ""}</span></div>
            <div class="confirm-details-row"><span>Total</span><span>${formatKsh(total)}</span></div>
            <div class="confirm-details-row"><span>Payment</span><span>Cash / M-Pesa on delivery</span></div>
        `;

        confirmModal.classList.add("open");

        // Clear cart
        cart = [];
        updateCart();
    } catch (err) {
        checkoutError.textContent = err.message;
        checkoutError.classList.add("show");
    } finally {
        checkoutSubmit.disabled = false;
        checkoutSubmit.textContent = "Place order";
    }
});

confirmClose.addEventListener("click", () => {
    confirmModal.classList.remove("open");
});

confirmModal.addEventListener("click", (e) => {
    if (e.target === confirmModal) confirmModal.classList.remove("open");
});

// ---- Chat ----
const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");
const chatMessages = document.getElementById("chat-messages");

function addChatMessage(sender, text) {
    const div = document.createElement("div");
    div.className = `msg ${sender}`;
    const p = document.createElement("p");
    p.textContent = text;
    div.appendChild(p);
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = messageInput.value.trim();
    if (!msg) return;

    addChatMessage("user", msg);
    messageInput.value = "";

    try {
        const res = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: msg }),
        });
        const data = await res.json();
        addChatMessage("bot", data.reply || "Sorry, I didn't get that.");
    } catch (err) {
        addChatMessage("bot", "Sorry, I couldn't connect. Please try again.");
    }
});

// ---- Init ----
loadMenu();
