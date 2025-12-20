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
        // Find nav menu - try multiple ways
        let navMenu = document.querySelector('.nav-menu');
        if (!navMenu) {
            const loginLink = document.getElementById('login-link');
            if (loginLink) {
                navMenu = loginLink.closest('ul');
            }
        }
        if (!navMenu) {
            // Try to find any ul in navbar
            const navbar = document.querySelector('.navbar');
            if (navbar) {
                navMenu = navbar.querySelector('ul');
            }
        }
        if (!navMenu) {
            console.warn('Nav menu not found');
            return;
        }

        const user = this.getCurrentUser();
        const isLoggedIn = this.isLoggedIn();

        // Remove existing user dropdown if present
        const existingDropdown = navMenu.querySelector('.user-dropdown');
        if (existingDropdown) {
            existingDropdown.remove();
        }

        // Remove existing login link if present (to avoid duplicates)
        const existingLoginLink = navMenu.querySelector('#login-link');
        if (existingLoginLink && user && isLoggedIn) {
            existingLoginLink.parentElement.remove();
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
        // Remove any existing login link or user dropdown
        const loginListItem = document.getElementById('login-link')?.parentElement;
        const existingDropdown = navMenu.querySelector('.user-dropdown');
        
        // Create user dropdown element
        const userDropdown = document.createElement('li');
        userDropdown.className = 'user-dropdown';
        userDropdown.innerHTML = `
            <div class="user-menu">
                <a href="#" class="user-name" id="user-name-link">
                    ${this.escapeHtml(user.name || user.email)} 
                    <span class="dropdown-arrow">▼</span>
                </a>
                <div class="user-dropdown-menu" id="user-dropdown-menu" style="display: none;">
                    <a href="profile.html">
                        <img src="img/logo.png" alt="Icon" class="dropdown-icon">
                        Profile
                    </a>
                    <a href="profile.html#orders" id="orders-link">
                        <img src="img/logo.png" alt="Icon" class="dropdown-icon">
                        Order History
                    </a>
                    <a href="#" id="logout-link" class="logout-link">
                        <img src="img/logo.png" alt="Icon" class="dropdown-icon">
                        Logout
                    </a>
                </div>
            </div>
        `;

        // Replace login link or existing dropdown with new user dropdown
        if (loginListItem) {
            loginListItem.replaceWith(userDropdown);
        } else if (existingDropdown) {
            existingDropdown.replaceWith(userDropdown);
        } else {
            // If neither exists, append to nav menu
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

        // Remove any existing event listeners by cloning the elements
        // This prevents duplicate event listeners
        if (userNameLink) {
            const newUserNameLink = userNameLink.cloneNode(true);
            userNameLink.parentNode.replaceChild(newUserNameLink, userNameLink);
            newUserNameLink.addEventListener('click', (e) => {
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

        // Logout handler - use direct event binding with proper context
        if (logoutLink) {
            // Remove old listener by cloning to prevent duplicate listeners
            const newLogoutLink = logoutLink.cloneNode(true);
            logoutLink.parentNode.replaceChild(newLogoutLink, logoutLink);
            
            // Bind with arrow function to preserve 'this' context
            newLogoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Call handleLogout with proper context
                this.handleLogout();
            });
        }

        // Orders link handler - navigate to profile page orders section
        if (ordersLink) {
            // Link already points to profile.html#orders, no need for special handling
        }

        // Close dropdown when clicking outside
        // Store reference to cleanup function
        const closeDropdown = (e) => {
            if (!userDropdown.contains(e.target)) {
                dropdownMenu.style.display = 'none';
                userDropdown.classList.remove('active');
            }
        };
        
        // Remove old listener if exists
        if (this._closeDropdownHandler) {
            document.removeEventListener('click', this._closeDropdownHandler);
        }
        this._closeDropdownHandler = closeDropdown;
        
        // Use a slight delay to avoid immediate closure on mobile
        setTimeout(() => {
            document.addEventListener('click', closeDropdown);
        }, 100);
    }

    /**
     * Handle user logout
     */
    handleLogout() {
        // Close dropdown menu if open
        const dropdownMenu = document.getElementById('user-dropdown-menu');
        if (dropdownMenu) {
            dropdownMenu.style.display = 'none';
        }
        const userDropdown = document.querySelector('.user-dropdown');
        if (userDropdown) {
            userDropdown.classList.remove('active');
        }

        // Use authManager if available, otherwise use localStorage
        if (typeof authManager !== 'undefined' && authManager.logout) {
            authManager.logout();
        } else {
            localStorage.removeItem('currentUser');
            localStorage.setItem('isLoggedIn', 'false');
        }

        // Dispatch logout event
        window.dispatchEvent(new Event('userLogout'));

        // Update navigation immediately
        this.updateNavigation();
        this.updateCartBadge();

        // Get current page path - handle both absolute and relative paths
        const currentPath = window.location.pathname;
        const currentPage = currentPath.split('/').pop() || '';
        const currentHref = window.location.href;
        const currentSearch = window.location.search;

        // Check if we're on a protected page
        const isProtectedPage = 
            currentPage === 'profile.html' || 
            currentPage === 'checkout.html' ||
            currentPath.includes('profile.html') || 
            currentPath.includes('checkout.html') ||
            currentHref.includes('profile.html') ||
            currentHref.includes('checkout.html');

        // Redirect to home page if on protected pages
        if (isProtectedPage) {
            // Small delay to ensure UI updates before redirect
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 100);
        }
        // For other pages, navigation is updated but user stays on current page
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

        // Global event delegation for logout links (more reliable)
        document.addEventListener('click', (e) => {
            const target = e.target.closest('#logout-link, .logout-link');
            if (target) {
                e.preventDefault();
                e.stopPropagation();
                this.handleLogout();
            }
        });
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

