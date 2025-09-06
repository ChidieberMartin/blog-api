'use strict';
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
dotenv.config();
const connectdb = require('./db/mongoose'); 

// Import routes
const userRouter = require('./routes/user-routes');
const blogRouter = require('./routes/blog-routes');

// Import global middleware
const { errorHandler, setSecurityHeaders, sanitizeInput } = require('./middleware/validation');

const app = express();

// ✅ CORS configuration - CRITICAL FIXES
const allowedOrigins = [
    process.env.CLIENT_URL || 'http://localhost:3000',
    'https://blog-aj0kkisy0-martins-projects-bc0a9779.vercel.app',  // ❌ REMOVED trailing slash - this was causing the CORS issue!
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000'
];

// ✅ Handle preflight requests BEFORE other middleware
app.options('*', cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 200
}));

// ✅ Main CORS configuration
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log('❌ CORS blocked origin:', origin);
            console.log('✅ Allowed origins:', allowedOrigins);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 200
}));

// ✅ Global middleware setup (order matters!)
app.use(setSecurityHeaders); // Security headers after CORS

app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies
app.use(sanitizeInput); // Sanitize all input data

// ✅ Debug middleware (helpful for troubleshooting)
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - Origin: ${req.get('Origin') || 'No Origin'}`);
    next();
});

// ✅ API routes
app.use('/api/users', userRouter);
app.use('/api/blogs', blogRouter);

// ✅ Health check route
app.get('/health', (req, res) => {
    res.status(200).json({ 
        success: true, 
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        allowedOrigins: allowedOrigins
    });
});

// ✅ 404 handler for undefined routes
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
});

// ✅ Global error handler (must be last)
app.use(errorHandler);

const port = process.env.PORT || 4001;
app.listen(port, () => {
    // Connect to MongoDB
    connectdb();
    console.log(`🚀 Server is running on port ${port}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✅ Allowed CORS origins:`, allowedOrigins);
});