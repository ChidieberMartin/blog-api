const sanitizeInput = (req, res, next) => {
    const sanitize = (obj) => {
        if (typeof obj === 'string') {
            return obj.trim();
        }

        if (Array.isArray(obj)) {
            return obj.map(sanitize);
        }
        if (typeof obj === 'object' && obj !== null) {
            const sanitized = {};
            for (const [key, value] of Object.entries(obj)) {
                sanitized[key] = sanitize(value);
            }
            return sanitized;
        }

        return obj;
    }

    req.body = sanitize(req.body);
    next();
}


const validatePagenation = (req, res, next) => {
    const { page, limit } = req.query;

    if (page && (isNaN(page) || pasrseInt(page) < 1)) {
        return res.status(400).json({ success: false, message: "Page must be a number" });
    }

    if (limit && (isNaN(limit)) || parseInt(limit) < 1 || parseInt(limit) > 100) {
        return res.status(400).json({ success: false, message: "Limit must be a number between 1 and 100" });
    }



    next();
}

const validateEmail = (req, res, next) => {
    const { email } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    next();
}


const validatePassword = (req, res, next) => {
    const { password, newPassword } = req.body;
    const passwordToCheck = newPassword || password;

    if (passwordToCheck) {
        if (typeof passwordToCheck !== 'string' || passwordToCheck.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters long" });
        }
    }

    const hasUpperCase = /[A-Z]/.test(passwordToCheck);
    const hasLowerCase = /[a-z]/.test(passwordToCheck);
    const hasNumber = /\d/.test(passwordToCheck);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(passwordToCheck);

    // Uncomment for stricter password requirements
    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
        return res.status(400).json({
            success: false,
            message: "Password must contain at least one uppercase letter, one lowercase letter, and one number"
        });
    }

    next();
}


const errorHandler = (err, req, res, next) => {
    console.error("Error:", err);
    if (err.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: err.message });
    }
    if (err.name === 'MongoError' && err.code === 11000) {
        return res.status(409).json({ success: false, message: "Duplicate key error" });
    }

    if (err.name === 'jwtError') {
        return res.status(401).json({ success: false, message: "Invalid token" });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: "Token has expired" });
    }





    return res.status(500).json({ success: false, message: "Internal server error" });
}


const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}


const setSecurityHeaders = (req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    next();
}

module.exports = {
    sanitizeInput,
    validatePagenation,
    validateEmail,
    validatePassword,
    errorHandler,
    asyncHandler,
    setSecurityHeaders
};