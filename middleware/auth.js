const userService = require('../service/user.service');
const Blogs = require('../model/blog.js');
const { dcrypt } = require('../utils/crypto');

/**
 * Middleware to verify JWT token and authenticate user
 */
const verifyToken = async (req, res, next) => {
    try {
        // Get token from Authorization header or cookies
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ')
            ? authHeader.split(' ')[1]
            : req.cookies?.token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Access token is required"
            });
        }

        // Decrypt and verify token
        const decoded = dcrypt(token);

        if (!decoded || !decoded.id) {
            return res.status(401).json({
                success: false,
                message: "Invalid token format"
            });
        }

        // Find user and attach to request
        const user = await userService.findUserById(decoded.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid token - user not found"
            });
        }

        // Check if email is verified (optional - uncomment if needed)
        if (!user.isEmailVerified) {
            return res.status(401).json({
                success: false,
                message: "Please verify your email before accessing this resource"
            });
        }

        // Attach user to request object
        req.user = user;
        next();

    } catch (error) {
        console.log('Token verification error:', error);

        if (error.name === 'JsonWebTokenError' ||
            error.name === 'TokenExpiredError' ||
            error.message.includes('jwt')) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Server error during authentication"
        });
    }
};

/**
 * Middleware to check if user owns the blog they're trying to modify
 */
const checkBlogOwnership = async (req, res, next) => {
    try {
        const blogId = req.params.id;
        const userId = req.user._id.toString();

        if (!blogId) {
            return res.status(400).json({
                success: false,
                message: "Blog ID is required"
            });
        }

        // Find the blog
        const blog = await Blogs.findById(blogId);

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Blog not found"
            });
        }

        // Check if user owns the blog
        if (blog.user.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You can only modify your own blogs"
            });
        }

        // Attach blog to request for use in controller
        req.blog = blog;
        next();

    } catch (error) {
        console.log('Blog ownership check error:', error);
        return res.status(500).json({
            success: false,
            message: "Server error during authorization"
        });
    }
};

/**
 * Middleware to check if user can access another user's data
 */
const checkUserAccess = (req, res, next) => {
    try {
        const targetUserId = req.params.id;
        const currentUserId = req.user._id.toString();

        // Users can only access their own data unless they're admin
        if (targetUserId !== currentUserId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied. You can only access your own account"
            });
        }

        next();

    } catch (error) {
        console.log('User access check error:', error);
        return res.status(500).json({
            success: false,
            message: "Server error during authorization"
        });
    }
};

/**
 * Middleware to check if user is admin
 */
const checkAdmin = (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin privileges required"
            });
        }

        next();

    } catch (error) {
        console.log('Admin check error:', error);
        return res.status(500).json({
            success: false,
            message: "Server error during authorization"
        });
    }
};

/**
 * Middleware to validate request data
 */
const validateBlogData = (req, res, next) => {
    const { title, description, image, user } = req.body;

    // For POST requests (creating blogs)
    if (req.method === 'POST') {
        if (!title || !description || !image || !user) {
            return res.status(400).json({
                success: false,
                message: "Title, description, image, and user are required"
            });
        }
    }

    // For PUT requests (updating blogs) - at least one field required
    if (req.method === 'PUT') {
        if (!title && !description && !image) {
            return res.status(400).json({
                success: false,
                message: "At least one field (title, description, or image) is required for update"
            });
        }
    }

    next();
};

/**
 * Middleware to validate user data
 */
const validateUserData = (req, res, next) => {
    const { name, email, password } = req.body;

    // For signup
    if (req.route.path === '/signup') {
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and password are required"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters long"
            });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address"
            });
        }
    }

    // For login
    if (req.route.path === '/login') {
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }
    }

    next();
};

/**
 * Middleware to validate MongoDB ObjectId
 */
const validateObjectId = (req, res, next) => {
    const id = req.params.id;

    if (!id) {
        return res.status(400).json({
            success: false,
            message: "ID parameter is required"
        });
    }

    // Check if it's a valid MongoDB ObjectId
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid ID format"
        });
    }

    next();
};

/**
 * Middleware for rate limiting (basic implementation)
 * You might want to use express-rate-limit package for production
 */
const rateLimitMap = new Map();

const rateLimit = (maxRequests = 100, windowMs = 60 * 60 * 1000) => {
    return (req, res, next) => {
        const clientId = req.ip || req.connection.remoteAddress;
        const now = Date.now();

        if (!rateLimitMap.has(clientId)) {
            rateLimitMap.set(clientId, { count: 1, resetTime: now + windowMs });
            return next();
        }

        const clientData = rateLimitMap.get(clientId);

        if (now > clientData.resetTime) {
            // Reset the counter
            rateLimitMap.set(clientId, { count: 1, resetTime: now + windowMs });
            return next();
        }

        if (clientData.count >= maxRequests) {
            return res.status(429).json({
                success: false,
                message: "Too many requests. Please try again later."
            });
        }

        clientData.count++;
        next();
    };
};

/**
 * Optional middleware: Check if user's email is verified
 */
const requireEmailVerification = (req, res, next) => {
    if (!req.user.isEmailVerified) {
        return res.status(401).json({
            success: false,
            message: "Please verify your email before accessing this resource",
            requiresVerification: true
        });
    }
    next();
};

/**
 * Middleware to log requests (useful for debugging)
 */
const requestLogger = (req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
    next();
};

module.exports = {
    verifyToken,
    checkBlogOwnership,
    checkUserAccess,
    checkAdmin,
    validateBlogData,
    validateUserData,
    validateObjectId,
    rateLimit,
    requireEmailVerification,
    requestLogger
};