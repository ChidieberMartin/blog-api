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

// ✅ Global middleware setup (order matters!)
app.use(setSecurityHeaders); // Security headers first
// app.use(cors({
//     origin: process.env.CLIENT_URL || 'http://localhost:3000',
//     credentials: true // Important for cookies
// }));
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:3000',
    'https://blog-app-psi-nine-25.vercel.app/',  // Your actual Vercel URL
  ],
  credentials: true
}));

app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies
app.use(sanitizeInput); // Sanitize all input data

// ✅ API routes
app.use('/api/users', userRouter);
app.use('/api/blogs', blogRouter);

// ✅ Health check route
app.get('/health', (req, res) => {
    res.status(200).json({ 
        success: true, 
        message: 'Server is running',
        timestamp: new Date().toISOString()
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
    console.log(`Server is running on port http://localhost:${port}`);
});