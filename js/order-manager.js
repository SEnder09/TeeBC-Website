// Order Manager Module
// Handles order creation, retrieval, and management

class OrderManager {
    constructor() {
        this.SHIPPING_FEE = 5.00;
        this.TAX_RATE = 0.1; // 10% tax
        this.init();
    }

    /**
     * Initialize Order Manager
     */
    init() {
        // Ensure orders array exists in localStorage
        if (!localStorage.getItem('orders')) {
            localStorage.setItem('orders', JSON.stringify([]));
        }
    }

    /**
     * Create a new order
     * @param {Object} orderData - Order data
     * @param {Array} orderData.items - Cart items
     * @param {Object} orderData.shipping - Shipping information
     * @param {string} orderData.shipping.fullName - Full name
     * @param {string} orderData.shipping.email - Email address
     * @param {string} orderData.shipping.address - Street address
     * @param {string} orderData.shipping.city - City
     * @param {string} orderData.shipping.state - State/Province
     * @param {string} orderData.shipping.zip - ZIP/Postal code
     * @param {string} orderData.shipping.country - Country
     * @param {string} [orderData.shipping.phone] - Phone number (optional)
     * @returns {Object} - Created order object
     */
    createOrder(orderData) {
        const { items, shipping } = orderData;

        // Validate required data
        if (!items || !Array.isArray(items) || items.length === 0) {
            throw new Error('Order must contain at least one item');
        }

        if (!shipping || !shipping.email) {
            throw new Error('Shipping information is required');
        }

        // Calculate totals
        const subtotal = this.calculateSubtotal(items);
        const shippingFee = this.SHIPPING_FEE;
        const tax = this.calculateTax(subtotal);
        const total = this.calculateTotal(subtotal, shippingFee, tax);

        // Generate order ID
        const orderId = this.generateOrderId();

        // Normalize email to lowercase and trim
        const normalizedEmail = (shipping.email || '').toLowerCase().trim();

        // Create order object
        const order = {
            orderId: orderId,
            email: normalizedEmail,
            fullName: shipping.fullName || '',
            shipping: {
                address: shipping.address || '',
                city: shipping.city || '',
                state: shipping.state || '',
                zip: shipping.zip || '',
                country: shipping.country || '',
                phone: shipping.phone || null
            },
            items: items.map(item => ({
                id: item.id || item.productId,
                productId: item.productId || item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity || 1,
                size: item.size || 'N/A',
                color: item.color || null,
                image: item.image || ''
            })),
            totals: {
                subtotal: subtotal,
                shipping: shippingFee,
                tax: tax,
                total: total
            },
            status: 'pending', // pending, processing, shipped, delivered, cancelled
            orderDate: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Save order
        this.saveOrder(order);

        return order;
    }

    /**
     * Save order to localStorage
     * @param {Object} order - Order object
     */
    saveOrder(order) {
        const orders = this.getAllOrders();
        orders.push(order);
        localStorage.setItem('orders', JSON.stringify(orders));

        // Dispatch event for order creation
        window.dispatchEvent(new CustomEvent('orderCreated', { detail: order }));
    }

    /**
     * Get all orders from localStorage
     * @returns {Array} - Array of all orders
     */
    getAllOrders() {
        try {
            return JSON.parse(localStorage.getItem('orders')) || [];
        } catch (e) {
            console.error('Error parsing orders:', e);
            return [];
        }
    }

    /**
     * Get orders for a specific user
     * @param {string} email - User's email address
     * @returns {Array} - Array of user's orders
     */
    getUserOrders(email) {
        if (!email) {
            // Try to get from authManager if available
            if (typeof authManager !== 'undefined' && authManager.getCurrentUser) {
                const user = authManager.getCurrentUser();
                if (user && user.email) {
                    email = user.email;
                }
            }
        }

        if (!email) {
            return [];
        }

        // Normalize email to lowercase for comparison
        const normalizedEmail = email.toLowerCase().trim();
        const allOrders = this.getAllOrders();
        return allOrders.filter(order => {
            // Handle both order.email and order.shipping.email
            const orderEmail = (order.email || order.shipping?.email || '').toLowerCase().trim();
            return orderEmail === normalizedEmail;
        });
    }

    /**
     * Get order by order ID
     * @param {string} orderId - Order ID
     * @returns {Object|null} - Order object or null if not found
     */
    getOrderById(orderId) {
        const orders = this.getAllOrders();
        return orders.find(order => order.orderId === orderId) || null;
    }

    /**
     * Update order status
     * @param {string} orderId - Order ID
     * @param {string} status - New status (pending, processing, shipped, delivered, cancelled)
     * @returns {boolean} - True if updated successfully
     */
    updateOrderStatus(orderId, status) {
        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }

        const orders = this.getAllOrders();
        const orderIndex = orders.findIndex(order => order.orderId === orderId);

        if (orderIndex === -1) {
            return false;
        }

        orders[orderIndex].status = status;
        orders[orderIndex].updatedAt = new Date().toISOString();
        localStorage.setItem('orders', JSON.stringify(orders));

        // Dispatch event for order update
        window.dispatchEvent(new CustomEvent('orderUpdated', { 
            detail: { orderId, status, order: orders[orderIndex] }
        }));

        return true;
    }

