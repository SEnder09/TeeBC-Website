// Checkout Manager Module
// Handles enhanced checkout flow with user integration

class CheckoutManager {
    constructor() {
        this.init();
    }

    /**
     * Initialize Checkout Manager
     */
    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupCheckout();
            });
        } else {
            this.setupCheckout();
        }
    }

    /**
     * Setup checkout page
     */
    setupCheckout() {
        // Check if user is logged in
        const user = this.getCurrentUser();
        
        // Auto-fill shipping info if user is logged in
        if (user) {
            this.autoFillShippingInfo(user);
        }

        // Setup form validation
        this.setupFormValidation();

        // Setup address selector if user has saved addresses
        if (user && user.shippingAddresses && user.shippingAddresses.length > 0) {
            this.setupAddressSelector(user);
        }
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        if (typeof authManager !== 'undefined' && authManager.getCurrentUser) {
            return authManager.getCurrentUserFull();
        }
        try {
            const user = localStorage.getItem('currentUser');
            return user ? JSON.parse(user) : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Auto-fill shipping information from user profile
     */
    autoFillShippingInfo(user) {
        if (!user) return;

        // Fill name
        const nameInput = document.getElementById('full-name');
        if (nameInput && user.name) {
            nameInput.value = user.name;
        }

        // Fill email
        const emailInput = document.getElementById('email');
        if (emailInput && user.email) {
            emailInput.value = user.email;
        }

        // Fill default address if available
        const defaultAddressId = user.defaultAddressId;
        if (defaultAddressId && user.shippingAddresses) {
            const defaultAddress = user.shippingAddresses.find(addr => addr.id === defaultAddressId);
            if (defaultAddress) {
                this.fillAddressForm(defaultAddress);
            }
        }
    }

    /**
     * Fill address form with address data
     */
    fillAddressForm(address) {
        if (!address) return;

        const addressInput = document.getElementById('address');
        const cityInput = document.getElementById('city');
        const stateInput = document.getElementById('state');
        const zipInput = document.getElementById('zip');
        const countryInput = document.getElementById('country');
        const phoneInput = document.getElementById('phone');

        if (addressInput && address.address) addressInput.value = address.address;
        if (cityInput && address.city) cityInput.value = address.city;
        if (stateInput && address.state) stateInput.value = address.state;
        if (zipInput && address.zip) zipInput.value = address.zip;
        if (countryInput && address.country) countryInput.value = address.country;
        if (phoneInput && address.phone) phoneInput.value = address.phone;
    }

    /**
     * Setup address selector dropdown
     */
    setupAddressSelector(user) {
        const addresses = user.shippingAddresses || [];
        if (addresses.length === 0) return;

        const form = document.getElementById('checkout-form');
        if (!form) return;

        // Create address selector
        const addressSelector = document.createElement('div');
        addressSelector.className = 'form-group full-width';
        addressSelector.innerHTML = `
            <label for="address-selector">Use Saved Address <span class="required">*</span></label>
            <select id="address-selector" class="address-selector">
                <option value="">Select a saved address</option>
                ${addresses.map((addr, index) => `
                    <option value="${addr.id}" ${addr.id === user.defaultAddressId ? 'selected' : ''}>
                        ${this.escapeHtml(addr.name)} - ${this.escapeHtml(addr.address)}, ${this.escapeHtml(addr.city)}
                        ${addr.id === user.defaultAddressId ? ' (Default)' : ''}
                    </option>
                `).join('')}
                <option value="new">Enter new address</option>
            </select>
        `;

        // Insert before first form group
        const firstGroup = form.querySelector('.form-group');
        if (firstGroup) {
            form.insertBefore(addressSelector, firstGroup);
        }

        // Handle address selection
        const selector = document.getElementById('address-selector');
        if (selector) {
            selector.addEventListener('change', (e) => {
                const selectedId = e.target.value;
                if (selectedId === 'new') {
                    // Clear form for new address
                    this.clearAddressForm();
                } else if (selectedId) {
                    // Fill form with selected address
                    const selectedAddress = addresses.find(addr => addr.id === selectedId);
                    if (selectedAddress) {
                        this.fillAddressForm(selectedAddress);
                    }
                }
            });

            // Trigger initial fill if default address is selected
            if (selector.value && selector.value !== 'new') {
                const selectedAddress = addresses.find(addr => addr.id === selector.value);
                if (selectedAddress) {
                    this.fillAddressForm(selectedAddress);
                }
            }
        }
    }

    /**
     * Clear address form
     */
    clearAddressForm() {
        const addressInput = document.getElementById('address');
        const cityInput = document.getElementById('city');
        const stateInput = document.getElementById('state');
        const zipInput = document.getElementById('zip');
        const countryInput = document.getElementById('country');
        const phoneInput = document.getElementById('phone');

        if (addressInput) addressInput.value = '';
        if (cityInput) cityInput.value = '';
        if (stateInput) stateInput.value = '';
        if (zipInput) zipInput.value = '';
        if (countryInput) countryInput.value = '';
        if (phoneInput) phoneInput.value = '';
    }

    /**
     * Setup form validation
     */
    setupFormValidation() {
        const form = document.getElementById('checkout-form');
        if (!form) return;

        // Get form elements
        const fullName = document.getElementById('full-name');
        const email = document.getElementById('email');
        const address = document.getElementById('address');
        const city = document.getElementById('city');
        const state = document.getElementById('state');
        const zip = document.getElementById('zip');
        const country = document.getElementById('country');
        const phone = document.getElementById('phone');

        // Real-time validation
        if (fullName) {
            fullName.addEventListener('blur', () => this.validateField('full-name', fullName.value.trim(), 'Name is required'));
        }
        if (email) {
            email.addEventListener('blur', () => this.validateEmailField(email.value.trim()));
        }
        if (address) {
            address.addEventListener('blur', () => this.validateField('address', address.value.trim(), 'Address is required'));
        }
        if (city) {
            city.addEventListener('blur', () => this.validateField('city', city.value.trim(), 'City is required'));
        }
        if (state) {
            state.addEventListener('blur', () => this.validateField('state', state.value.trim(), 'State/Province is required'));
        }
        if (zip) {
            zip.addEventListener('blur', () => this.validateZipField(zip.value.trim()));
        }
        if (country) {
            country.addEventListener('change', () => this.validateField('country', country.value, 'Please select a country'));
        }
    }

    /**
     * Validate field
     */
    validateField(fieldId, value, errorMessage) {
        const field = document.getElementById(fieldId);
        const errorElement = document.getElementById(fieldId + '-error');
        
        if (!field) return true;

        if (!value || value.trim() === '') {
            this.showError(fieldId, errorMessage);
            return false;
        } else {
            this.clearError(fieldId);
            return true;
        }
    }

    /**
     * Validate email field
     */
    validateEmailField(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            this.showError('email', 'Please enter a valid email address');
            return false;
        } else {
            this.clearError('email');
            return true;
        }
    }

    /**
     * Validate ZIP field
     */
    validateZipField(zip) {
        if (!zip || zip.trim() === '') {
            this.showError('zip', 'ZIP/Postal code is required');
            return false;
        } else {
            this.clearError('zip');
            return true;
        }
    }

    /**
     * Show error message
     */
    showError(fieldId, message) {
        const field = document.getElementById(fieldId);
        const errorElement = document.getElementById(fieldId + '-error');
        
        if (field) {
            field.classList.add('error');
            field.closest('.form-group')?.classList.add('error');
        }
        
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
    }

    /**
     * Clear error message
     */
    clearError(fieldId) {
        const field = document.getElementById(fieldId);
        const errorElement = document.getElementById(fieldId + '-error');
        
        if (field) {
            field.classList.remove('error');
            field.closest('.form-group')?.classList.remove('error');
        }
        
        if (errorElement) {
            errorElement.classList.remove('show');
            errorElement.textContent = '';
        }
    }

    /**
     * Validate entire form
     */
    validateForm() {
        const fullName = document.getElementById('full-name')?.value.trim();
        const email = document.getElementById('email')?.value.trim();
        const address = document.getElementById('address')?.value.trim();
        const city = document.getElementById('city')?.value.trim();
        const state = document.getElementById('state')?.value.trim();
        const zip = document.getElementById('zip')?.value.trim();
        const country = document.getElementById('country')?.value;

        let isValid = true;

        if (!this.validateField('full-name', fullName, 'Name is required')) isValid = false;
        if (!this.validateEmailField(email)) isValid = false;
        if (!this.validateField('address', address, 'Address is required')) isValid = false;
        if (!this.validateField('city', city, 'City is required')) isValid = false;
        if (!this.validateField('state', state, 'State/Province is required')) isValid = false;
        if (!this.validateZipField(zip)) isValid = false;
        if (!this.validateField('country', country, 'Please select a country')) isValid = false;

        return isValid;
    }

    /**
     * Process order
     */
    processOrder() {
        // Validate form
        if (!this.validateForm()) {
            const firstError = document.querySelector('.form-group.error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return false;
        }

        try {
            // Get cart from localStorage
            const cart = JSON.parse(localStorage.getItem('cart')) || [];
            
            if (cart.length === 0) {
                alert('Your cart is empty!');
                return false;
            }

            // Get current user email (prioritize logged-in user's email)
            let userEmail = null;
            if (typeof authManager !== 'undefined' && authManager.getCurrentUser) {
                const user = authManager.getCurrentUser();
                if (user && user.email) {
                    userEmail = user.email.toLowerCase().trim();
                }
            }

            // Get form data
            const formEmail = document.getElementById('email')?.value.trim() || '';
            // Use logged-in user's email if available, otherwise use form email
            const orderEmail = userEmail || formEmail.toLowerCase().trim();

            const shipping = {
                fullName: document.getElementById('full-name').value.trim(),
                email: orderEmail, // Use normalized email
                address: document.getElementById('address').value.trim(),
                city: document.getElementById('city').value.trim(),
                state: document.getElementById('state').value.trim(),
                zip: document.getElementById('zip').value.trim(),
                country: document.getElementById('country').value,
                phone: document.getElementById('phone')?.value.trim() || null
            };

            // Create order using orderManager
            if (typeof orderManager === 'undefined') {
                throw new Error('OrderManager is not available');
            }

            const order = orderManager.createOrder({
                items: cart,
                shipping: shipping
            });

            // Save order to user's history (already done by orderManager, but ensure it's linked)
            this.linkOrderToUser(order);

            // Clear cart after purchase
            this.clearCart();

            // Send order confirmation email
            this.sendOrderConfirmationEmail(order, shipping);

            return order;
        } catch (error) {
            console.error('Error processing order:', error);
            alert('An error occurred while processing your order. Please try again.');
            return false;
        }
    }

    /**
     * Link order to user account
     */
    linkOrderToUser(order) {
        const user = this.getCurrentUser();
        if (!user) return;

        // Order is already saved with user's email by orderManager
        // But we can update user's order history if needed
        // The orderManager already handles this through getUserOrders(email)
    }

    /**
     * Clear cart after purchase
     */
    clearCart() {
        // Clear cart from localStorage
        localStorage.setItem('cart', JSON.stringify([]));
        
        // Update cart count display
        if (typeof updateCartCount === 'function') {
            updateCartCount();
        }
        
        // Update nav manager cart badge
        if (typeof navManager !== 'undefined' && navManager.updateCartBadge) {
            navManager.updateCartBadge();
        }

        // Dispatch cart cleared event
        window.dispatchEvent(new Event('cartUpdated'));
    }

    /**
     * Send order confirmation email
     */
    sendOrderConfirmationEmail(order, shipping) {
        if (!order || !order.totals) return;

        const totals = order.totals;
        const emailContent = this.generateOrderConfirmationEmail(order, shipping);

        // Use authManager if available
        if (typeof authManager !== 'undefined' && authManager.addUserEmail) {
            authManager.addUserEmail({
                subject: `Order Confirmation - ${order.orderId}`,
                preview: `Thank you for your order! Total: $${totals.total.toFixed(2)}`,
                content: emailContent
            });
        } else if (typeof addUserEmail === 'function') {
            // Fallback to script.js function
            addUserEmail({
                subject: `Order Confirmation - ${order.orderId}`,
                preview: `Thank you for your order! Total: $${totals.total.toFixed(2)}`,
                content: emailContent
            });
        }
    }

    /**
     * Generate order confirmation email content
     */
    generateOrderConfirmationEmail(order, shipping) {
        const totals = order.totals;
        const orderDate = typeof orderManager !== 'undefined' && orderManager.formatOrderDate 
            ? orderManager.formatOrderDate(order.orderDate)
            : new Date(order.orderDate).toLocaleString();

        return `
            <h2>Order Confirmation</h2>
            <p>Thank you for your purchase!</p>
            <p><strong>Order ID:</strong> ${this.escapeHtml(order.orderId)}</p>
            <p><strong>Order Date:</strong> ${this.escapeHtml(orderDate)}</p>
            <h3>Order Summary</h3>
            <ul>
                ${order.items.map(item => {
                    const colorInfo = item.color ? ` - Color: ${this.escapeHtml(item.color)}` : '';
                    return `<li>${this.escapeHtml(item.name)} - ${this.escapeHtml(item.size)}${colorInfo} x ${item.quantity} - $${(item.price * item.quantity).toFixed(2)}</li>`;
                }).join('')}
            </ul>
            <p><strong>Subtotal:</strong> $${totals.subtotal.toFixed(2)}</p>
            <p><strong>Shipping:</strong> $${totals.shipping.toFixed(2)}</p>
            <p><strong>Tax:</strong> $${totals.tax.toFixed(2)}</p>
            <p><strong>Total:</strong> $${totals.total.toFixed(2)}</p>
            <h3>Shipping Address</h3>
            <p>${this.escapeHtml(shipping.fullName)}<br>
            ${this.escapeHtml(shipping.address)}<br>
            ${this.escapeHtml(shipping.city)}, ${this.escapeHtml(shipping.state)} ${this.escapeHtml(shipping.zip)}<br>
            ${this.escapeHtml(shipping.country)}</p>
            ${shipping.phone ? `<p><strong>Phone:</strong> ${this.escapeHtml(shipping.phone)}</p>` : ''}
            <p>We will send you another email when your order ships.</p>
        `;
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
const checkoutManager = new CheckoutManager();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CheckoutManager;
}

