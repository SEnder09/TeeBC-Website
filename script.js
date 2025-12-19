// Sample Product Data
const products = [
    { id: 1, name: "Anime T-Shirt", price: 29.99, originalPrice: 39.99, category: "anime", image: "img/Anime_T.png", size: ["S", "M", "L", "XL"], colors: ["Black", "White", "Navy", "Gray"] },
    { id: 2, name: "Movie Poster", price: 19.99, originalPrice: 24.99, category: "movies", image: "img/Movie_Poster.png", size: ["One Size"] },
    { id: 3, name: "Meme Bag", price: 14.99, originalPrice: 19.99, category: "memes", image: "img/meme_mugbag.png", size: ["One Size"] },
    { id: 5, name: "Anime Hoodie", price: 49.99, originalPrice: 59.99, category: "anime", image: "img/Anime_hoodie.png", size: ["S", "M", "L", "XL"] },
    // { id: 1, name: "Anime T-Shirt", price: 29.99, originalPrice: 39.99, category: "anime", image: "https://via.placeholder.com/300x300?text=Anime+T-Shirt", size: ["S", "M", "L", "XL"] },
    // { id: 2, name: "Movie Poster", price: 19.99, originalPrice: 24.99, category: "movies", image: "https://via.placeholder.com/300x300?text=Movie+Poster", size: ["One Size"] },
    // { id: 3, name: "Meme Mug", price: 14.99, originalPrice: 19.99, category: "memes", image: "https://via.placeholder.com/300x300?text=Meme+Mug", size: ["One Size"] },
    // { id: 5, name: "Anime Hoodie", price: 49.99, originalPrice: 59.99, category: "anime", image: "https://via.placeholder.com/300x300?text=Anime+Hoodie", size: ["S", "M", "L", "XL"] },
    { id: 6, name: "Meme Mug", price: 14.99, originalPrice: 19.99, category: "memes", image: "img/Meme_mug.png", size: ["One Size"] },
    { id: 7, name: "Meme Sticker Pack", price: 9.99, originalPrice: 14.99, category: "memes", image: "img/Meme_stickers.png", size: ["One Size"] },
    { id: 10, name: "Movie Blu-ray", price: 24.99, originalPrice: 29.99, category: "movies", image: "img/Movie_2.png", size: ["One Size"] },
    { id: 11, name: "Meme T-Shirt", price: 27.99, originalPrice: 37.99, category: "memes", image: "img/meme_T.png", size: ["S", "M", "L", "XL"], colors: ["Black", "White", "Red", "Blue"] }
];

// Cart Management
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// User State Management
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('currentUser')) || null;
}

function setCurrentUser(user) {
    if (user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('isLoggedIn', 'true');
    } else {
        localStorage.removeItem('currentUser');
        localStorage.setItem('isLoggedIn', 'false');
    }
    updateNavigation();
    
    // Notify nav-manager of user state change
    if (typeof navManager !== 'undefined' && navManager.updateNavigation) {
        navManager.updateNavigation();
    }
    
    // Dispatch custom event
    window.dispatchEvent(new Event(user ? 'userLogin' : 'userLogout'));
}

function isLoggedIn() {
    return localStorage.getItem('isLoggedIn') === 'true' && getCurrentUser() !== null;
}

function logout() {
    // Use authManager if available
    if (typeof authManager !== 'undefined' && authManager.logout) {
        authManager.logout();
    } else {
        setCurrentUser(null);
    }
    
    // Optionally clear cart on logout (or keep it)
    // cart = [];
    // localStorage.setItem('cart', JSON.stringify([]));
    
    // Update cart count
    updateCartCount();
    
    // Notify nav-manager
    if (typeof navManager !== 'undefined') {
        if (navManager.updateNavigation) {
            navManager.updateNavigation();
        }
        if (navManager.updateCartBadge) {
            navManager.updateCartBadge();
        }
        // Use nav-manager's logout handler for consistent behavior
        if (navManager.handleLogout) {
            navManager.handleLogout();
            return; // nav-manager will handle redirect
        }
    }
    
    // Dispatch logout event
    window.dispatchEvent(new Event('userLogout'));
    
    // Redirect to home page
    window.location.href = 'index.html';
}