    /**
     * Calculate subtotal from items
     * @param {Array} items - Array of cart items
     * @returns {number} - Subtotal amount
     */
    calculateSubtotal(items) {
        if (!items || !Array.isArray(items)) {
            return 0;
        }
        return items.reduce((sum, item) => {
            const price = parseFloat(item.price) || 0;
            const quantity = parseInt(item.quantity) || 1;
            return sum + (price * quantity);
        }, 0);
    }

    /**
     * Calculate tax
     * @param {number} subtotal - Subtotal amount
     * @returns {number} - Tax amount
     */
    calculateTax(subtotal) {
        return parseFloat((subtotal * this.TAX_RATE).toFixed(2));
    }

    /**
     * Calculate total order amount
     * @param {number} subtotal - Subtotal amount
     * @param {number} shipping - Shipping fee
     * @param {number} tax - Tax amount
     * @returns {number} - Total amount
     */
    calculateTotal(subtotal, shipping, tax) {
        const total = subtotal + shipping + tax;
        return parseFloat(total.toFixed(2));
    }

    /**
     * Calculate order totals from items
     * @param {Array} items - Array of cart items
     * @returns {Object} - Object containing subtotal, shipping, tax, and total
     */
    calculateOrderTotals(items) {
        const subtotal = this.calculateSubtotal(items);
        const shipping = this.SHIPPING_FEE;
        const tax = this.calculateTax(subtotal);
        const total = this.calculateTotal(subtotal, shipping, tax);

        return {
            subtotal: subtotal,
            shipping: shipping,
            tax: tax,
            total: total
        };
    }

    /**
     * Generate unique order ID
     * @returns {string} - Order ID in format ORD-YYYYMMDD-HHMMSS-XXXX
     */
    generateOrderId() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
        
