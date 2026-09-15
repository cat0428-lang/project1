const API_URL = "https://script.google.com/macros/s/AKfycbxOHLI_PtbSPfatjAdmxasgTwjYYV8nB5LDPMpE2ox3QOr-OWmCv8O1yECRnumMLlMM/exec";

let products = [];
let cart = [];
let isAdminMode = false;

const productsGrid = document.getElementById("productsGrid");
const cartItems = document.getElementById("cartItems");
const cartCount = document.getElementById("cartCount");
const cartTotal = document.getElementById("cartTotal");
const customerName = document.getElementById("customerName");
const checkoutButton = document.getElementById("checkoutButton");
const loadingOverlay = document.getElementById("loadingOverlay");
const loadingText = document.getElementById("loadingText");
const toastContainer = document.getElementById("toastContainer");
const adminToggle = document.getElementById("adminToggle");
const adminPanel = document.getElementById("adminPanel");
const productForm = document.getElementById("productForm");

function showLoading(message = "處理中...") {
    loadingText.textContent = message;
    loadingOverlay.classList.add("show");
    loadingOverlay.setAttribute("aria-busy", "true");
}

function hideLoading() {
    loadingOverlay.classList.remove("show");
    loadingOverlay.setAttribute("aria-busy", "false");
}

function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast ${type === "error" ? "error" : ""}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    window.setTimeout(() => {
        toast.remove();
    }, 3500);
}

function checkApiUrl() {
    const placeholderPatterns = [
        "YOUR_SCRIPT_ID",
        "your_script_id",
        "script.google.com/macros/s/",
        "example.com",
        "replace-me"
    ];

    const isPlaceholder = !API_URL || placeholderPatterns.some(pattern => API_URL.includes(pattern));

    if (isPlaceholder) {
        showToast("請先設定有效的 API_URL。", "error");
        return false;
    }

    return true;
}

