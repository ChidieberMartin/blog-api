const UserModel = require('../model/user.js');
const mongoose = require('mongoose');
const crypto = require('crypto');
const emailService = require('../utils/sendEmail'); // Import your email service
const { generateRandomToken } = require('../utils/crypto'); // Import your crypto utilities

/**
 * Create a new user
 * @param {Object} userData - User data object
 * @returns {Promise<Object>} Created user object
 */
const createUser = async (userData) => {
    try {
        const user = new UserModel(userData);
        const result = await user.save();
        return result;
    } catch (error) {
        throw error;
    }
};

/**
 * Create a new user and send welcome email
 * @param {Object} userData - User data object
 * @param {Boolean} sendWelcomeEmail - Whether to send welcome email
 * @returns {Promise<Object>} Created user object with email status
 */
const createUserWithWelcomeEmail = async (userData, sendWelcomeEmail = true) => {
    try {
        const user = await createUser(userData);
        
        let emailResult = null;
        if (sendWelcomeEmail) {
            emailResult = await emailService.sendWelcomeEmail(user);
        }
        
        return {
            user,
            emailSent: emailResult?.success || false,
            emailError: emailResult?.error || null
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Register user with email verification
 * @param {Object} userData - User data object
 * @returns {Promise<Object>} Created user with verification token
 */
const registerUserWithVerification = async (userData) => {
    try {
        // Generate verification token using crypto utility
        const verificationToken = await generateRandomToken();

        console.log("token",verificationToken);
        const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        
        // Add verification fields to user data
        const userWithVerification = {
            ...userData,
            emailVerificationToken: verificationToken,
            emailVerificationExpiry: verificationTokenExpiry,
            isEmailVerified: false
        };
        
        const user = await createUser(userWithVerification);
        
        // Send verification email
        const emailResult = await emailService.sendEmailVerification(user, verificationToken);
        
        return {
            user,
            verificationToken,
            emailSent: emailResult.success,
            emailError: emailResult.error || null
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Find a single user by query
 * @param {Object} query - MongoDB query object
 * @param {String} selectFields - Fields to select/exclude
 * @param {String} populateFields - Fields to populate
 * @returns {Promise<Object|null>} User object or null
 */
const findOneUser = async (query = {}, selectFields = '', populateFields = '') => {
    try {
        let queryBuilder = UserModel.findOne(query);
        
        if (selectFields) {
            queryBuilder = queryBuilder.select(selectFields);
        }
        
        if (populateFields) {
            queryBuilder = queryBuilder.populate(populateFields);
        }
        
        const result = await queryBuilder.exec();
        return result;
    } catch (error) {
        throw error;
    }
};

/**
 * Find multiple users by query
 * @param {Object} query - MongoDB query object
 * @param {Object} options - Query options (limit, skip, sort, etc.)
 * @param {String} selectFields - Fields to select/exclude
 * @param {String} populateFields - Fields to populate
 * @returns {Promise<Array>} Array of user objects
 */
const findManyUsers = async (query = {}, options = {}, selectFields = '', populateFields = '') => {
    try {
        let queryBuilder = UserModel.find(query);
        
        if (selectFields) {
            queryBuilder = queryBuilder.select(selectFields);
        }
        
        if (populateFields) {
            queryBuilder = queryBuilder.populate(populateFields);
        }
        
        // Apply options
        if (options.sort) {
            queryBuilder = queryBuilder.sort(options.sort);
        }
        
        if (options.limit) {
            queryBuilder = queryBuilder.limit(options.limit);
        }
        
        if (options.skip) {
            queryBuilder = queryBuilder.skip(options.skip);
        }
        
        const result = await queryBuilder.exec();
        return result;
    } catch (error) {
        throw error;
    }
};

/**
 * Find user by ID
 * @param {String} id - User ID
 * @param {String} selectFields - Fields to select/exclude
 * @param {String} populateFields - Fields to populate
 * @returns {Promise<Object|null>} User object or null
 */
const findUserById = async (id, selectFields = '', populateFields = '') => {
    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new Error('Invalid user ID format');
        }
        
        let queryBuilder = UserModel.findById(id);
        
        if (selectFields) {
            queryBuilder = queryBuilder.select(selectFields);
        }
        
        if (populateFields) {
            queryBuilder = queryBuilder.populate(populateFields);
        }
        
        const result = await queryBuilder.exec();
        return result;
    } catch (error) {
        throw error;
    }
};

/**
 * Update user by ID
 * @param {String} id - User ID
 * @param {Object} updateData - Data to update
 * @param {Object} options - Update options
 * @returns {Promise<Object|null>} Updated user object or null
 */
const updateUserById = async (id, updateData, options = { new: true, runValidators: true }) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new Error('Invalid user ID format');
        }
        
        const result = await UserModel.findByIdAndUpdate(id, updateData, options);
        return result;
    } catch (error) {
        throw error;
    }
};

/**
 * Update user by query
 * @param {Object} query - Query to find user
 * @param {Object} updateData - Data to update
 * @param {Object} options - Update options
 * @returns {Promise<Object|null>} Updated user object or null
 */
const updateUser = async (query, updateData, options = { new: true, runValidators: true }) => {
    try {
        const result = await UserModel.findOneAndUpdate(query, updateData, options);
        return result;
    } catch (error) {
        throw error;
    }
};

/**
 * Delete user by ID
 * @param {String} id - User ID
 * @returns {Promise<Object|null>} Deleted user object or null
 */
const deleteUserById = async (id) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new Error('Invalid user ID format');
        }
        
        const result = await UserModel.findByIdAndDelete(id);
        return result;
    } catch (error) {
        throw error;
    }
};