        return `ORD-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;
    }

    /**
     * Get orders sorted by date (newest first)
     * @param {Array} orders - Array of orders (optional, defaults to all orders)
     * @returns {Array} - Sorted orders
     */
    getOrdersSortedByDate(orders = null) {
        const ordersList = orders || this.getAllOrders();
        return [...ordersList].sort((a, b) => {
            return new Date(b.orderDate) - new Date(a.orderDate);
        });
    }

    /**
     * Get orders filtered by status
     * @param {string} status - Order status
     * @param {Array} orders - Array of orders (optional, defaults to all orders)
     * @returns {Array} - Filtered orders
     */
    getOrdersByStatus(status, orders = null) {
        const ordersList = orders || this.getAllOrders();
        return ordersList.filter(order => order.status === status);
    }

    /**
     * Get orders within date range
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @param {Array} orders - Array of orders (optional, defaults to all orders)
     * @returns {Array} - Filtered orders
     */
    getOrdersByDateRange(startDate, endDate, orders = null) {
        const ordersList = orders || this.getAllOrders();
        return ordersList.filter(order => {
            const orderDate = new Date(order.orderDate);
            return orderDate >= startDate && orderDate <= endDate;
        });
    }

    /**
     * Get order statistics for a user
     * @param {string} email - User's email address
     * @returns {Object} - Statistics object
     */
    getUserOrderStatistics(email) {
        const orders = this.getUserOrders(email);
        
        const totalOrders = orders.length;
        const totalSpent = orders.reduce((sum, order) => sum + (order.totals?.total || 0), 0);
        const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
        
        const statusCounts = {
            pending: 0,
            processing: 0,
            shipped: 0,
            delivered: 0,
            cancelled: 0
        };

        orders.forEach(order => {
            const status = order.status || 'pending';
            if (statusCounts.hasOwnProperty(status)) {
                statusCounts[status]++;
            }
        });

        return {
            totalOrders,
            totalSpent: parseFloat(totalSpent.toFixed(2)),
            averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
            statusCounts
        };
    }

    /**
     * Create mock order data for testing
     * @param {number} count - Number of mock orders to create
     * @param {string} email - Email address for orders (optional)
     * @returns {Array} - Array of created mock orders
     */
    createMockOrders(count = 5, email = null) {
        const mockOrders = [];
        const mockProducts = [
            { id: 1, name: 'Anime T-Shirt', price: 29.99, image: 'img/Anime_T.png' },
            { id: 2, name: 'Movie Poster', price: 19.99, image: 'img/Movie_Poster.png' },
            { id: 3, name: 'Meme Bag', price: 14.99, image: 'img/meme_mugbag.png' },
            { id: 5, name: 'Anime Hoodie', price: 49.99, image: 'img/Anime_hoodie.png' }
        ];

        const statuses = ['pending', 'processing', 'shipped', 'delivered'];
        const countries = ['HK', 'US', 'UK', 'CA', 'AU', 'JP', 'TW', 'CN', 'SG'];
        const cities = ['Hong Kong', 'New York', 'London', 'Toronto', 'Sydney', 'Tokyo', 'Taipei', 'Beijing', 'Singapore'];

        // Get user email if not provided
        if (!email && typeof authManager !== 'undefined' && authManager.getCurrentUser) {
            const user = authManager.getCurrentUser();
            if (user && user.email) {
                email = user.email;
            }
        }

        // Default email if still not provided
        if (!email) {
            email = 'test@example.com';
        }

        for (let i = 0; i < count; i++) {
            // Random date within last 30 days
            const daysAgo = Math.floor(Math.random() * 30);
            const orderDate = new Date();
            orderDate.setDate(orderDate.getDate() - daysAgo);
            orderDate.setHours(Math.floor(Math.random() * 24));
            orderDate.setMinutes(Math.floor(Math.random() * 60));

            // Random items (1-3 items per order)
            const itemCount = Math.floor(Math.random() * 3) + 1;
            const items = [];
            for (let j = 0; j < itemCount; j++) {
                const product = mockProducts[Math.floor(Math.random() * mockProducts.length)];
                items.push({
                    id: product.id,
                    productId: product.id,
                    name: product.name,
                    price: product.price,
                    quantity: Math.floor(Math.random() * 3) + 1,
                    size: ['S', 'M', 'L', 'XL'][Math.floor(Math.random() * 4)],
                    image: product.image
                });
            }

            const subtotal = this.calculateSubtotal(items);
            const shipping = this.SHIPPING_FEE;
            const tax = this.calculateTax(subtotal);
            const total = this.calculateTotal(subtotal, shipping, tax);

            const country = countries[Math.floor(Math.random() * countries.length)];
            const city = cities[Math.floor(Math.random() * cities.length)];

            const order = {
                orderId: this.generateOrderId(),
                email: email,
                fullName: `Test User ${i + 1}`,
                shipping: {
                    address: `${Math.floor(Math.random() * 9999) + 1} Test Street`,
                    city: city,
                    state: 'Test State',
                    zip: String(Math.floor(Math.random() * 99999) + 10000),
                    country: country,
                    phone: `+852 ${Math.floor(Math.random() * 90000000) + 10000000}`
                },
                items: items,
                totals: {
                    subtotal: subtotal,
                    shipping: shipping,
                    tax: tax,
                    total: total
                },
                status: statuses[Math.floor(Math.random() * statuses.length)],
                orderDate: orderDate.toISOString(),
                updatedAt: orderDate.toISOString()
            };

            mockOrders.push(order);
        }

        // Save mock orders
        const existingOrders = this.getAllOrders();
        existingOrders.push(...mockOrders);
        localStorage.setItem('orders', JSON.stringify(mockOrders.length === count ? mockOrders : existingOrders));

        return mockOrders;
    }

    /**
     * Clear all orders (use with caution!)
     */
    clearAllOrders() {
        localStorage.setItem('orders', JSON.stringify([]));
    }

    /**
     * Delete order by order ID
     * @param {string} orderId - Order ID
     * @returns {boolean} - True if deleted successfully
     */
    deleteOrder(orderId) {
        const orders = this.getAllOrders();
        const filteredOrders = orders.filter(order => order.orderId !== orderId);
        
        if (filteredOrders.length === orders.length) {
            return false; // Order not found
        }

        localStorage.setItem('orders', JSON.stringify(filteredOrders));
        return true;
    }

    /**
     * Format order date for display
     * @param {string} dateString - ISO date string
     * @returns {string} - Formatted date string
     */
    formatOrderDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Format currency for display
     * @param {number} amount - Amount to format
     * @returns {string} - Formatted currency string
     */
    formatCurrency(amount) {
        return `$${parseFloat(amount).toFixed(2)}`;
    }
}

// Create global instance
const orderManager = new OrderManager();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OrderManager;
}