function getUserOrders() {
    const user = getCurrentUser();
    if (!user) return [];
    
    // Use orderManager if available, otherwise fallback to direct localStorage access
    if (typeof orderManager !== 'undefined' && orderManager.getUserOrders) {
        return orderManager.getUserOrders(user.email);
    }
    
    const allOrders = JSON.parse(localStorage.getItem('orders')) || [];
    return allOrders.filter(order => order.email === user.email);
}

function getUserEmails() {
    const user = getCurrentUser();
    if (!user) return [];
    const allEmails = JSON.parse(localStorage.getItem('userEmails')) || {};
    return allEmails[user.email] || [];
}

function addUserEmail(emailData) {
    const user = getCurrentUser();
    if (!user) return;
    const allEmails = JSON.parse(localStorage.getItem('userEmails')) || {};
    if (!allEmails[user.email]) {
        allEmails[user.email] = [];
    }
    allEmails[user.email].unshift(emailData);
    localStorage.setItem('userEmails', JSON.stringify(allEmails));
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeCart();
    initializeNavigation();
    
    // Update navigation (nav-manager will handle this if available)
    // Otherwise fallback to script.js updateNavigation
    if (typeof navManager === 'undefined' || !navManager.updateNavigation) {
        updateNavigation();
    }
    
    // Load products based on page
    if (document.getElementById('featured-products')) {
        loadFeaturedProducts();
    }
    if (document.getElementById('products-grid')) {
        loadAllProducts();
        initializeFilters();
    }
    if (document.getElementById('product-title')) {
        loadProductDetail();
        initializeProductGallery();
    }
    if (document.getElementById('related-products')) {
        loadRelatedProducts();
    }
});

// Cart Functions
function initializeCart() {
    updateCartCount();
    renderCart();
    
    const cartLink = document.getElementById('cart-link');
    const cartOverlay = document.getElementById('cart-overlay');
    const closeCart = document.getElementById('close-cart');
    
    if (cartLink) {
        cartLink.addEventListener('click', function(e) {
            e.preventDefault();
            openCart();
        });
    }
    
    if (cartOverlay) {
        cartOverlay.addEventListener('click', closeCartSidebar);
    }
    
    if (closeCart) {
        closeCart.addEventListener('click', closeCartSidebar);
    }
}

function openCart() {
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartOverlay = document.getElementById('cart-overlay');
    if (cartSidebar) cartSidebar.classList.add('open');
    if (cartOverlay) cartOverlay.classList.add('active');
}

function closeCartSidebar() {
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartOverlay = document.getElementById('cart-overlay');
    if (cartSidebar) cartSidebar.classList.remove('open');
    if (cartOverlay) cartOverlay.classList.remove('active');
}

function addToCart(productId, size = 'M', quantity = 1, color = null) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const cartItem = {
        id: Date.now(),
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        size: size,
        quantity: quantity,
        color: color || null
    };
    
    cart.push(cartItem);
    saveCart();
    updateCartCount();
    renderCart();
    openCart();
}

function removeFromCart(cartItemId) {
    cart = cart.filter(item => item.id !== cartItemId);
    saveCart();
    updateCartCount();
    renderCart();
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountElements = document.querySelectorAll('.cart-count');
    cartCountElements.forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? 'inline' : 'none';
    });
    
    // Notify nav-manager of cart update
    if (typeof navManager !== 'undefined' && navManager.updateCartBadge) {
        navManager.updateCartBadge();
    }
    
    // Dispatch custom event for cart update
    window.dispatchEvent(new Event('cartUpdated'));
}