/**
 * Delete user by query
 * @param {Object} query - Query to find user
 * @returns {Promise<Object|null>} Deleted user object or null
 */
const deleteUser = async (query) => {
    try {
        const result = await UserModel.findOneAndDelete(query);
        return result;
    } catch (error) {
        throw error;
    }
};

/**
 * Count users by query
 * @param {Object} query - MongoDB query object
 * @returns {Promise<Number>} Count of users
 */
const countUsers = async (query = {}) => {
    try {
        const count = await UserModel.countDocuments(query);
        return count;
    } catch (error) {
        throw error;
    }
};

/**
 * Check if user exists by query
 * @param {Object} query - MongoDB query object
 * @returns {Promise<Boolean>} True if user exists, false otherwise
 */
const userExists = async (query) => {
    try {
        const user = await UserModel.findOne(query).select('_id');
        return !!user;
    } catch (error) {
        throw error;
    }
};

/**
 * Get users with pagination
 * @param {Object} query - MongoDB query object
 * @param {Number} page - Page number (1-based)
 * @param {Number} limit - Number of users per page
 * @param {Object} sort - Sort object
 * @param {String} populateFields - Fields to populate
 * @returns {Promise<Object>} Paginated result with users, total, pages, etc.
 */
const getUsersWithPagination = async (query = {}, page = 1, limit = 10, sort = { createdAt: -1 }, populateFields = '') => {
    try {
        const skip = (page - 1) * limit;
        
        const [users, total] = await Promise.all([
            findManyUsers(query, { skip, limit, sort }, '', populateFields),
            countUsers(query)
        ]);
        
        const totalPages = Math.ceil(total / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;
        
        return {
            users,
            pagination: {
                current: page,
                total: totalPages,
                count: users.length,
                totalUsers: total,
                hasNextPage,
                hasPrevPage,
                nextPage: hasNextPage ? page + 1 : null,
                prevPage: hasPrevPage ? page - 1 : null
            }
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Find user by reset token
 * @param {String} token - Reset token
 * @returns {Promise<Object|null>} User object or null
 */
const findUserByResetToken = async (token) => {
    try {
        const user = await UserModel.findByResetToken(token);
        return user;
    } catch (error) {
        throw error;
    }
};

/**
 * Generate and save password reset token for user
 * @param {String} email - User email
 * @returns {Promise<Object>} Result with user and token info
 */
const generatePasswordResetToken = async (email) => {
    try {
        const user = await findOneUser({ email });
        if (!user) {
            throw new Error('User not found with this email');
        }

        // Generate reset token using crypto utility
        const resetToken = await generateRandomToken();
        const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Update user with reset token
        const updatedUser = await updateUserById(user._id, {
            passwordResetToken: resetToken,
            passwordResetExpiry: resetTokenExpiry
        });

        // Send password reset email
        const emailResult = await emailService.sendPasswordResetEmail(updatedUser, resetToken);

        return {
            success: true,
            user: updatedUser,
            token: resetToken,
            emailSent: emailResult.success,
            emailError: emailResult.error || null,
            message: 'Password reset email sent successfully'
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Verify email using verification token
 * @param {String} token - Verification token
 * @returns {Promise<Object>} Verification result
 */
const verifyEmail = async (token) => {
    try {
        const user = await findOneUser({
            emailVerificationToken: token,
            emailVerificationExpiry: { $gt: new Date() }
        });

        console.log("user",user);

        if (!user) {
            throw new Error('Invalid or expired verification token');
        }

        // Update user as verified
        const updatedUser = await updateUserById(user._id, {
            isEmailVerified: true,
            emailVerificationToken: undefined,
            emailVerificationExpiry: undefined
        });

        console.log("update",updatedUser)

        return {
            success: true,
            user: updatedUser,
            message: 'Email verified successfully'
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Resend email verification
 * @param {String} email - User email
 * @returns {Promise<Object>} Resend result
 */
const resendEmailVerification = async (email) => {
    try {
        const user = await findOneUser({ email });
        if (!user) {
            throw new Error('User not found with this email');
        }

        if (user.isEmailVerified) {
            throw new Error('Email is already verified');
        }

        // Generate new verification token using crypto utility
        const verificationToken = await generateRandomToken();
        console.log("token",verificationToken);
        const verificationTokenExpiry = new Date(Date.now() + 10 * 60 * 60 * 1000); // 1 hours

        // Update user with new token
        const updatedUser = await updateUserById(user._id, {
            emailVerificationToken: verificationToken,
            emailVerificationExpiry: verificationTokenExpiry
        });

        // Send verification email
        const emailResult = await emailService.sendEmailVerification(updatedUser, verificationToken);

        return {
            success: true,
            user: updatedUser,
            token: verificationToken,
            emailSent: emailResult.success,
            emailError: emailResult.error || null,
            message: 'Verification email sent successfully'
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Add blog to user's blogs array
 * @param {String} userId - User ID
 * @param {String} blogId - Blog ID
 * @returns {Promise<Object|null>} Updated user object or null
 */
const addBlogToUser = async (userId, blogId) => {
    try {
        const result = await UserModel.findByIdAndUpdate(
            userId,
            { $addToSet: { blogs: blogId } }, // $addToSet prevents duplicates
            { new: true }
        ).populate('blogs');
        return result;
    } catch (error) {
        throw error;
    }
};

/**
 * Remove blog from user's blogs array
 * @param {String} userId - User ID
 * @param {String} blogId - Blog ID
 * @returns {Promise<Object|null>} Updated user object or null
 */
const removeBlogFromUser = async (userId, blogId) => {
    try {
        const result = await UserModel.findByIdAndUpdate(
            userId,
            { $pull: { blogs: blogId } },
            { new: true }
        ).populate('blogs');
        return result;
    } catch (error) {
        throw error;
    }
};

/**
 * Search users by name or email
 * @param {String} searchTerm - Search term
 * @param {Object} options - Search options
 * @returns {Promise<Array>} Array of matching users
 */
const searchUsers = async (searchTerm, options = {}) => {
    try {
        const query = {
            $or: [
                { name: { $regex: searchTerm, $options: 'i' } },
                { email: { $regex: searchTerm, $options: 'i' } }
            ]
        };
        
        const users = await findManyUsers(query, options, '', 'blogs');
        return users;
    } catch (error) {
        throw error;
    }
};

/**
 * Get users who should receive blog notifications
 * @param {String} authorId - Author ID to exclude
 * @returns {Promise<Array>} Array of users to notify
 */
const getUsersForBlogNotification = async (authorId) => {
    try {
        const query = {
            _id: { $ne: authorId }, // Exclude the author
            isEmailVerified: true,
            // You can add more conditions here, like:
            // notificationPreferences: { $in: ['all', 'blogs'] },
            // isActive: true
        };
        
        const users = await findManyUsers(query, {}, 'name email');
        return users;
    } catch (error) {
        throw error;
    }
};

/**
 * Send blog notification to users
 * @param {Object} blog - Blog object
 * @param {Object} author - Author object
 * @param {Array} userIds - Array of user IDs to notify (optional)
 * @returns {Promise<Object>} Notification results
 */
const sendBlogNotificationToUsers = async (blog, author, userIds = null) => {
    try {
        let usersToNotify;
        
        if (userIds && userIds.length > 0) {
            // Notify specific users
            usersToNotify = await findManyUsers(
                { _id: { $in: userIds }, isEmailVerified: true },
                {},
                'name email'
            );
        } else {
            // Notify all eligible users
            usersToNotify = await getUsersForBlogNotification(author._id);
        }

        const emailPromises = usersToNotify.map(user => 
            emailService.sendNewBlogNotification(user, blog, author)
        );

        const emailResults = await Promise.allSettled(emailPromises);
        
        const successful = emailResults.filter(result => 
            result.status === 'fulfilled' && result.value.success
        ).length;
        
        const failed = emailResults.length - successful;

        return {
            success: true,
            totalUsers: usersToNotify.length,
            emailsSent: successful,
            emailsFailed: failed,
            results: emailResults
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Clean up expired tokens
 * @returns {Promise<Object>} Cleanup result
 */
const cleanupExpiredTokens = async () => {
    try {
        const now = new Date();
        
        const result = await UserModel.updateMany(
            {
                $or: [
                    { passwordResetExpiry: { $lt: now } },
                    { emailVerificationExpiry: { $lt: now } }
                ]
            },
            {
                $unset: {
                    passwordResetToken: 1,
                    passwordResetExpiry: 1,
                    emailVerificationToken: 1,
                    emailVerificationExpiry: 1
                }
            }
        );

        return {
            success: true,
            modifiedCount: result.modifiedCount,
            message: `Cleaned up ${result.modifiedCount} expired tokens`
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Authenticate user and return user data
 * @param {String} email - User email
 * @param {String} password - User password
 * @returns {Promise<Object>} Authentication result
 */
const authenticateUser = async (email, password) => {
    try {
        email = email.toLowerCase().trim();
        
        // Find user with password field
        const user = await findOneUser({ email }, '+password', 'blogs');
        
        if (!user) {
            throw new Error('Invalid email or password');
        }

        // Check if email is verified
        if (!user.isEmailVerified) {
            throw new Error('Please verify your email before logging in');
        }

        // Check password using the model method
        const isPasswordCorrect = await user.matchPassword(password);
        
        if (!isPasswordCorrect) {
            throw new Error('Invalid email or password');
        }

        // Return user without password
        const userWithoutPassword = user.toJSON();
        delete userWithoutPassword.password;

        return {
            success: true,
            user: userWithoutPassword,
            message: 'Authentication successful'
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Generate refresh token for user
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Result with refresh token
 */
const generateRefreshToken = async (userId) => {
    try {
        const refreshToken = await generateRandomToken();
        const refreshTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        // Update user with refresh token
        const updatedUser = await updateUserById(userId, {
            refreshToken,
            refreshTokenExpiry
        });

        return {
            success: true,
            refreshToken,
            user: updatedUser
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Validate refresh token and get user
 * @param {String} refreshToken - Refresh token
 * @returns {Promise<Object>} User object or null
 */
const validateRefreshToken = async (refreshToken) => {
    try {
        const user = await findOneUser({
            refreshToken,
            refreshTokenExpiry: { $gt: new Date() }
        }, '', 'blogs');

        return user;
    } catch (error) {
        throw error;
    }
};

/**
 * Invalidate user's refresh token (logout)
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Result
 */
const invalidateRefreshToken = async (userId) => {
    try {
        const updatedUser = await updateUserById(userId, {
            refreshToken: undefined,
            refreshTokenExpiry: undefined
        });

        return {
            success: true,
            message: 'Refresh token invalidated'
        };
    } catch (error) {
        throw error;
    }
};
const getUserStatistics = async () => {
    try {
        const [
            totalUsers,
            verifiedUsers,
            unverifiedUsers,
            usersWithResetTokens,
            recentUsers
        ] = await Promise.all([
            countUsers(),
            countUsers({ isEmailVerified: true }),
            countUsers({ isEmailVerified: false }),
            countUsers({ passwordResetToken: { $exists: true } }),
            countUsers({ 
                createdAt: { 
                    $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
                } 
            })
        ]);

        return {
            total: totalUsers,
            verified: verifiedUsers,
            unverified: unverifiedUsers,
            withResetTokens: usersWithResetTokens,
            recentSignups: recentUsers,
            verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers * 100).toFixed(2) : 0
        };
    } catch (error) {
        throw error;
    }
};

module.exports = {
    // Original functions
    createUser,
    findOneUser,
    findManyUsers,
    findUserById,
    updateUserById,
    updateUser,
    deleteUserById,
    deleteUser,
    countUsers,
    userExists,
    getUsersWithPagination,
    findUserByResetToken,
    addBlogToUser,
    removeBlogFromUser,
    searchUsers,
    
    // New email-related functions
    createUserWithWelcomeEmail,
    registerUserWithVerification,
    generatePasswordResetToken,
    verifyEmail,
    resendEmailVerification,
    getUsersForBlogNotification,
    sendBlogNotificationToUsers,
    cleanupExpiredTokens,
    getUserStatistics,
    
    // New authentication functions
    authenticateUser,
    generateRefreshToken,
    validateRefreshToken,
    invalidateRefreshToken
};