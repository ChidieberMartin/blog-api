const userService = require('../service/user.service');
const {Blogs,Comments } = require('../model/blog.js');
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
 * Middleware to check if user owns theBlogs they're trying to modify
 */
const checkBlogOwnership = async (req, res, next) => {
    try {
        constBlogsId = req.params.id;
        const userId = req.user._id.toString();

        if (!blogId) {
            return res.status(400).json({
                success: false,
                message: "Blog ID is required"
            });
        }

        // Find theBlogs
        constBlogs = awaitBlogs.findById(blogId);

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Blog not found"
            });
        }

        // Check if user owns theBlogs
        if (blog.user.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You can only modify your ownBlogs"
            });
        }

        // AttachBlogs to request for use in controller
        req.blog =Blogs;
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

    // For POST requests (creatingBlogs)
    if (req.method === 'POST') {
        if (!title || !description || !image || !user) {
            return res.status(400).json({
                success: false,
                message: "Title, description, image, and user are required"
            });
        }
    }

    // For PUT requests (updatingBlogs) - at least one field required
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


// Additional middleware functions for your auth.js file

// ValidateComments data
const validateCommentData = (req, res, next) => {
    const { text } = req.body;
    
    // Check ifComments text exists
    if (!text) {
        return res.status(400).json({
            success: false,
            message: "Comment text is required"
        });
    }
    
    // CheckComments length
    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Comment cannot be empty"
        });
    }
    
    if (trimmedText.length > 1000) {
        return res.status(400).json({
            success: false,
            message: "Comment cannot exceed 1000 characters"
        });
    }
    
    // Sanitize the text (remove any potentially harmful content)
    req.body.text = trimmedText;
    next();
};

// CheckComments ownership (for deletingComments)
const checkCommentOwnership = async (req, res, next) => {
    try {
        constCommentsId = req.params.commentId;
        const userId = req.user.id;
        
        // Find theComments and populate theBlogs
        constComments = awaitComments.findById(commentId).populate('blog');
        
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: "Comment not found"
            });
        }
        
        // Check if user isComments author ORBlogs owner
        const isCommentAuthor =Comments.user.toString() === userId;
        const isBlogOwner =Comments.blog.user.toString() === userId;
        
        if (!isCommentAuthor && !isBlogOwner) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized: You can only delete your ownComments orComments on yourBlogs"
            });
        }
        
        // AttachComments to request for use in controller
        req.comment =Comments;
        next();
        
    } catch (error) {
        console.error("Error in checkCommentOwnership middleware:", error);
        return res.status(500).json({
            success: false,
            message: "Server error during authorization check"
        });
    }
};

// Validate share data (optional message)
const validateShareData = (req, res, next) => {
    const { shareMessage } = req.body;
    
    // Share message is optional, but if provided, validate it
    if (shareMessage) {
        const trimmedMessage = shareMessage.trim();
        
        if (trimmedMessage.length > 500) {
            return res.status(400).json({
                success: false,
                message: "Share message cannot exceed 500 characters"
            });
        }
        
        req.body.shareMessage = trimmedMessage;
    }
    
    next();
};

// Rate limiting specifically for social interactions
const socialRateLimit = (maxRequests, windowMs, action) => {
    const requests = new Map();
    
    return (req, res, next) => {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }
        
        const key = `${userId}-${action}`;
        const now = Date.now();
        const windowStart = now - windowMs;
        
        // Clean old requests
        if (requests.has(key)) {
            const userRequests = requests.get(key).filter(timestamp => timestamp > windowStart);
            requests.set(key, userRequests);
        } else {
            requests.set(key, []);
        }
        
        const userRequests = requests.get(key);
        
        if (userRequests.length >= maxRequests) {
            return res.status(429).json({
                success: false,
                message: `Too many ${action} requests. Please try again later.`,
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }
        
        // Add current request
        userRequests.push(now);
        requests.set(key, userRequests);
        
        next();
    };
};

// Content moderation middleware (basic profanity filter)
const moderateContent = (req, res, next) => {
    const { text, shareMessage } = req.body;
    const contentToCheck = text || shareMessage;
    
    if (contentToCheck) {
        // Basic profanity filter (you can enhance this with more sophisticated libraries)
        const profanityWords = ['spam', 'fake', 'scam']; // Add more words as needed
        const lowerContent = contentToCheck.toLowerCase();
        
        const hasProfanity = profanityWords.some(word => lowerContent.includes(word));
        
        if (hasProfanity) {
            return res.status(400).json({
                success: false,
                message: "Content contains inappropriate language"
            });
        }
    }
    
    next();
};

// Check if user can interact withBlogs (not blocked, etc.)
const checkUserInteractionPermissions = async (req, res, next) => {
    try {
        constBlogsId = req.params.id;
        const userId = req.user.id;
        
        constBlogs = awaitBlogs.findById(blogId).populate('user', 'blockedUsers');
        
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Blog not found"
            });
        }
        
        // Check if user is blocked byBlogs owner (if you implement blocking feature)
        if (blog.user.blockedUsers &&Blogs.user.blockedUsers.includes(userId)) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to interact with this content"
            });
        }
        
        req.blog =Blogs;
        next();
        
    } catch (error) {
        console.error("Error in checkUserInteractionPermissions middleware:", error);
        return res.status(500).json({
            success: false,
            message: "Server error during permission check"
        });
    }
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
    requestLogger,
    validateCommentData,
    checkCommentOwnership,
    validateShareData,
    socialRateLimit,
    moderateContent,
    checkUserInteractionPermissions
};