function renderCart() {
    const cartItems = document.getElementById('cart-items');
    if (!cartItems) return;
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
        document.getElementById('cart-total').textContent = '0.00';
        return;
    }
    
    let html = '';
    let total = 0;
    
    cart.forEach(item => {
        total += item.price * item.quantity;
        const colorInfo = item.color ? ` | Color: ${item.color}` : '';
        html += `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}" class="cart-item-image">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">$${item.price.toFixed(2)} x ${item.quantity}</div>
                    <div>Size: ${item.size}${colorInfo}</div>
                </div>
                <button class="cart-item-remove" onclick="removeFromCart(${item.id})">&times;</button>
            </div>
        `;
    });
    
    cartItems.innerHTML = html;
    document.getElementById('cart-total').textContent = total.toFixed(2);
    
    // Update checkout button
    const checkoutBtn = document.querySelector('.cart-footer .btn-primary');
    if (checkoutBtn && cart.length > 0) {
        checkoutBtn.onclick = function(e) {
            e.preventDefault();
            window.location.href = 'checkout.html';
        };
    }
}

// Navigation
function initializeNavigation() {
    // Category cards navigation
    const categoryCards = document.querySelectorAll('.category-card');
    categoryCards.forEach(card => {
        card.addEventListener('click', function() {
            const category = this.dataset.category;
            window.location.href = `shop.html?category=${category}`;
        });
    });
}

function updateNavigation() {
    const loginLink = document.getElementById('login-link');
    if (!loginLink) return;
    
    const user = getCurrentUser();
    const navMenu = loginLink.closest('ul');
    
    if (user && isLoggedIn()) {
        // Remove login link
        const loginListItem = loginLink.parentElement;
        
        // Create user dropdown
        const userDropdown = document.createElement('li');
        userDropdown.className = 'user-dropdown';
        userDropdown.innerHTML = `
            <div class="user-menu">
                <a href="#" class="user-name">${user.name || user.email} ▼</a>
                <div class="user-dropdown-menu">
                    <a href="profile.html">Profile</a>
                    <a href="orders.html">Order History</a>
                    <a href="#" id="logout-link">Logout</a>
                </div>
            </div>
        `;
        
        loginListItem.replaceWith(userDropdown);
        
        // Add logout handler
        const logoutLink = document.getElementById('logout-link');
        if (logoutLink) {
            logoutLink.addEventListener('click', function(e) {
                e.preventDefault();
                logout();
            });
        }
    } else {
        // Show login link if not logged in
        const userDropdown = document.querySelector('.user-dropdown');
        if (userDropdown) {
            userDropdown.outerHTML = '<li><a href="login.html" id="login-link">Login/Register</a></li>';
        }
    }
}

// Product Loading
function loadFeaturedProducts() {
    const container = document.getElementById('featured-products');
    if (!container) return;
    
    const featured = products.slice(0, 6);
    container.innerHTML = featured.map(product => createProductCard(product)).join('');
    attachAddToCartListeners();
}

function loadAllProducts() {
    const container = document.getElementById('products-grid');
    if (!container) return;
    
    // Check URL parameters for category filter
    const urlParams = new URLSearchParams(window.location.search);
    const categoryFilter = urlParams.get('category');
    
    let filteredProducts = products;
    if (categoryFilter) {
        filteredProducts = products.filter(p => p.category === categoryFilter);
        // Update active category checkbox
        const checkbox = document.querySelector(`input[value="${categoryFilter}"]`);
        if (checkbox) checkbox.checked = true;
    }
    
    container.innerHTML = filteredProducts.map(product => createProductCard(product)).join('');
    attachAddToCartListeners();
}

function createProductCard(product) {
    const hasDiscount = product.originalPrice > product.price;
    return `
        <div class="product-card" onclick="window.location.href='product.html?id=${product.id}'">
            <img src="${product.image}" alt="${product.name}" class="product-image">
            <div class="product-info">
                <div class="product-name">${product.name}</div>
                <div class="product-price">
                    <span class="current-price">$${product.price.toFixed(2)}</span>
                    ${hasDiscount ? `<span class="original-price">$${product.originalPrice.toFixed(2)}</span>` : ''}
                </div>
                <button class="add-to-cart-btn" data-product-id="${product.id}">Add to Cart</button>
            </div>
        </div>
    `;
}

function attachAddToCartListeners() {
    const buttons = document.querySelectorAll('.add-to-cart-btn');
    buttons.forEach(button => {
        // Remove any existing listeners by cloning the button
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        // Add fresh event listener
        newButton.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            const productId = parseInt(this.dataset.productId);
            if (productId && !isNaN(productId)) {
                addToCart(productId);
            }
        });
    });
}