async function loadProducts() {
    if (!checkApiUrl()) {
        renderDemoMessage();
        return;
    }

    showLoading("正在載入花藝商品...");

    try {
        const response = await fetch(`${API_URL}?action=read`, {
            method: "GET",
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(`讀取失敗，HTTP ${response.status}`);
        }

        const result = await response.json();

        if (result.status !== "success") {
            throw new Error(result.message || "讀取商品資料失敗。");
        }

        products = Array.isArray(result.data) ? result.data : [];
        renderProducts();
    } catch (error) {
        console.error(error);
        products = [];
        renderProducts();
        showToast(`載入失敗：${error.message}`, "error");
    } finally {
        hideLoading();
    }
}

function renderDemoMessage() {
    productsGrid.innerHTML = `
        <div class="empty-products">
            <strong>請先設定有效的 API_URL</strong>
            <br><br>
            目前 JavaScript 需要正確的
            <code>API_URL</code>
            才能連接到 Google Apps Script Web App。
        </div>
    `;
}

function getFallbackSvg() {
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
            <defs>
                <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#ffdce6"/>
                    <stop offset="100%" stop-color="#bdefff"/>
                </linearGradient>
            </defs>
            <rect width="800" height="600" fill="url(#bg)"/>
            <circle cx="400" cy="270" r="95" fill="#fff" opacity=".65"/>
            <text x="400" y="300" text-anchor="middle" font-size="100">❀</text>
            <text x="400" y="410" text-anchor="middle" font-size="28" fill="#36515a">Spring Bloom</text>
        </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function normalizeImageUrl(value) {
    if (!value) return "";

    let raw = String(value).trim();
    if (!raw) return "";

    raw = raw.replace(/<!--.*?-->/gs, "");
    const urls = raw.match(/https?:\/\/[^\s<>'")\]]+/g) || [];
    const firstUrl = urls[0] || raw;
    let url = firstUrl.replace(/[\])}>\"']+$/, "");

    if (!url || !/^https?:\/\//.test(url)) {
        return "";
    }

    if (url.includes("images.unsplash.com/") && url.includes("photo-")) {
        return url;
    }

    if (url.includes("source.unsplash.com/")) {
        return url;
    }

    if (url.includes("unsplash.com/")) {
        const idMatch = url.match(/(?:\/photos\/.*-)?([A-Za-z0-9_-]{10,})(?:[?#].*)?$/);
        const photoId = idMatch ? idMatch[1] : "";
        if (photoId) {
            return `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=1200&q=80`;
        }
    }

    return url;
}

function createProductCard(product) {
    const card = document.createElement("article");
    card.className = "product-card";

    const id = String(product.id ?? "");
    const name = String(product.name ?? "未命名商品");
    const category = String(product.category ?? "花藝");
    const description = String(product.description ?? "精緻花藝商品，適合各種場合。") ;
    const price = Number(product.price) || 0;
    const imageUrl = normalizeImageUrl(product.imageUrl ?? "");

    card.innerHTML = `
        <div class="product-image-wrap">
            <img
                class="product-image"
                src="${escapeHtml(imageUrl)}"
                alt="${escapeHtml(name)}"
                loading="lazy">

            <span class="category-badge">${escapeHtml(category)}</span>

            <button
                class="delete-button"
                type="button"
                data-delete-id="${escapeHtml(id)}"
                aria-label="刪除 ${escapeHtml(name)}">
                ✕
            </button>
        </div>

        <div class="product-content">
            <h3>${escapeHtml(name)}</h3>
            <p class="product-description">${escapeHtml(description)}</p>

            <div class="product-footer">
                <div class="product-price">NT$ ${formatNumber(price)}</div>

                <button
                    class="add-button"
                    type="button"
                    data-add-id="${escapeHtml(id)}">
                    加入購物車
                </button>
            </div>
        </div>
    `;

    const image = card.querySelector(".product-image");
    image.addEventListener("error", () => {
        image.src = getFallbackSvg();
    }, { once: true });

    return card;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatNumber(value) {
    return Number(value || 0).toLocaleString("zh-TW");
}

function renderProducts() {
    productsGrid.innerHTML = "";

    if (!products.length) {
        productsGrid.innerHTML = `
            <div class="empty-products">目前沒有可顯示的商品。</div>
        `;
        return;
    }

    products.forEach(product => {
        productsGrid.appendChild(createProductCard(product));
    });
}

function addToCart(productId) {
    const product = products.find(item => String(item.id) === String(productId));

    if (!product) {
        showToast("找不到此商品。", "error");
        return;
    }

    const existingItem = cart.find(item => String(item.id) === String(product.id));

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: Number(product.price) || 0,
            quantity: 1
        });
    }

    renderCart();
    showToast(`已加入購物車：${product.name}`);
}

function changeQuantity(productId, delta) {
    const item = cart.find(cartItem => String(cartItem.id) === String(productId));

    if (!item) return;

    item.quantity += delta;

    if (item.quantity <= 0) {
        cart = cart.filter(cartItem => String(cartItem.id) !== String(productId));
    }

    renderCart();
}

function calculateTotal() {
    return cart.reduce((total, item) => total + (Number(item.price) * Number(item.quantity)), 0);
}

function renderCart() {
    const totalQuantity = cart.reduce((total, item) => total + item.quantity, 0);
    const totalPrice = calculateTotal();

    cartCount.textContent = totalQuantity;
    cartTotal.textContent = formatNumber(totalPrice);
    checkoutButton.disabled = cart.length === 0;
    cartItems.innerHTML = "";

    if (!cart.length) {
        cartItems.innerHTML = `
            <div class="cart-empty">購物車目前是空的，<br>先挑選幾樣花藝吧！</div>
        `;
        return;
    }

    cart.forEach(item => {
        const element = document.createElement("div");
        element.className = "cart-item";

        element.innerHTML = `
            <div>
                <div class="cart-item-name">${escapeHtml(item.name)}</div>
                <div class="cart-item-price">NT$ ${formatNumber(item.price)}</div>
            </div>

            <div class="quantity-controls">
                <button class="quantity-button" type="button" data-minus-id="${escapeHtml(item.id)}" aria-label="減少數量">−</button>
                <span class="quantity-number">${item.quantity}</span>
                <button class="quantity-button" type="button" data-plus-id="${escapeHtml(item.id)}" aria-label="增加數量">＋</button>
            </div>
        `;

        cartItems.appendChild(element);
    });
}

async function postJson(payload) {
    if (!checkApiUrl()) {
        throw new Error("請先設定有效的 API_URL");
    }

    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`請求失敗，HTTP ${response.status}`);
    }

    const result = await response.json();

    if (result.status !== "success") {
        throw new Error(result.message || "API 回應失敗。");
    }

    return result;
}

async function addProduct(event) {
    event.preventDefault();

    const name = document.getElementById("productName").value.trim();
    const category = document.getElementById("productCategory").value.trim();
    const description = document.getElementById("productDescription").value.trim();
    const price = Number(document.getElementById("productPrice").value);
    const imageUrl = normalizeImageUrl(document.getElementById("productImageUrl").value.trim());

    if (!name || !category || !description || !Number.isFinite(price) || price < 0 || !imageUrl) {
        showToast("請填寫完整的商品資料。", "error");
        return;
    }

    showLoading("正在新增商品...");

    try {
        await postJson({
            action: "add",
            name,
            category,
            description,
            price,
            imageUrl,
            status: "上架中"
        });

        productForm.reset();
        await loadProducts();
        showToast("商品新增成功！");
    } catch (error) {
        console.error(error);
        showToast(`新增失敗：${error.message}`, "error");
    } finally {
        hideLoading();
    }
}

async function deleteProduct(productId) {
    const product = products.find(item => String(item.id) === String(productId));

    if (!product) return;

    const confirmed = window.confirm(`確定要刪除「${product.name}」嗎？`);
    if (!confirmed) return;

    showLoading("正在刪除商品...");

    try {
        await postJson({
            action: "delete",
            id: productId
        });

        cart = cart.filter(item => String(item.id) !== String(productId));
        renderCart();
        await loadProducts();
        showToast("商品刪除成功！");
    } catch (error) {
        console.error(error);
        showToast(`刪除失敗：${error.message}`, "error");
    } finally {
        hideLoading();
    }
}

async function submitOrder() {
    const name = customerName.value.trim();

    if (!name) {
        showToast("請先輸入顧客姓名。", "error");
        customerName.focus();
        return;
    }

    if (!cart.length) {
        showToast("購物車目前沒有商品。", "error");
        return;
    }

    const totalPrice = calculateTotal();
    const orderItems = cart.map(item => ({
        id: item.id,
        name: item.name,
        price: Number(item.price),
        quantity: Number(item.quantity)
    }));

    showLoading("正在送出您的訂單...");

    try {
        const result = await postJson({
            action: "order",
            customerName: name,
            items: orderItems,
            totalPrice
        });

        cart = [];
        customerName.value = "";
        renderCart();

        const orderId = result.data?.orderId;
        showToast(orderId ? `訂單成功！訂單編號：${orderId}` : "訂單成功！我們已收到您的訂單。");
    } catch (error) {
        console.error(error);
        showToast(`訂單失敗：${error.message}`, "error");
    } finally {
        hideLoading();
    }
}

function toggleAdminMode() {
    isAdminMode = !isAdminMode;
    adminToggle.classList.toggle("active", isAdminMode);
    adminPanel.classList.toggle("open", isAdminMode);
    document.body.classList.toggle("admin-mode", isAdminMode);
    adminToggle.textContent = isAdminMode ? "✕ 關閉管理員模式" : "⚙ 切換為管理員模式";
    showToast(isAdminMode ? "已開啟管理員模式" : "已關閉管理員模式");
}

productsGrid.addEventListener("click", event => {
    const addButton = event.target.closest("[data-add-id]");
    if (addButton) {
        addToCart(addButton.dataset.addId);
        return;
    }

    const deleteButton = event.target.closest("[data-delete-id]");
    if (deleteButton) {
        if (!isAdminMode) return;
        deleteProduct(deleteButton.dataset.deleteId);
    }
});

cartItems.addEventListener("click", event => {
    const plusButton = event.target.closest("[data-plus-id]");
    if (plusButton) {
        changeQuantity(plusButton.dataset.plusId, 1);
        return;
    }

    const minusButton = event.target.closest("[data-minus-id]");
    if (minusButton) {
        changeQuantity(minusButton.dataset.minusId, -1);
    }
});

adminToggle.addEventListener("click", toggleAdminMode);
productForm.addEventListener("submit", addProduct);
checkoutButton.addEventListener("click", submitOrder);

document.addEventListener("DOMContentLoaded", () => {
    renderCart();
    loadProducts();
});
