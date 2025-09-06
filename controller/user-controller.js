const userService = require('../service/user.service');
const crypto = require('crypto');
const {
    encrypt,
    dcrypt,
    remember,
    generateRandomToken
} = require('../utils/crypto');

/**
 * Get all users with optional pagination and search
 */
const getAllUsers = async (req, res, next) => {
    try {
        const {
            page = 1, limit = 10, search = ''
        } = req.query;

        let users, pagination;

        if (search) {
            // Search users by name or email
            const searchResults = await userService.searchUsers(search, {
                limit: parseInt(limit),
                skip: (parseInt(page) - 1) * parseInt(limit),
                sort: {
                    createdAt: -1
                }
            });
            users = searchResults;
            pagination = null; // For simplicity, search doesn't include pagination
        } else {
            // Get users with pagination
            const result = await userService.getUsersWithPagination({},
                parseInt(page),
                parseInt(limit), {
                    createdAt: -1
                },
                'blogs'
            );
            users = result.users;
            pagination = result.pagination;
        }

        if (!users || users.length === 0) {
            return res.status(404).json({
                success: false,
                message: search ? "No users found matching your search" : "No users found"
            });
        }

        return res.status(200).json({
            success: true,
            count: users.length,
            users,
            pagination
        });
    } catch (error) {
        console.log('Get all users error:', error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

/**
 * User signup with email verification
 */
const signup = async (req, res, next) => {
    try {
        let {
            email,
            name,
            password,
            sendWelcomeEmail = true
        } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and password are required"
            });
        }

        // Password length validation
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters long"
            });
        }

        // Convert email to lowercase
        email = email.toLowerCase().trim();
        name = name.trim();

        // Check if user already exists using service
        const existingUser = await userService.findOneUser({
            $or: [{
                email
            }, {
                name
            }]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: existingUser.email === email ?
                    "User already exists with this email" :
                    "User already exists with this name"
            });
        }

        // Register user with email verification
        const result = await userService.registerUserWithVerification({
            name,
            email,
            password,
            blogs: []
        });


        //Generate jwt token
        const tokenPayload = {
            id: result.user._id,
            email: result.user.email,
            name: result.user.name
        };
        const accessToken = encrypt(tokenPayload);

        return res.status(201).json({
            success: true,
            message: "User registered successfully. Please check your email to verify your account.",
            user: result.user,
            token: accessToken,
            emailSent: result.emailSent,
            verificationRequired: true
        });

    } catch (error) {
        console.log('Signup error:', error);

        // Handle duplicate key error
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({
                success: false,
                message: `${field} already exists`
            });
        }

        return res.status(500).json({
            success: false,
            message: "Server error during registration"
        });
    }
};



/**
 * Verify email address
 */
const verifyEmail = async (req, res, next) => {
    try {
        const {
            token
        } = req.params;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Verification token is required"
            });
        }

        const result = await userService.verifyEmail(token);

        // Generate login token after verification
        const accessToken = encrypt({
            id: result.user._id,
            email: result.user.email,
            name: result.user.name
        });

        return res.status(200).json({
            success: true,
            message: result.message,
            user: result.user,
            token: accessToken
        });

    } catch (error) {
        console.log('Email verification error:', error);

        return res.status(400).json({
            success: false,
            message: error.message || "Invalid or expired verification token"
        });
    }
};

/**
 * Resend email verification
 */
const resendEmailVerification = async (req, res, next) => {
    try {
        let {
            email
        } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        email = email.toLowerCase().trim();

        const result = await userService.resendEmailVerification(email);

        return res.status(200).json({
            success: true,
            message: result.message,
            emailSent: result.emailSent
        });

    } catch (error) {
        console.log('Resend verification error:', error);

        return res.status(400).json({
            success: false,
            message: error.message || "Failed to resend verification email"
        });
    }
};

/**
 * User login with JWT token generation
 */
const login = async (req, res, next) => {
    try {
        let {
            email,
            password,
            rememberMe = false
        } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        // Authenticate user using service
        const authResult = await userService.authenticateUser(email, password);
        const user = authResult.user;

        // Generate JWT token with user payload
        const tokenPayload = {
            id: user._id,
            email: user.email,
            name: user.name
        };

        let accessToken;

        if (rememberMe) {
            // Generate long-lived token and set as cookie
            accessToken = remember(tokenPayload, true, res);

            // Generate refresh token for extended session
            const refreshResult = await userService.generateRefreshToken(user._id);
        } else {
            // Generate short-lived token (6 hours)
            accessToken = encrypt(tokenPayload);
        }

        return res.status(200).json({
            success: true,
            message: "Login successful",
            user,
            token: accessToken,
            rememberMe
        });

    } catch (error) {
        console.log('Login error:', error);

        if (error.message === 'Invalid email or password' ||
            error.message === 'Please verify your email before logging in') {
            return res.status(401).json({
                success: false,
                message: error.message,
                requiresVerification: error.message.includes('verify')
            });
        }

        return res.status(500).json({
            success: false,
            message: "Server error during login"
        });
    }
};