// Filters
function initializeFilters() {
    const searchInput = document.getElementById('search-input');
    const categoryFilters = document.querySelectorAll('.category-filter');
    const priceSlider = document.getElementById('price-slider');
    const sortSelect = document.getElementById('sort-select');
    const clearFiltersBtn = document.getElementById('clear-filters');
    
    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }
    
    categoryFilters.forEach(checkbox => {
        checkbox.addEventListener('change', applyFilters);
    });
    
    if (priceSlider) {
        // Create bee emoji thumb
        createBeeThumb(priceSlider);
        
        priceSlider.addEventListener('input', function() {
            document.getElementById('max-price').textContent = '$' + this.value;
            updateBeePosition(this);
            applyFilters();
        });
        
        // Update bee position on load
        updateBeePosition(priceSlider);
    }
    
    if (sortSelect) {
        sortSelect.addEventListener('change', applyFilters);
    }
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function() {
            if (searchInput) searchInput.value = '';
            categoryFilters.forEach(cb => cb.checked = false);
            if (priceSlider) {
                priceSlider.value = 200;
                document.getElementById('max-price').textContent = '$200';
                updateBeePosition(priceSlider);
            }
            if (sortSelect) sortSelect.value = 'default';
            applyFilters();
        });
    }
}

function applyFilters() {
    const container = document.getElementById('products-grid');
    if (!container) return;
    
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const selectedCategories = Array.from(document.querySelectorAll('.category-filter:checked')).map(cb => cb.value);
    const maxPrice = parseFloat(document.getElementById('price-slider').value);
    const sortOption = document.getElementById('sort-select').value;
    
    let filtered = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm);
        const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(product.category);
        const matchesPrice = product.price <= maxPrice;
        return matchesSearch && matchesCategory && matchesPrice;
    });
    
    // Sort products
    switch(sortOption) {
        case 'price-low':
            filtered.sort((a, b) => a.price - b.price);
            break;
        case 'price-high':
            filtered.sort((a, b) => b.price - a.price);
            break;
        case 'name-asc':
            filtered.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'name-desc':
            filtered.sort((a, b) => b.name.localeCompare(a.name));
            break;
    }
    
    container.innerHTML = filtered.map(product => createProductCard(product)).join('');
    attachAddToCartListeners();
}

