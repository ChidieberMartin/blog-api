const express = require("express");
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