/**
 * Find user by ID
 */
const findById = async (req, res, next) => {
    try {
        const {
            id
        } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        const user = await userService.findUserById(id, '', 'blogs');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            user
        });

    } catch (error) {
        console.log('Find user by ID error:', error);

        // Handle invalid ObjectId
        if (error.message === 'Invalid user ID format') {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID format"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

/**
 * Update user information
 */
const updateUser = async (req, res, next) => {
    try {
        const {
            id
        } = req.params;
        let {
            name,
            email
        } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        const updateData = {};
        if (name) updateData.name = name.trim();
        if (email) {
            updateData.email = email.toLowerCase().trim();
            // If email is being changed, reset verification status
            updateData.isEmailVerified = false;
        }

        const user = await userService.updateUserById(id, updateData, {
            new: true,
            runValidators: true
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // If email was changed, send new verification email
        if (email && email.toLowerCase().trim() !== user.email) {
            try {
                await userService.resendEmailVerification(user.email);
            } catch (emailError) {
                console.log('Failed to send verification email after update:', emailError);
            }
        }

        // Populate blogs after update
        await user.populate('blogs');

        return res.status(200).json({
            success: true,
            message: email ? "User updated successfully. Please verify your new email address." : "User updated successfully",
            user,
            requiresEmailVerification: !!email
        });

    } catch (error) {
        console.log('Update user error:', error);

        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({
                success: false,
                message: `${field} already exists`
            });
        }

        if (error.message === 'Invalid user ID format') {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID format"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Server error during update"
        });
    }
};

/**
 * Change user password
 */
const changePassword = async (req, res, next) => {
    try {
        const {
            id
        } = req.params;
        const {
            currentPassword,
            newPassword
        } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Current password and new password are required"
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: "New password must be at least 8 characters long"
            });
        }

        const user = await userService.findUserById(id, '+password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Verify current password
        const isCurrentPasswordCorrect = await user.matchPassword(currentPassword);

        if (!isCurrentPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: "Current password is incorrect"
            });
        }

        // Update password (will be hashed by pre-save middleware)
        user.password = newPassword;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password changed successfully"
        });

    } catch (error) {
        console.log('Change password error:', error);

        if (error.message === 'Invalid user ID format') {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID format"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Server error during password change"
        });
    }
};

/**
 * Forgot password - generate reset token and send email
 */
const forgotPassword = async (req, res, next) => {
    try {
        let {
            email
        } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        email = email.toLowerCase().trim();

        try {
            const result = await userService.generatePasswordResetToken(email);

            return res.status(200).json({
                success: true,
                message: result.message,
                emailSent: result.emailSent
            });
        } catch (error) {
            // Don't reveal if user exists for security
            if (error.message === 'User not found with this email') {
                return res.status(200).json({
                    success: true,
                    message: "If a user with that email exists, a password reset link has been sent"
                });
            }
            throw error;
        }

    } catch (error) {
        console.log('Forgot password error:', error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

/**
 * Reset password using token
 */
const resetPassword = async (req, res, next) => {
    try {
        const {
            token
        } = req.params;
        const {
            password
        } = req.body;

        if (!password) {
            return res.status(400).json({
                success: false,
                message: "New password is required"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters long"
            });
        }

        // Find user by reset token using service
        const user = await userService.findUserByResetToken(token);

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired reset token"
            });
        }

        // Update password and clear reset token fields
        user.password = password;
        user.passwordResetToken = undefined;
        user.passwordResetExpiry = undefined;

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password reset successfully"
        });

    } catch (error) {
        console.log('Reset password error:', error);
        return res.status(500).json({
            success: false,
            message: "Server error during password reset"
        });
    }
};

/**
 * Refresh token endpoint
 */