// Product Detail Page
function loadProductDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = parseInt(urlParams.get('id')) || 1;
    const product = products.find(p => p.id === productId) || products[0];
    
    if (!product) {
        console.error('Product not found:', productId);
        return;
    }
    
    // Update product title
    const titleElement = document.getElementById('product-title');
    if (titleElement) {
        titleElement.textContent = product.name;
    }
    
    // Update product price
    const priceElement = document.getElementById('product-price');
    if (priceElement) {
        priceElement.textContent = '$' + product.price.toFixed(2);
    }
    
    // Update original price
    const originalPriceElement = document.getElementById('original-price');
    if (originalPriceElement) {
        if (product.originalPrice && product.originalPrice > product.price) {
            originalPriceElement.textContent = '$' + product.originalPrice.toFixed(2);
            originalPriceElement.style.display = 'inline';
        } else {
            originalPriceElement.style.display = 'none';
        }
    }
    
    // Update product description
    const descriptionElement = document.getElementById('product-description');
    if (descriptionElement) {
        descriptionElement.innerHTML = `<p>This is a detailed description of ${product.name}. It includes all the features, specifications, and benefits that make this product special and worth purchasing.</p>`;
    }
    
    // Update product image
    const mainImageElement = document.getElementById('main-product-image');
    if (mainImageElement && product.image) {
        mainImageElement.src = product.image;
        mainImageElement.alt = product.name;
    }
    
    // Update thumbnail images based on product
    const thumbnailContainer = document.querySelector('.thumbnail-images');
    if (thumbnailContainer) {
        // For Meme Sticker Pack, use the product image as thumbnail
        if (product.id === 7) { // Meme Sticker Pack
            thumbnailContainer.innerHTML = `
                <img src="${product.image}" alt="${product.name}" class="thumbnail active" data-image="${product.image}">
            `;
        } else if (product.id === 1) { // Anime T-Shirt - use multiple thumbnail images
            thumbnailContainer.innerHTML = `
                <img src="img/Anime_T.png" alt="Thumbnail 1" class="thumbnail active" data-image="img/Anime_T.png">
                <img src="img/Anime_T_2.png" alt="Thumbnail 2" class="thumbnail" data-image="img/Anime_T_2.png">
                <img src="img/Anime_T_3.png" alt="Thumbnail 3" class="thumbnail" data-image="img/Anime_T_3.png">
                <img src="img/Anime_T_4.png" alt="Thumbnail 4" class="thumbnail" data-image="img/Anime_T_4.png">
            `;
        } else {
            // For other products, use the product image as the only thumbnail
            thumbnailContainer.innerHTML = `
                <img src="${product.image}" alt="${product.name}" class="thumbnail active" data-image="${product.image}">
            `;
        }
        
        // Re-initialize gallery after updating thumbnails
        initializeProductGallery();
    }
    
    // Size selector
    const sizeSelector = document.querySelector('.size-selector');
    if (sizeSelector) {
        if (product.size && product.size.length > 0) {
            sizeSelector.innerHTML = product.size.map(size => 
                `<button class="size-option ${size === 'M' ? 'active' : ''}" data-size="${size}">${size}</button>`
            ).join('');
            
            // Re-initialize size selector event listeners
            const sizeOptions = sizeSelector.querySelectorAll('.size-option');
            sizeOptions.forEach(option => {
                option.addEventListener('click', function() {
                    sizeOptions.forEach(o => o.classList.remove('active'));
                    this.classList.add('active');
                });
            });
        } else {
            // Hide size selector if product has no sizes
            sizeSelector.style.display = 'none';
        }
    }
    
    // Color selector
    const colorSelectorContainer = document.getElementById('color-selector-container');
    const colorSelector = document.getElementById('color-selector');
    if (colorSelectorContainer && colorSelector) {
        if (product.colors && product.colors.length > 0) {
            colorSelectorContainer.style.display = 'block';
            colorSelector.innerHTML = product.colors.map((color, index) => 
                `<button class="color-option ${index === 0 ? 'active' : ''}" data-color="${color}">${color}</button>`
            ).join('');
            
            // Re-initialize color selector event listeners
            const colorOptions = colorSelector.querySelectorAll('.color-option');
            colorOptions.forEach(option => {
                option.addEventListener('click', function() {
                    colorOptions.forEach(o => o.classList.remove('active'));
                    this.classList.add('active');
                });
            });
        } else {
            // Hide color selector if product has no colors
            colorSelectorContainer.style.display = 'none';
        }
    }
    
    // Add to cart button - remove old listeners and add new one
    const addToCartBtn = document.getElementById('add-to-cart-btn');
    if (addToCartBtn) {
        // Remove existing event listeners by cloning the button
        const newBtn = addToCartBtn.cloneNode(true);
        addToCartBtn.parentNode.replaceChild(newBtn, addToCartBtn);
        
        // Add fresh event listener
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const selectedSizeElement = document.querySelector('.size-option.active');
            const selectedSize = selectedSizeElement ? selectedSizeElement.dataset.size : (product.size && product.size.length > 0 ? product.size[0] : 'M');
            const quantityInput = document.getElementById('quantity');
            const quantity = quantityInput ? parseInt(quantityInput.value) || 1 : 1;
            
            // Validate quantity
            if (quantity < 1 || quantity > 10) {
                alert('Quantity must be between 1 and 10');
                return;
            }
            
            // Get selected color if product has colors
            const selectedColorElement = document.querySelector('.color-option.active');
            const selectedColor = selectedColorElement ? selectedColorElement.dataset.color : (product.colors && product.colors.length > 0 ? product.colors[0] : null);
            
            // Add to cart
            if (typeof addToCart === 'function') {
                addToCart(product.id, selectedSize, quantity, selectedColor);
            } else {
                console.error('addToCart function is not available');
                alert('Unable to add item to cart. Please refresh the page.');
            }
        });
    }
}

