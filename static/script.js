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

const STAR_SVG = '<svg viewBox="0 0 20 20"><path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 15l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z" fill="currentColor"/></svg>';

function renderStars(rating, containerClass) {
    let html = "";
    for (let i = 1; i <= 5; i++) {
        html += `<span class="${i <= rating ? "star-filled" : "star-empty"}">${STAR_SVG}</span>`;
    }
    return html;
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" });
}

// ---- Reviews data cache ----
let reviewsCache = {};
let currentReviewItemId = null;
let selectedRating = 0;

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
                <div class="menu-card-rating" data-item-id="${item.id}">
                    <span class="stars-display">${renderStars(0, "")}</span>
                    <span class="rating-number">—</span>
                    <span class="rating-count">0</span>
                </div>
                <div class="menu-card-bottom">
                    <span class="menu-card-price">${formatKsh(item.price)}</span>
                    <div class="menu-card-actions">
                        <button class="reviews-btn" data-reviews="${item.id}">
                            <svg viewBox="0 0 20 20" fill="none"><path d="M3 5h14v9H8l-3 3v-3H3z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
                            Reviews
                        </button>
                        <button class="add-btn" data-id="${item.id}">
                            <svg viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
                            Add
                        </button>
                    </div>
                </div>
            </div>
        </article>
    `).join("");

    menuGrid.querySelectorAll(".add-btn").forEach(btn => {
        btn.addEventListener("click", () => addToCart(btn.dataset.id, btn));
    });

    menuGrid.querySelectorAll("[data-reviews]").forEach(btn => {
        btn.addEventListener("click", () => openReviewsModal(btn.dataset.reviews));
    });

    // Load ratings summary for visible items
    filtered.forEach(item => loadRatingSummary(item.id));
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

// ---- Reviews ----
async function loadRatingSummary(itemId) {
    if (reviewsCache[itemId]) {
        updateRatingDisplay(itemId, reviewsCache[itemId]);
        return;
    }
    try {
        const res = await fetch(`/api/reviews/${itemId}`);
        if (!res.ok) return;
        const reviews = await res.json();
        reviewsCache[itemId] = reviews;
        updateRatingDisplay(itemId, reviews);
    } catch (err) {
        // silently fail — ratings are non-critical
    }
}

function updateRatingDisplay(itemId, reviews) {
    const el = menuGrid.querySelector(`.menu-card-rating[data-item-id="${itemId}"]`);
    if (!el) return;
    if (!reviews || reviews.length === 0) {
        el.querySelector(".stars-display").innerHTML = renderStars(0, "");
        el.querySelector(".rating-number").textContent = "—";
        el.querySelector(".rating-count").textContent = "0";
        return;
    }
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    const rounded = Math.round(avg);
    el.querySelector(".stars-display").innerHTML = renderStars(rounded, "");
    el.querySelector(".rating-number").textContent = avg.toFixed(1);
    el.querySelector(".rating-count").textContent = String(reviews.length);
}

const reviewsModal = document.getElementById("reviews-modal");
const reviewsClose = document.getElementById("reviews-close");
const reviewsList = document.getElementById("reviews-list");
const reviewsItemImg = document.getElementById("reviews-item-img");
const reviewsItemName = document.getElementById("reviews-item-name");
const reviewsSummary = document.getElementById("reviews-summary");
const reviewForm = document.getElementById("review-form");
const reviewError = document.getElementById("review-error");
const reviewSubmit = document.getElementById("review-submit");
const starInput = document.getElementById("star-input");

function openReviewsModal(itemId) {
    const item = menuItems.find(i => i.id === itemId);
    if (!item) return;
    currentReviewItemId = itemId;
    reviewsItemImg.src = item.image_url;
    reviewsItemImg.alt = item.name;
    reviewsItemName.textContent = item.name;
    reviewForm.reset();
    reviewError.classList.remove("show");
    selectedRating = 0;
    updateStarInput();
    reviewsList.innerHTML = '<div class="reviews-empty">Loading reviews...</div>';
    reviewsSummary.innerHTML = "";
    reviewsModal.classList.add("open");
    loadReviews(itemId);
}

function closeReviewsModal() {
    reviewsModal.classList.remove("open");
    currentReviewItemId = null;
}

reviewsClose.addEventListener("click", closeReviewsModal);
reviewsModal.addEventListener("click", (e) => {
    if (e.target === reviewsModal) closeReviewsModal();
});

async function loadReviews(itemId) {
    try {
        const res = await fetch(`/api/reviews/${itemId}`);
        if (!res.ok) throw new Error("Failed to load reviews");
        const reviews = await res.json();
        reviewsCache[itemId] = reviews;
        renderReviewsList(reviews);
        updateRatingDisplay(itemId, reviews);
    } catch (err) {
        reviewsList.innerHTML = '<div class="reviews-empty">Could not load reviews. Please try again.</div>';
    }
}

function renderReviewsList(reviews) {
    // Summary
    if (reviews.length === 0) {
        reviewsSummary.innerHTML = '<span class="total">No reviews yet — be the first!</span>';
    } else {
        const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
        reviewsSummary.innerHTML = `
            <span class="stars-display">${renderStars(Math.round(avg), "")}</span>
            <span class="avg">${avg.toFixed(1)}</span>
            <span class="total">${reviews.length} review${reviews.length > 1 ? "s" : ""}</span>
        `;
    }

    // List
    if (reviews.length === 0) {
        reviewsList.innerHTML = '<div class="reviews-empty">No reviews yet. Share your experience below!</div>';
        return;
    }

    reviewsList.innerHTML = reviews.map(r => `
        <div class="review-item">
            <div class="review-item-header">
                <span class="review-item-author">${escapeHtml(r.author_name)}</span>
                <span class="review-item-date">${formatDate(r.created_at)}</span>
            </div>
            <div class="review-item-stars">${renderStars(r.rating, "")}</div>
            ${r.comment ? `<p class="review-item-comment">${escapeHtml(r.comment)}</p>` : ""}
        </div>
    `).join("");
}

// Interactive star input
starInput.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
        selectedRating = parseInt(btn.dataset.val, 10);
        updateStarInput();
    });
    btn.addEventListener("mouseenter", () => {
        const val = parseInt(btn.dataset.val, 10);
        starInput.querySelectorAll("button").forEach(b => {
            const bv = parseInt(b.dataset.val, 10);
            b.classList.toggle("active", bv <= val);
        });
    });
});

starInput.addEventListener("mouseleave", updateStarInput);

function updateStarInput() {
    starInput.querySelectorAll("button").forEach(b => {
        const bv = parseInt(b.dataset.val, 10);
        b.classList.toggle("active", bv <= selectedRating);
    });
}

reviewForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    reviewError.classList.remove("show");

    if (!currentReviewItemId) return;

    const name = document.getElementById("review-name").value.trim();
    const comment = document.getElementById("review-comment").value.trim();

    if (!name) {
        reviewError.textContent = "Please enter your name.";
        reviewError.classList.add("show");
        return;
    }

    if (selectedRating === 0) {
        reviewError.textContent = "Please select a star rating.";
        reviewError.classList.add("show");
        return;
    }

    reviewSubmit.disabled = true;
    reviewSubmit.textContent = "Submitting...";

    try {
        const res = await fetch("/api/reviews", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                menu_item_id: currentReviewItemId,
                author_name: name,
                rating: selectedRating,
                comment: comment,
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || "Something went wrong. Please try again.");
        }

        // Reload reviews to show the new one
        reviewForm.reset();
        selectedRating = 0;
        updateStarInput();
        await loadReviews(currentReviewItemId);
    } catch (err) {
        reviewError.textContent = err.message;
        reviewError.classList.add("show");
    } finally {
        reviewSubmit.disabled = false;
        reviewSubmit.textContent = "Submit review";
    }
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
