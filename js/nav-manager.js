// Navigation Manager Module
// Manages dynamic navigation bar based on user authentication state

class NavManager {
    constructor() {
        this.cart = JSON.parse(localStorage.getItem('cart')) || [];
        this.init();
    }

    /**
     * Initialize Navigation Manager
     */
    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.updateNavigation();
                this.updateCartBadge();
                this.setupEventListeners();
            });
        } else {
            this.updateNavigation();
            this.updateCartBadge();
            this.setupEventListeners();
        }

        // Listen for storage changes (for cross-tab updates)
        window.addEventListener('storage', (e) => {
            if (e.key === 'currentUser' || e.key === 'isLoggedIn') {
                this.updateNavigation();
            }
            if (e.key === 'cart') {
                this.cart = JSON.parse(localStorage.getItem('cart')) || [];
                this.updateCartBadge();
            }
        });

        // Listen for custom events
        window.addEventListener('userLogin', () => this.updateNavigation());
        window.addEventListener('userLogout', () => this.updateNavigation());
        window.addEventListener('cartUpdated', () => {
            this.cart = JSON.parse(localStorage.getItem('cart')) || [];
            this.updateCartBadge();
        });
    }

    /**
     * Update navigation bar based on authentication state
     */
    updateNavigation() {
        const loginLink = document.getElementById('login-link');
        if (!loginLink) return;

        const user = this.getCurrentUser();
        const isLoggedIn = this.isLoggedIn();
        const navMenu = loginLink.closest('ul');
        
        if (!navMenu) return;

        // Remove existing user dropdown if present
        const existingDropdown = navMenu.querySelector('.user-dropdown');
        if (existingDropdown) {
            existingDropdown.remove();
        }

        if (user && isLoggedIn) {
            // User is logged in - show user dropdown
            this.showUserDropdown(navMenu, user);
        } else {
            // Visitor mode - show login/register link
            this.showLoginLink(navMenu);
        }
    }

    /**
     * Show user dropdown menu
     */
    showUserDropdown(navMenu, user) {
        const loginListItem = document.getElementById('login-link')?.parentElement;
        
        // Create user dropdown element
        const userDropdown = document.createElement('li');
        userDropdown.className = 'user-dropdown';
        userDropdown.innerHTML = `
            <div class="user-menu">
                <a href="#" class="user-name" id="user-name-link">
                    ${this.escapeHtml(user.name || user.email)} 
                    <span class="dropdown-arrow">▼</span>
                </a>
                <div class="user-dropdown-menu" id="user-dropdown-menu">
                    <a href="profile.html">
                        <img src="img/logo.png" alt="Icon" class="dropdown-icon">
                        Profile
                    </a>
                    <a href="profile.html#orders" id="orders-link">
                        <img src="img/logo.png" alt="Icon" class="dropdown-icon">
                        Order History
                    </a>
                    <a href="#" id="logout-link">
                        <img src="img/logo.png" alt="Icon" class="dropdown-icon">
                        Logout
                    </a>
                </div>
            </div>
        `;

        // Replace login link with user dropdown
        if (loginListItem) {
            loginListItem.replaceWith(userDropdown);
        } else {
            // If login link doesn't exist, append to nav menu
            navMenu.appendChild(userDropdown);
        }

        // Setup dropdown event listeners
        this.setupDropdownListeners(userDropdown);
    }

    /**
     * Show login/register link
     */
    showLoginLink(navMenu) {
        const userDropdown = navMenu.querySelector('.user-dropdown');
        
        if (userDropdown) {
            const loginListItem = document.createElement('li');
            loginListItem.innerHTML = '<a href="login.html" id="login-link">Login/Register</a>';
            userDropdown.replaceWith(loginListItem);
        } else {
            // Ensure login link exists
            const loginLink = document.getElementById('login-link');
            if (!loginLink) {
                const loginListItem = document.createElement('li');
                loginListItem.innerHTML = '<a href="login.html" id="login-link">Login/Register</a>';
                navMenu.appendChild(loginListItem);
            }
        }
    }

    /**
     * Setup dropdown menu event listeners
     */
    setupDropdownListeners(userDropdown) {
        const userNameLink = userDropdown.querySelector('#user-name-link');
        const dropdownMenu = userDropdown.querySelector('#user-dropdown-menu');
        const logoutLink = userDropdown.querySelector('#logout-link');
        const ordersLink = userDropdown.querySelector('#orders-link');

        // Toggle dropdown on click (for mobile and desktop)
        if (userNameLink) {
            userNameLink.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const isOpen = dropdownMenu.style.display === 'block';
                dropdownMenu.style.display = isOpen ? 'none' : 'block';
                
                // Toggle active class for arrow rotation
                if (isOpen) {
                    userDropdown.classList.remove('active');
                } else {
                    userDropdown.classList.add('active');
                }
            });
        }

        // Logout handler
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }

        // Orders link handler - navigate to profile page orders section
        if (ordersLink) {
            // Link already points to profile.html#orders, no need for special handling
        }

        // Close dropdown when clicking outside
        const closeDropdown = (e) => {
            if (!userDropdown.contains(e.target)) {
                dropdownMenu.style.display = 'none';
                userDropdown.classList.remove('active');
            }
        };
        
        // Use a slight delay to avoid immediate closure on mobile
        setTimeout(() => {
            document.addEventListener('click', closeDropdown);
        }, 100);
    }

    /**
     * Handle user logout
     */
    handleLogout() {
        // Use authManager if available, otherwise use localStorage
        if (typeof authManager !== 'undefined' && authManager.logout) {
            authManager.logout();
        } else {
            localStorage.removeItem('currentUser');
            localStorage.setItem('isLoggedIn', 'false');
        }

        // Dispatch logout event
        window.dispatchEvent(new Event('userLogout'));

        // Update navigation
        this.updateNavigation();

        // Redirect to home page
        if (window.location.pathname.includes('profile.html') || 
            window.location.pathname.includes('checkout.html')) {
            window.location.href = 'index.html';
        }
    }

    /**
     * Update cart badge count
     */
    updateCartBadge() {
        const cartCount = this.cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        const cartCountElements = document.querySelectorAll('.cart-count');
        
        cartCountElements.forEach(el => {
            el.textContent = cartCount;
            el.style.display = cartCount > 0 ? 'inline' : 'none';
        });
    }

    /**
     * Setup event listeners for cart updates
     */
    setupEventListeners() {
        // Listen for cart updates from script.js
        const originalAddToCart = window.addToCart;
        if (originalAddToCart) {
            window.addToCart = (...args) => {
                const result = originalAddToCart(...args);
                this.cart = JSON.parse(localStorage.getItem('cart')) || [];
                this.updateCartBadge();
                return result;
            };
        }

        const originalRemoveFromCart = window.removeFromCart;
        if (originalRemoveFromCart) {
            window.removeFromCart = (...args) => {
                const result = originalRemoveFromCart(...args);
                this.cart = JSON.parse(localStorage.getItem('cart')) || [];
                this.updateCartBadge();
                return result;
            };
        }
    }

    /**
     * Get current user from localStorage or authManager
     */
    getCurrentUser() {
        if (typeof authManager !== 'undefined' && authManager.getCurrentUser) {
            return authManager.getCurrentUser();
        }
        try {
            const user = localStorage.getItem('currentUser');
            return user ? JSON.parse(user) : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Check if user is logged in
     */
    isLoggedIn() {
        if (typeof authManager !== 'undefined' && authManager.isLoggedIn) {
            return authManager.isLoggedIn();
        }
        return localStorage.getItem('isLoggedIn') === 'true' && this.getCurrentUser() !== null;
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Refresh navigation (public method)
     */
    refresh() {
        this.cart = JSON.parse(localStorage.getItem('cart')) || [];
        this.updateNavigation();
        this.updateCartBadge();
    }
}

// Create global instance
const navManager = new NavManager();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavManager;
}