function initializeProductGallery() {
    const thumbnails = document.querySelectorAll('.thumbnail');
    const mainImage = document.getElementById('main-product-image');
    
    if (thumbnails.length > 0 && mainImage) {
        thumbnails.forEach(thumbnail => {
            thumbnail.addEventListener('click', function() {
                thumbnails.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                if (this.dataset.image) {
                    mainImage.src = this.dataset.image;
                }
            });
        });
    }
    
    // Quantity controls - remove old listeners and add fresh ones
    const decreaseBtn = document.getElementById('decrease-qty');
    const increaseBtn = document.getElementById('increase-qty');
    const quantityInput = document.getElementById('quantity');
    
    if (decreaseBtn && quantityInput) {
        // Remove existing listeners by cloning the button
        const newDecreaseBtn = decreaseBtn.cloneNode(true);
        decreaseBtn.parentNode.replaceChild(newDecreaseBtn, decreaseBtn);
        
        // Add fresh event listener
        newDecreaseBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const qtyInput = document.getElementById('quantity');
            if (qtyInput) {
                const current = parseInt(qtyInput.value) || 1;
                if (current > 1) {
                    qtyInput.value = current - 1;
                }
            }
        });
    }
    
    if (increaseBtn && quantityInput) {
        // Remove existing listeners by cloning the button
        const newIncreaseBtn = increaseBtn.cloneNode(true);
        increaseBtn.parentNode.replaceChild(newIncreaseBtn, increaseBtn);
        
        // Add fresh event listener
        newIncreaseBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const qtyInput = document.getElementById('quantity');
            if (qtyInput) {
                const current = parseInt(qtyInput.value) || 1;
                if (current < 10) {
                    qtyInput.value = current + 1;
                }
            }
        });
    }
    
    // Size selector - ensure event listeners are attached
    const sizeOptions = document.querySelectorAll('.size-option');
    if (sizeOptions.length > 0) {
        sizeOptions.forEach(option => {
            // Remove existing listeners by cloning
            const newOption = option.cloneNode(true);
            option.parentNode.replaceChild(newOption, option);
            
            // Add fresh event listener
            newOption.addEventListener('click', function() {
                document.querySelectorAll('.size-option').forEach(o => o.classList.remove('active'));
                this.classList.add('active');
            });
        });
    }
}

function loadRelatedProducts() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = parseInt(urlParams.get('id')) || 1;
    const currentProduct = products.find(p => p.id === productId) || products[0];
    
    const related = products
        .filter(p => p.id !== productId && p.category === currentProduct.category)
        .slice(0, 4);
    
    const container = document.getElementById('related-products');
    if (container) {
        container.innerHTML = related.map(product => createProductCard(product)).join('');
        attachAddToCartListeners();
    }
}

/**
 * Create bee emoji thumb for price slider
 */
function createBeeThumb(slider) {
    // Check if bee thumb already exists
    if (slider.parentElement.querySelector('.bee-thumb')) {
        return;
    }
    
    // Wrap slider in a container if not already wrapped
    const priceRange = slider.closest('.price-range');
    if (priceRange && !priceRange.querySelector('.price-range-wrapper')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'price-range-wrapper';
        slider.parentNode.insertBefore(wrapper, slider);
        wrapper.appendChild(slider);
    }
    
    // Create bee emoji element
    const beeThumb = document.createElement('span');
    beeThumb.className = 'bee-thumb';
    beeThumb.textContent = '🐝';
    beeThumb.id = 'bee-thumb-' + slider.id;
    
    const wrapper = slider.parentElement;
    wrapper.style.position = 'relative';
    wrapper.appendChild(beeThumb);
    
    // Update position
    updateBeePosition(slider);
}

/**
 * Update bee emoji position based on slider value
 */
function updateBeePosition(slider) {
    const beeThumb = document.getElementById('bee-thumb-' + slider.id);
    if (!beeThumb) return;
    
    const min = parseFloat(slider.min) || 0;
    const max = parseFloat(slider.max) || 200;
    const value = parseFloat(slider.value) || 0;
    
    // Calculate percentage
    const percentage = ((value - min) / (max - min)) * 100;
    
    // Set position
    beeThumb.style.left = percentage + '%';
}