const refreshToken = async (req, res, next) => {
    try {
        const {
            refreshToken: providedRefreshToken
        } = req.body;
        const cookieToken = req.cookies?.token;

        if (!providedRefreshToken && !cookieToken) {
            return res.status(401).json({
                success: false,
                message: "Refresh token is required"
            });
        }

        let user;

        if (cookieToken) {
            try {
                // Verify the JWT token from cookie
                const decoded = dcrypt(cookieToken);
                user = await userService.findUserById(decoded.id);
            } catch (jwtError) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid or expired token"
                });
            }
        } else {
            // Validate refresh token from database
            user = await userService.validateRefreshToken(providedRefreshToken);
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired refresh token"
            });
        }

        // Generate new access token
        const tokenPayload = {
            id: user._id,
            email: user.email,
            name: user.name
        };

        const accessToken = encrypt(tokenPayload);

        return res.status(200).json({
            success: true,
            message: "Token refreshed successfully",
            token: accessToken,
            user
        });

    } catch (error) {
        console.log('Refresh token error:', error);
        return res.status(500).json({
            success: false,
            message: "Server error during token refresh"
        });
    }
};

/**
 * Logout user and invalidate tokens
 */
const logout = async (req, res, next) => {
    try {
        const {
            userId
        } = req.body;
        const cookieToken = req.cookies?.token;

        // If user ID not provided, try to get from token
        let userIdToLogout = userId;

        if (!userIdToLogout && cookieToken) {
            try {
                const decoded = dcrypt(cookieToken);
                userIdToLogout = decoded.id;
            } catch (error) {
                // Token invalid, but we can still clear cookie
            }
        }

        // Invalidate refresh token if user ID available
        if (userIdToLogout) {
            try {
                await userService.invalidateRefreshToken(userIdToLogout);
            } catch (error) {
                console.log('Error invalidating refresh token:', error);
            }
        }

        // Clear cookie
        res.clearCookie('token');

        return res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });

    } catch (error) {
        console.log('Logout error:', error);
        return res.status(500).json({
            success: false,
            message: "Server error during logout"
        });
    }
};

/**
 * Verify JWT token middleware/endpoint
 */
const verifyToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Access token is required"
            });
        }

        const decoded = dcrypt(token);
        const user = await userService.findUserById(decoded.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid token - user not found"
            });
        }

        // If called as middleware, attach user to request
        if (typeof next === 'function') {
            req.user = user;
            return next();
        }

        // If called as endpoint, return user info
        return res.status(200).json({
            success: true,
            message: "Token is valid",
            user
        });

    } catch (error) {
        console.log('Token verification error:', error);

        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Server error during token verification"
        });
    }
};
const deleteUser = async (req, res, next) => {
    try {
        const {
            id
        } = req.params;

        const user = await userService.deleteUserById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "User deleted successfully"
        });

    } catch (error) {
        console.log('Delete user error:', error);

        if (error.message === 'Invalid user ID format') {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID format"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

/**
 * Get comprehensive user statistics
 */
const getUserStats = async (req, res, next) => {
    try {
        const stats = await userService.getUserStatistics();

        return res.status(200).json({
            success: true,
            stats
        });
    } catch (error) {
        console.log('Get user stats error:', error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

/**
 * Clean up expired tokens (admin endpoint)
 */
const cleanupExpiredTokens = async (req, res, next) => {
    try {
        const result = await userService.cleanupExpiredTokens();

        return res.status(200).json({
            success: true,
            message: result.message,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.log('Cleanup tokens error:', error);
        return res.status(500).json({
            success: false,
            message: "Server error during cleanup"
        });
    }
};

/**
 * Send blog notification to users (for blog creation)
 */
const sendBlogNotification = async (req, res, next) => {
    try {
        const {
            blogId,
            authorId,
            userIds
        } = req.body;

        if (!blogId || !authorId) {
            return res.status(400).json({
                success: false,
                message: "Blog ID and Author ID are required"
            });
        }

        // You would typically get blog and author from your blog service
        // For now, assume they are passed in the request or fetched here
        const blog = req.body.blog; // Should come from blog service
        const author = req.body.author; // Should come from user service

        const result = await userService.sendBlogNotificationToUsers(blog, author, userIds);

        return res.status(200).json({
            success: true,
            message: `Blog notification sent to ${result.emailsSent} users`,
            details: {
                totalUsers: result.totalUsers,
                emailsSent: result.emailsSent,
                emailsFailed: result.emailsFailed
            }
        });

    } catch (error) {
        console.log('Send blog notification error:', error);
        return res.status(500).json({
            success: false,
            message: "Server error during notification send"
        });
    }
};

module.exports = {
    // Original functions
    getAllUsers,
    login,
    findById,
    updateUser,
    changePassword,
    resetPassword,
    deleteUser,
    getUserStats,

    // Enhanced functions
    signup, // Now with email verification
    forgotPassword, // Now sends actual emails
    login, // Now with JWT token generation

    // New authentication functions
    refreshToken,
    logout,
    verifyToken,

    // New email-related functions
    verifyEmail,
    resendEmailVerification,
    cleanupExpiredTokens,
    sendBlogNotification
};