// Profile Manager Module
// Manages user profile functionality including personal info, addresses, and password

class ProfileManager {
    constructor() {
        this.currentEditingAddressId = null;
        this.init();
    }

    /**
     * Initialize Profile Manager
     */
    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupEventListeners();
                this.loadUserInfo();
                this.loadAddresses();
                this.handleInitialTab();
            });
        } else {
            this.setupEventListeners();
            this.loadUserInfo();
            this.loadAddresses();
            this.handleInitialTab();
        }
    }

    /**
     * Handle initial tab based on URL hash
     */
    handleInitialTab() {
        const hash = window.location.hash;
        if (hash === '#orders') {
            const ordersTab = document.querySelector('.profile-tab[data-tab="orders"]');
            if (ordersTab) {
                ordersTab.click();
            }
        }
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Tab switching
        this.setupTabs();
        
        // Personal info form
        const infoForm = document.getElementById('info-form');
        if (infoForm) {
            infoForm.addEventListener('submit', (e) => this.handleInfoSubmit(e));
        }

        // Address form
        const addressForm = document.getElementById('address-form');
        if (addressForm) {
            addressForm.addEventListener('submit', (e) => this.handleAddressSubmit(e));
        }

        // Add address button
        const addAddressBtn = document.getElementById('add-address-btn');
        if (addAddressBtn) {
            addAddressBtn.addEventListener('click', () => this.openAddAddressModal());
        }

        // Modal close
        const modalClose = document.getElementById('modal-close');
        if (modalClose) {
            modalClose.addEventListener('click', () => this.closeAddressModal());
        }

        // Password form
        const passwordForm = document.getElementById('password-form');
        if (passwordForm) {
            passwordForm.addEventListener('submit', (e) => this.handlePasswordSubmit(e));
            // Add real-time validation for password fields
            this.setupPasswordValidation();
        }

        // Listen for order creation events to refresh order list
        window.addEventListener('orderCreated', () => {
            // Check if orders tab is currently active
            const ordersTab = document.querySelector('.profile-tab[data-tab="orders"]');
            if (ordersTab && ordersTab.classList.contains('active')) {
                this.loadOrders();
            }
        });

        // Make functions globally available for onclick handlers
        window.editAddress = (id) => this.editAddress(id);
        window.deleteAddress = (id) => this.deleteAddress(id);
        window.setDefaultAddress = (id) => this.setDefaultAddress(id);
    }

    /**
     * Setup tab switching
     */
    setupTabs() {
        const tabs = document.querySelectorAll('.profile-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                
                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update active content
                document.querySelectorAll('.profile-content').forEach(c => c.classList.remove('active'));
                const targetContent = document.getElementById(targetTab + '-tab');
                if (targetContent) {
                    targetContent.classList.add('active');
                }
                
                // Load content based on tab
                if (targetTab === 'addresses') {
                    this.loadAddresses();
                } else if (targetTab === 'orders') {
                    this.loadOrders();
                }
            });
        });
    }

    /**
     * Get current user from authManager or localStorage
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
     * Get current user with password (for password validation)
     * Always gets from users array to ensure password is available
     */
    getCurrentUserFull() {
        try {
            // First, get current user email from authManager or localStorage
            let userEmail = null;
            if (typeof authManager !== 'undefined' && authManager.getCurrentUser) {
                const user = authManager.getCurrentUser();
                if (user && user.email) {
                    userEmail = user.email;
                }
            }
            
            // If no email from authManager, try localStorage
            if (!userEmail) {
                const currentUserStr = localStorage.getItem('currentUser');
                if (currentUserStr) {
                    const currentUser = JSON.parse(currentUserStr);
                    userEmail = currentUser.email;
                }
            }
            
            if (!userEmail) return null;
            
            // Always get full user from users array (authoritative source)
            const users = JSON.parse(localStorage.getItem('users')) || [];
            const fullUser = users.find(u => u.email && u.email.toLowerCase() === userEmail.toLowerCase());
            
            return fullUser || null;
        } catch (e) {
            console.error('Error getting current user full:', e);
            return null;
        }
    }

    /**
     * Update current user
     */
    updateCurrentUser(user) {
        if (typeof authManager !== 'undefined' && authManager.updateUser) {
            authManager.updateUser(user);
        } else if (typeof setCurrentUser === 'function') {
            setCurrentUser(user);
        } else {
            localStorage.setItem('currentUser', JSON.stringify(user));
        }
    }

    /**
     * Load user information into form
     */
    loadUserInfo() {
        const user = this.getCurrentUser();
        if (!user) return;

        const nameInput = document.getElementById('profile-name');
        const emailInput = document.getElementById('profile-email');
        
        if (nameInput) nameInput.value = user.name || '';
        if (emailInput) emailInput.value = user.email || '';
    }

    /**
     * Handle personal info form submission
     */
    handleInfoSubmit(e) {
        e.preventDefault();
        
        const nameInput = document.getElementById('profile-name');
        const emailInput = document.getElementById('profile-email');
        
        if (!nameInput || !emailInput) return;

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();

        // Validation
        if (!this.validateName(name)) {
            this.showError('profile-name', 'Name must be at least 2 characters');
            return;
        }

        if (!this.validateEmail(email)) {
            this.showError('profile-email', 'Please enter a valid email address');
            return;
        }

        // Update user
        const user = this.getCurrentUser();
        if (!user) {
            alert('User not found. Please login again.');
            window.location.href = 'login.html';
            return;
        }

        // Check if email is being changed
        const oldEmail = user.email;
        const emailChanged = email !== oldEmail;
        
        // If email is being changed, check if new email already exists
        if (emailChanged) {
            const users = JSON.parse(localStorage.getItem('users')) || [];
            const emailExists = users.some(u => u.email.toLowerCase() === email.toLowerCase() && u.email !== oldEmail);
            
            if (emailExists) {
                this.showError('profile-email', 'An account with this email already exists');
                return;
            }
        }
        
        // Update in users array
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const userIndex = users.findIndex(u => u.email === oldEmail);
        
        if (userIndex !== -1) {
            // Update name
            users[userIndex].name = name;
            
            // Update email if changed
            if (emailChanged) {
                users[userIndex].email = email.toLowerCase().trim();
                
                // Update orders to use new email
                this.updateOrdersEmail(oldEmail, email);
                
                // Update emails to use new email
                this.updateEmailsEmail(oldEmail, email);
            }
            
            localStorage.setItem('users', JSON.stringify(users));
            
            // Update current user
            const updatedUser = users[userIndex];
            this.updateCurrentUser(updatedUser);
            
            // Show success message
            this.showSuccess('info-success');
            
            // If email changed, show additional message
            if (emailChanged) {
                setTimeout(() => {
                    alert('Email address updated successfully! Please note that you may need to login again with your new email.');
                }, 500);
            }
        }
    }

    /**
     * Load shipping addresses
     */
    loadAddresses() {
        const user = this.getCurrentUser();
        if (!user) return;
        
        const addresses = user.shippingAddresses || [];
        const defaultId = user.defaultAddressId;
        const container = document.getElementById('addresses-list');
        
        if (!container) return;

        if (addresses.length === 0) {
            container.innerHTML = '<p style="color: var(--text-light);">No addresses saved. Add your first address!</p>';
            return;
        }
        
        container.innerHTML = addresses.map(addr => `
            <div class="address-card ${addr.id === defaultId ? 'default' : ''}">
                <div class="address-info">
                    <h3>
                        ${this.escapeHtml(addr.name)}
                        ${addr.id === defaultId ? '<span class="default-badge">DEFAULT</span>' : ''}
                    </h3>
                    <p>${this.escapeHtml(addr.address)}</p>
                    <p>${this.escapeHtml(addr.city)}, ${this.escapeHtml(addr.state)} ${this.escapeHtml(addr.zip)}</p>
                    <p>${this.escapeHtml(addr.country)}</p>
                </div>
                <div class="address-actions">
                    ${addr.id !== defaultId ? `<button class="btn-set-default" onclick="setDefaultAddress('${addr.id}')">Set Default</button>` : ''}
                    <button class="btn-edit" onclick="editAddress('${addr.id}')">Edit</button>
                    <button class="btn-delete" onclick="deleteAddress('${addr.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Open add address modal
     */
    openAddAddressModal() {
        this.currentEditingAddressId = null;
        const modalTitle = document.getElementById('modal-title');
        const addressForm = document.getElementById('address-form');
        
        if (modalTitle) modalTitle.textContent = 'Add New Address';
        if (addressForm) addressForm.reset();
        
        const modal = document.getElementById('address-modal');
        if (modal) modal.style.display = 'flex';
    }

    /**
     * Close address modal
     */
    closeAddressModal() {
        const modal = document.getElementById('address-modal');
        if (modal) modal.style.display = 'none';
        this.currentEditingAddressId = null;
    }

    /**
     * Edit address
     */
    editAddress(addressId) {
        const user = this.getCurrentUser();
        if (!user) return;
        
        const address = (user.shippingAddresses || []).find(a => a.id === addressId);
        if (!address) return;

        this.currentEditingAddressId = addressId;
        const modalTitle = document.getElementById('modal-title');
        if (modalTitle) modalTitle.textContent = 'Edit Address';
        
        // Fill form
        document.getElementById('addr-name').value = address.name || '';
        document.getElementById('addr-address').value = address.address || '';
        document.getElementById('addr-city').value = address.city || '';
        document.getElementById('addr-state').value = address.state || '';
        document.getElementById('addr-zip').value = address.zip || '';
        document.getElementById('addr-country').value = address.country || '';
        document.getElementById('addr-default').checked = user.defaultAddressId === addressId;
        
        const modal = document.getElementById('address-modal');
        if (modal) modal.style.display = 'flex';
    }

    /**
     * Handle address form submission
     */
    handleAddressSubmit(e) {
        e.preventDefault();
        
        // Clear previous errors
        this.clearAddressErrors();
        
        // Get form values
        const addressData = {
            id: this.currentEditingAddressId || 'addr-' + Date.now(),
            name: document.getElementById('addr-name').value.trim(),
            address: document.getElementById('addr-address').value.trim(),
            city: document.getElementById('addr-city').value.trim(),
            state: document.getElementById('addr-state').value.trim(),
            zip: document.getElementById('addr-zip').value.trim(),
            country: document.getElementById('addr-country').value.trim()
        };

        // Validation
        let isValid = true;

        if (!this.validateName(addressData.name)) {
            this.showAddressError('addr-name', 'Name is required');
            isValid = false;
        }

        if (!addressData.address || addressData.address.length < 5) {
            this.showAddressError('addr-address', 'Address must be at least 5 characters');
            isValid = false;
        }

        if (!addressData.city || addressData.city.length < 2) {
            this.showAddressError('addr-city', 'City is required');
            isValid = false;
        }

        if (!addressData.state || addressData.state.length < 2) {
            this.showAddressError('addr-state', 'State/Province is required');
            isValid = false;
        }

        if (!this.validateZipCode(addressData.zip)) {
            this.showAddressError('addr-zip', 'Valid ZIP/Postal code is required');
            isValid = false;
        }

        if (!addressData.country) {
            this.showAddressError('addr-country', 'Please select a country');
            isValid = false;
        }

        if (!isValid) return;

        // Update user addresses
        const user = this.getCurrentUser();
        if (!user) {
            alert('User not found. Please login again.');
            window.location.href = 'login.html';
            return;
        }

        const users = JSON.parse(localStorage.getItem('users')) || [];
        const userIndex = users.findIndex(u => u.email === user.email);
        
        if (userIndex === -1) {
            alert('User not found in database.');
            return;
        }

        if (!users[userIndex].shippingAddresses) {
            users[userIndex].shippingAddresses = [];
        }
        
        if (this.currentEditingAddressId) {
            // Update existing address
            const addrIndex = users[userIndex].shippingAddresses.findIndex(a => a.id === this.currentEditingAddressId);
            if (addrIndex !== -1) {
                users[userIndex].shippingAddresses[addrIndex] = addressData;
            }
        } else {
            // Add new address
            users[userIndex].shippingAddresses.push(addressData);
        }
        
        // Set as default if checked
        if (document.getElementById('addr-default').checked) {
            users[userIndex].defaultAddressId = addressData.id;
        }
        
        localStorage.setItem('users', JSON.stringify(users));
        
        // Update current user
        const updatedUser = users[userIndex];
        this.updateCurrentUser(updatedUser);
        
        // Close modal and reload addresses
        this.closeAddressModal();
        this.loadAddresses();
    }

    /**
     * Delete address
     */
    deleteAddress(addressId) {
        if (!confirm('Are you sure you want to delete this address?')) return;
        
        const user = this.getCurrentUser();
        if (!user) return;

        const users = JSON.parse(localStorage.getItem('users')) || [];
        const userIndex = users.findIndex(u => u.email === user.email);
        
        if (userIndex === -1) return;

        users[userIndex].shippingAddresses = (users[userIndex].shippingAddresses || []).filter(a => a.id !== addressId);
        
        // Clear default if deleted address was default
        if (users[userIndex].defaultAddressId === addressId) {
            users[userIndex].defaultAddressId = null;
        }
        
        localStorage.setItem('users', JSON.stringify(users));
        
        const updatedUser = users[userIndex];
        this.updateCurrentUser(updatedUser);
        
        this.loadAddresses();
    }

    /**
     * Set default address
     */
    setDefaultAddress(addressId) {
        const user = this.getCurrentUser();
        if (!user) return;

        const users = JSON.parse(localStorage.getItem('users')) || [];
        const userIndex = users.findIndex(u => u.email === user.email);
        
        if (userIndex === -1) return;

        // Verify address exists
        const addressExists = (users[userIndex].shippingAddresses || []).some(a => a.id === addressId);
        if (!addressExists) {
            alert('Address not found.');
            return;
        }

        users[userIndex].defaultAddressId = addressId;
        localStorage.setItem('users', JSON.stringify(users));
        
        const updatedUser = users[userIndex];
        this.updateCurrentUser(updatedUser);
        
        this.loadAddresses();
    }

    /**
     * Setup real-time password validation
     */
    setupPasswordValidation() {
        const currentPasswordInput = document.getElementById('current-password');
        const newPasswordInput = document.getElementById('new-password');
        const confirmPasswordInput = document.getElementById('confirm-new-password');

        // Validate current password on blur
        if (currentPasswordInput) {
            currentPasswordInput.addEventListener('blur', () => {
                const currentPassword = currentPasswordInput.value;
                const user = this.getCurrentUserFull();
                if (currentPassword && user && user.password !== currentPassword) {
                    this.showPasswordError('current-password', 'Current password is incorrect');
                } else {
                    this.clearPasswordError('current-password');
                }
            });
        }

        // Validate new password on input
        if (newPasswordInput) {
            newPasswordInput.addEventListener('input', () => {
                const newPassword = newPasswordInput.value;
                const user = this.getCurrentUserFull();
                
                // Check if new password is same as current password
                if (newPassword && user && user.password === newPassword) {
                    this.showPasswordError('new-password', 'New password must be different from current password');
                } else if (newPassword && !this.validatePassword(newPassword)) {
                    this.showPasswordError('new-password', 'Password must be at least 6 characters');
                } else {
                    this.clearPasswordError('new-password');
                }
                
                // Re-validate confirm password if it has a value
                if (confirmPasswordInput && confirmPasswordInput.value) {
                    if (confirmPasswordInput.value !== newPassword) {
                        this.showPasswordError('confirm-new-password', 'Passwords do not match');
                    } else {
                        this.clearPasswordError('confirm-new-password');
                    }
                }
            });
        }

        // Validate confirm password on input
        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', () => {
                const confirmPassword = confirmPasswordInput.value;
                const newPassword = newPasswordInput?.value || '';
                
                if (confirmPassword && confirmPassword !== newPassword) {
                    this.showPasswordError('confirm-new-password', 'Passwords do not match');
                } else {
                    this.clearPasswordError('confirm-new-password');
                }
            });
        }
    }

    /**
     * Handle password change form submission
     */
    handlePasswordSubmit(e) {
        e.preventDefault();
        
        // Clear previous errors
        this.clearPasswordErrors();
        
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-new-password').value;
        
        let isValid = true;
        const user = this.getCurrentUserFull();
        
        if (!user) {
            alert('User not found. Please login again.');
            window.location.href = 'login.html';
            return;
        }

        // Validate current password
        if (!currentPassword) {
            this.showPasswordError('current-password', 'Current password is required');
            isValid = false;
        } else if (user.password !== currentPassword) {
            this.showPasswordError('current-password', 'Current password is incorrect');
            isValid = false;
        }
        
        // Validate new password
        if (!newPassword) {
            this.showPasswordError('new-password', 'New password is required');
            isValid = false;
        } else if (!this.validatePassword(newPassword)) {
            this.showPasswordError('new-password', 'Password must be at least 6 characters');
            isValid = false;
        } else if (user.password === newPassword) {
            this.showPasswordError('new-password', 'New password must be different from current password');
            isValid = false;
        }
        
        // Validate confirm password
        if (!confirmPassword) {
            this.showPasswordError('confirm-new-password', 'Please confirm your new password');
            isValid = false;
        } else if (newPassword !== confirmPassword) {
            this.showPasswordError('confirm-new-password', 'Passwords do not match');
            isValid = false;
        }
        
        if (!isValid) return;

        // Update password using authManager if available
        if (typeof authManager !== 'undefined' && authManager.changePassword) {
            const result = authManager.changePassword(currentPassword, newPassword);
            if (result.success) {
                this.showSuccess('password-success');
                this.clearPasswordErrors();
                document.getElementById('password-form').reset();
            } else {
                this.showPasswordError('current-password', result.message || 'Failed to change password');
            }
        } else {
            // Fallback to direct update
            const users = JSON.parse(localStorage.getItem('users')) || [];
            const userIndex = users.findIndex(u => u.email === user.email);
            
            if (userIndex === -1) {
                this.showPasswordError('current-password', 'User not found in database');
                return;
            }
            
            users[userIndex].password = newPassword;
            localStorage.setItem('users', JSON.stringify(users));
            
            const updatedUser = users[userIndex];
            this.updateCurrentUser(updatedUser);
            
            // Update authManager's current user if available
            if (typeof authManager !== 'undefined' && authManager.setCurrentUser) {
                authManager.setCurrentUser(updatedUser);
            }
            
            this.showSuccess('password-success');
            this.clearPasswordErrors();
            document.getElementById('password-form').reset();
        }
    }

    /**
     * Load orders from order history
     */
    loadOrders() {
        const container = document.getElementById('orders-list');
        if (!container) return;

        const user = this.getCurrentUser();
        if (!user || !user.email) {
            container.innerHTML = '<p style="color: var(--text-light);">Please login to view your order history.</p>';
            return;
        }

        // Get user orders
        let orders = [];
        if (typeof orderManager !== 'undefined' && orderManager.getUserOrders) {
            orders = orderManager.getUserOrders(user.email);
        } else if (typeof getUserOrders === 'function') {
            orders = getUserOrders();
        } else {
            // Fallback: get from localStorage with case-insensitive email matching
            const allOrders = JSON.parse(localStorage.getItem('orders')) || [];
            const normalizedUserEmail = (user.email || '').toLowerCase().trim();
            orders = allOrders.filter(order => {
                const orderEmail = (order.email || order.shipping?.email || '').toLowerCase().trim();
                return orderEmail === normalizedUserEmail;
            });
        }

        // Sort orders by date (newest first)
        orders.sort((a, b) => new Date(b.orderDate || b.orderDate) - new Date(a.orderDate || a.orderDate));

        if (orders.length === 0) {
            container.innerHTML = '<p style="color: var(--text-light);">No orders yet. Your order history will appear here.</p>';
            return;
        }

        container.innerHTML = orders.map(order => {
            const orderDate = order.orderDate || order.orderDate;
            const formattedDate = orderDate 
                ? (typeof orderManager !== 'undefined' && orderManager.formatOrderDate 
                    ? orderManager.formatOrderDate(orderDate)
                    : new Date(orderDate).toLocaleDateString())
                : 'Unknown date';
            
            const totals = order.totals || {};
            const status = order.status || 'pending';
            const itemsCount = order.items ? order.items.length : 0;
            const itemsPreview = order.items && order.items.length > 0
                ? order.items.slice(0, 3).map(item => item.name).join(', ') + (order.items.length > 3 ? '...' : '')
                : 'No items';

            return `
                <div class="order-card" onclick="toggleOrderDetails('${order.orderId}')">
                    <div class="order-header">
                        <div>
                            <div class="order-id">${this.escapeHtml(order.orderId || 'Unknown Order')}</div>
                            <div class="order-date">${this.escapeHtml(formattedDate)}</div>
                            <span class="order-status ${status}">${this.escapeHtml(status.toUpperCase())}</span>
                        </div>
                    </div>
                    <div class="order-summary">
                        <div class="order-items-preview">
                            <strong>${itemsCount} item${itemsCount !== 1 ? 's' : ''}</strong><br>
                            ${this.escapeHtml(itemsPreview)}
                        </div>
                        <div class="order-total">
                            $${(totals.total || 0).toFixed(2)}
                        </div>
                    </div>
                    <div class="order-details" id="order-details-${order.orderId}">
                        <h3 style="color: var(--text-color); margin-bottom: 1rem;">Order Details</h3>
                        ${order.items ? order.items.map(item => `
                            <div class="order-item-detail">
                                <img src="${this.escapeHtml(item.image || '')}" alt="${this.escapeHtml(item.name)}" class="order-item-image-small" onerror="this.style.display='none'">
                                <div class="order-item-info">
                                    <div class="order-item-name">${this.escapeHtml(item.name)}</div>
                                    <div class="order-item-meta">Size: ${this.escapeHtml(item.size || 'N/A')}${item.color ? ` | Color: ${this.escapeHtml(item.color)}` : ''} | Quantity: ${item.quantity || 1}</div>
                                </div>
                                <div class="order-item-price">$${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</div>
                            </div>
                        `).join('') : ''}
                        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--accent-color);">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                <span style="color: var(--text-light);">Subtotal:</span>
                                <span style="color: var(--text-color); font-weight: 600;">$${(totals.subtotal || 0).toFixed(2)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                <span style="color: var(--text-light);">Shipping:</span>
                                <span style="color: var(--text-color); font-weight: 600;">$${(totals.shipping || 0).toFixed(2)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                <span style="color: var(--text-light);">Tax:</span>
                                <span style="color: var(--text-color); font-weight: 600;">$${(totals.tax || 0).toFixed(2)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--accent-color);">
                                <span style="color: var(--text-color); font-weight: 700; font-size: 1.1rem;">Total:</span>
                                <span style="color: var(--text-color); font-weight: 700; font-size: 1.1rem;">$${(totals.total || 0).toFixed(2)}</span>
                            </div>
                        </div>
                        ${order.shipping ? `
                            <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--accent-color);">
                                <h4 style="color: var(--text-color); margin-bottom: 0.5rem;">Shipping Address</h4>
                                <p style="color: var(--text-light); line-height: 1.6;">
                                    ${this.escapeHtml(order.shipping.address || '')}<br>
                                    ${this.escapeHtml(order.shipping.city || '')}, ${this.escapeHtml(order.shipping.state || '')} ${this.escapeHtml(order.shipping.zip || '')}<br>
                                    ${this.escapeHtml(order.shipping.country || '')}
                                </p>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // Make toggleOrderDetails globally available
        window.toggleOrderDetails = (orderId) => {
            const orderCard = document.querySelector(`#order-details-${orderId}`)?.closest('.order-card');
            if (orderCard) {
                orderCard.classList.toggle('expanded');
            }
        };
    }

    /**
     * Validation functions
     */
    validateName(name) {
        return name && name.trim().length >= 2;
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validatePassword(password) {
        return password && password.length >= 6;
    }

    validateZipCode(zip) {
        // Basic validation - allows alphanumeric, 3-10 characters
        const zipRegex = /^[A-Z0-9\s-]{3,10}$/i;
        return zipRegex.test(zip);
    }

    /**
     * Error handling functions
     */
    showError(inputId, message) {
        const input = document.getElementById(inputId);
        if (!input) return;

        const errorElement = document.getElementById(inputId + '-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
        
        input.closest('.form-group')?.classList.add('error');
    }

    showAddressError(inputId, message) {
        const input = document.getElementById(inputId);
        if (!input) return;

        // Create or update error element
        let errorElement = document.getElementById(inputId + '-error');
        if (!errorElement) {
            errorElement = document.createElement('span');
            errorElement.className = 'error-message';
            errorElement.id = inputId + '-error';
            input.parentElement.appendChild(errorElement);
        }
        
        errorElement.textContent = message;
        errorElement.classList.add('show');
        input.closest('.form-group')?.classList.add('error');
    }

    showPasswordError(inputId, message) {
        const errorElement = document.getElementById(inputId + '-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
        
        const input = document.getElementById(inputId);
        if (input) {
            input.closest('.form-group')?.classList.add('error');
        }
    }

    clearAddressErrors() {
        const errorElements = document.querySelectorAll('#address-form .error-message');
        errorElements.forEach(el => {
            el.classList.remove('show');
            el.textContent = '';
        });
        
        const errorGroups = document.querySelectorAll('#address-form .form-group.error');
        errorGroups.forEach(group => group.classList.remove('error'));
    }

    clearPasswordErrors() {
        ['current-password', 'new-password', 'confirm-new-password'].forEach(id => {
            this.clearPasswordError(id);
        });
    }

    /**
     * Clear error for a specific password field
     */
    clearPasswordError(inputId) {
        const errorElement = document.getElementById(inputId + '-error');
        if (errorElement) {
            errorElement.classList.remove('show');
            errorElement.textContent = '';
        }
        
        const input = document.getElementById(inputId);
        if (input) {
            input.closest('.form-group')?.classList.remove('error');
        }
    }

    showSuccess(elementId) {
        const successElement = document.getElementById(elementId);
        if (successElement) {
            successElement.classList.add('show');
            setTimeout(() => {
                successElement.classList.remove('show');
            }, 3000);
        }
    }

    /**
     * Update orders email when user changes email
     */
    updateOrdersEmail(oldEmail, newEmail) {
        const orders = JSON.parse(localStorage.getItem('orders')) || [];
        orders.forEach(order => {
            if (order.email === oldEmail) {
                order.email = newEmail;
            }
        });
        localStorage.setItem('orders', JSON.stringify(orders));
    }

    /**
     * Update emails email when user changes email
     */
    updateEmailsEmail(oldEmail, newEmail) {
        const allEmails = JSON.parse(localStorage.getItem('userEmails')) || {};
        
        // If user has emails with old email, move them to new email
        if (allEmails[oldEmail]) {
            allEmails[newEmail] = allEmails[oldEmail];
            delete allEmails[oldEmail];
            localStorage.setItem('userEmails', JSON.stringify(allEmails));
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Create global instance
const profileManager = new ProfileManager();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProfileManager;
}

