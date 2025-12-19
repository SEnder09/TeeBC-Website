// Auth Manager Module
// Centralized authentication logic for TeeBC

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    /**
     * Initialize AuthManager - load current user from localStorage
     */
    init() {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                this.currentUser = JSON.parse(storedUser);
            } catch (e) {
                console.error('Error parsing stored user:', e);
                this.currentUser = null;
            }
        }
    }

    /**
     * Register a new user
     * @param {Object} userData - User registration data
     * @param {string} userData.name - User's full name
     * @param {string} userData.email - User's email
     * @param {string} userData.password - User's password
     * @returns {Object} - { success: boolean, message: string, user?: Object }
     */
    register(userData) {
        const { name, email, password } = userData;

        // Validation
        if (!name || name.trim().length < 2) {
            return { success: false, message: 'Name must be at least 2 characters' };
        }

        if (!email || !this.validateEmail(email)) {
            return { success: false, message: 'Please enter a valid email address' };
        }

        if (!password || password.length < 6) {
            return { success: false, message: 'Password must be at least 6 characters' };
        }

        // Check if user already exists
        const users = this.getAllUsers();
        const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        
        if (existingUser) {
            return { success: false, message: 'An account with this email already exists' };
        }

        // Create new user object
        const newUser = {
            id: 'user-' + Date.now(),
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: password, // In production, this should be hashed
            registeredDate: new Date().toISOString(),
            shippingAddresses: [],
            defaultAddressId: null,
            preferences: {
                newsletter: false,
                notifications: true
            }
        };

        // Save user to users array
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));

        // Auto-login after registration
        this.setCurrentUser(newUser);

        return {
            success: true,
            message: 'Registration successful!',
            user: this.getSafeUser(newUser)
        };
    }

    /**
     * Login user
     * @param {string} email - User's email
     * @param {string} password - User's password
     * @returns {Object} - { success: boolean, message: string, user?: Object }
     */
    login(email, password) {
        if (!email || !password) {
            return { success: false, message: 'Email and password are required' };
        }

        const users = this.getAllUsers();
        const user = users.find(u => 
            u.email.toLowerCase() === email.toLowerCase() && 
            u.password === password
        );

        if (!user) {
            return { success: false, message: 'Invalid email or password' };
        }

        // Set current user and login state
        this.setCurrentUser(user);

        return {
            success: true,
            message: 'Login successful!',
            user: this.getSafeUser(user)
        };
    }

    /**
     * Logout current user
     */
    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        localStorage.setItem('isLoggedIn', 'false');
        
        // Optionally clear cart on logout (commented out to preserve cart)
        // localStorage.removeItem('cart');
        
        // Dispatch logout event for other modules to listen
        window.dispatchEvent(new Event('userLogout'));
    }

    /**
     * Get current logged-in user
     * @returns {Object|null} - Current user object or null
     */
    getCurrentUser() {
        if (!this.currentUser) {
            this.init();
        }
        return this.currentUser ? this.getSafeUser(this.currentUser) : null;
    }

    /**
     * Get current user with sensitive data (for internal use)
     * Always gets from users array to ensure password is available
     * @returns {Object|null} - Current user object with password or null
     */
    getCurrentUserFull() {
        if (!this.currentUser) {
            this.init();
        }
        
        // If no current user, return null
        if (!this.currentUser || !this.currentUser.email) {
            return null;
        }
        
        // Always get full user from users array (authoritative source) to ensure password is available
        const users = this.getAllUsers();
        const fullUser = users.find(u => u.email && u.email.toLowerCase() === this.currentUser.email.toLowerCase());
        
        return fullUser || this.currentUser;
    }

    /**
     * Check if user is logged in
     * @returns {boolean}
     */
    isLoggedIn() {
        return this.currentUser !== null && localStorage.getItem('isLoggedIn') === 'true';
    }

    /**
     * Set current user and update localStorage
     * @param {Object} user - User object
     */
    setCurrentUser(user) {
        this.currentUser = user;
        if (user) {
            localStorage.setItem('currentUser', JSON.stringify(user));
            localStorage.setItem('isLoggedIn', 'true');
        } else {
            localStorage.removeItem('currentUser');
            localStorage.setItem('isLoggedIn', 'false');
        }
    }

    /**
     * Update current user data
     * @param {Object} updates - Fields to update
     * @returns {Object} - { success: boolean, message: string, user?: Object }
     */
    updateUser(updates) {
        if (!this.isLoggedIn()) {
            return { success: false, message: 'User not logged in' };
        }

        const users = this.getAllUsers();
        const userIndex = users.findIndex(u => u.email === this.currentUser.email);

        if (userIndex === -1) {
            return { success: false, message: 'User not found' };
        }

        // Update user data (exclude password from direct updates)
        const { password, ...safeUpdates } = updates;
        users[userIndex] = { ...users[userIndex], ...safeUpdates };

        // Update password separately if provided
        if (password) {
            users[userIndex].password = password;
        }

        localStorage.setItem('users', JSON.stringify(users));
        this.setCurrentUser(users[userIndex]);

        return {
            success: true,
            message: 'Profile updated successfully',
            user: this.getSafeUser(users[userIndex])
        };
    }

    /**
     * Change user password
     * @param {string} currentPassword - Current password
     * @param {string} newPassword - New password
     * @returns {Object} - { success: boolean, message: string }
     */
    changePassword(currentPassword, newPassword) {
        if (!this.isLoggedIn()) {
            return { success: false, message: 'User not logged in' };
        }

        if (!currentPassword) {
            return { success: false, message: 'Current password is required' };
        }

        if (this.currentUser.password !== currentPassword) {
            return { success: false, message: 'Current password is incorrect' };
        }

        if (!newPassword) {
            return { success: false, message: 'New password is required' };
        }

        if (newPassword.length < 6) {
            return { success: false, message: 'New password must be at least 6 characters' };
        }

        // Check if new password is same as current password
        if (currentPassword === newPassword) {
            return { success: false, message: 'New password must be different from current password' };
        }

        return this.updateUser({ password: newPassword });
    }

    /**
     * Get all users (for internal use)
     * @returns {Array} - Array of all users
     */
    getAllUsers() {
        try {
            return JSON.parse(localStorage.getItem('users')) || [];
        } catch (e) {
            console.error('Error parsing users:', e);
            return [];
        }
    }

    /**
     * Get user by email
     * @param {string} email - User's email
     * @returns {Object|null} - User object or null
     */
    getUserByEmail(email) {
        const users = this.getAllUsers();
        return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
    }

    /**
     * Get safe user object (without password)
     * @param {Object} user - User object
     * @returns {Object} - User object without password
     */
    getSafeUser(user) {
        if (!user) return null;
        const { password, ...safeUser } = user;
        return safeUser;
    }

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean}
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Check if email is already registered
     * @param {string} email - Email to check
     * @returns {boolean}
     */
    emailExists(email) {
        const users = this.getAllUsers();
        return users.some(u => u.email.toLowerCase() === email.toLowerCase());
    }

    /**
     * Get user's orders
     * @returns {Array} - Array of user's orders
     */
    getUserOrders() {
        if (!this.isLoggedIn()) {
            return [];
        }
        const allOrders = JSON.parse(localStorage.getItem('orders')) || [];
        return allOrders.filter(order => order.email === this.currentUser.email);
    }

    /**
     * Get user's emails
     * @returns {Array} - Array of user's emails
     */
    getUserEmails() {
        if (!this.isLoggedIn()) {
            return [];
        }
        const allEmails = JSON.parse(localStorage.getItem('userEmails')) || {};
        return allEmails[this.currentUser.email] || [];
    }

    /**
     * Add email to user's inbox
     * @param {Object} emailData - Email data
     */
    addUserEmail(emailData) {
        if (!this.isLoggedIn()) {
            return;
        }
        const allEmails = JSON.parse(localStorage.getItem('userEmails')) || {};
        if (!allEmails[this.currentUser.email]) {
            allEmails[this.currentUser.email] = [];
        }
        allEmails[this.currentUser.email].unshift({
            id: 'email-' + Date.now(),
            date: new Date().toISOString(),
            ...emailData
        });
        localStorage.setItem('userEmails', JSON.stringify(allEmails));
    }

    /**
     * Require authentication - redirect to login if not logged in
     * @param {string} returnUrl - URL to return to after login
     * @returns {boolean} - True if authenticated, false if redirected
     */
    requireAuth(returnUrl = null) {
        if (!this.isLoggedIn()) {
            const currentUrl = window.location.pathname;
            const redirectUrl = returnUrl || currentUrl;
            window.location.href = `login.html?return=${encodeURIComponent(redirectUrl)}`;
            return false;
        }
        return true;
    }
}

// Create global instance
const authManager = new AuthManager();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}
