const express = require("express");
const dotenv = require('dotenv')
dotenv.config();
const {
  getAllUsers,
  signup,
  login,
  findById,
  updateUser,
  changePassword,
  deleteUser,
  logout,
  verifyToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendEmailVerification,
  refreshToken,
  getUserStats,
  cleanupExpiredTokens,
  sendBlogNotification,
} = require("../controller/user-controller");

// Import middleware
const {
  verifyToken: authMiddleware,
  checkUserAccess,
  checkAdmin,
  validateUserData,
  validateObjectId,
  rateLimit,
  requestLogger
} = require("../middleware/auth");


const router = express.Router();

// Add this to your user controller or create a separate test controller

/**
 * Test email sending endpoint - REMOVE THIS IN PRODUCTION
 */
router.post('/test-email', async (req, res) => {
  try {
    const {
      to
    } = req.body;
    const testEmail = to || process.env.EMAIL_USER; // Send to yourself if no recipient provided

    console.log('Testing email to:', testEmail);


    const result = await emailService.sendEmail({
      to: testEmail,
      subject: 'Test Email - ' + new Date().toISOString(),
      text: 'This is a test email sent at ' + new Date().toISOString() + '. Your email service is working!',
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #28a745;">🎉 Email Service Test Successful!</h2>
                    <p>This test email was sent at: <strong>${new Date().toISOString()}</strong></p>
                    <p>If you received this email, your email service is configured correctly!</p>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>Configuration Used:</h3>
                        <ul>
                            <li>✅ Gmail SMTP</li>
                            <li>✅ Port 465 (SSL)</li>
                            <li>✅ Authentication working</li>
                        </ul>
                    </div>
                    <p style="color: #666; font-size: 12px;">
                        Remember to remove the test endpoint in production!
                    </p>
                </div>
            `
    });

    console.log('Test email result:', result);

    return res.status(200).json({
      success: true,
      message: 'Test email processed',
      emailSent: result.success,
      result
    });
  } catch (error) {
    console.error('Test email error:', error);
    return res.status(500).json({
      success: false,
      message: 'Test email failed',
      error: error.message
    });
  }
});



// ✅ Apply request logging to all routes (optional)
router.use(requestLogger);

// ✅ Public routes (no authentication required)
router.post("/signup", rateLimit(5, 15 * 60 * 1000), validateUserData, signup); // Rate limit: 5 signups per 15 minutes
router.post("/login", rateLimit(10, 15 * 60 * 1000), validateUserData, login); // Rate limit: 10 login attempts per 15 minutes
router.post("/forgot-password", rateLimit(3, 60 * 60 * 1000), forgotPassword); // Rate limit: 3 requests per hour
router.post("/reset-password/:token", validateUserData, resetPassword);
router.get("/verify-email/:token", verifyEmail);
router.post("/resend-verification", rateLimit(3, 60 * 60 * 1000), resendEmailVerification); // Rate limit: 3 requests per hour

// ✅ Semi-protected routes (token verification only)
router.post("/logout", authMiddleware, logout);
router.get("/verify-token", verifyToken); // This is actually an endpoint, not middleware
router.post("/refresh-token", refreshToken);

// ✅ Protected routes (authentication required)
router.get("/", authMiddleware, checkAdmin, getAllUsers); // Only admins can get all users
router.get("/:id", validateObjectId, authMiddleware, checkUserAccess, findById);
router.put("/:id", validateObjectId, authMiddleware, checkUserAccess, updateUser);
router.put("/:id/change-password", validateObjectId, authMiddleware, checkUserAccess, changePassword);
router.delete("/:id", validateObjectId, authMiddleware, checkUserAccess, deleteUser);

// ✅ Admin-only routes
router.get("/admin/stats", authMiddleware, checkAdmin, getUserStats);
router.delete("/admin/cleanup-tokens", authMiddleware, checkAdmin, cleanupExpiredTokens);

// ✅ Notification routes (admin or system use)
router.post("/notifications/blog", authMiddleware, checkAdmin, sendBlogNotification);

module.exports = router;