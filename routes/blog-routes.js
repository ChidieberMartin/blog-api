const express = require("express");
const {
  addBlog,
  deleteBlog,
  getAllBlogs,
  getById,
  getByUserId,
  updateBlog,
  getAllBlogsSimple
} = require("../controller/blog-controller");

// Import middleware
const {
  verifyToken,
  checkBlogOwnership,
  validateBlogData,
  validateObjectId,
  rateLimit,
  requestLogger,
  requireEmailVerification
} = require("../middleware/auth");

const blogRouter = express.Router();

// ✅ Apply request logging to all routes (optional)
blogRouter.use(requestLogger);

// ✅ Public blog routes (no authentication required)
// Get all blogs - supports pagination and filtering
blogRouter.get("/", getAllBlogs);
blogRouter.get("/simple-blog", getAllBlogsSimple);

// Get specific blog by ID
blogRouter.get("/:id", validateObjectId, getById);

// Get all blogs by a specific user
blogRouter.get("/user/:id", validateObjectId, getByUserId);

// ✅ Protected blog routes (authentication required)

// Create new blog (requires authentication and email verification)
blogRouter.post("/create", 
    rateLimit(20, 60 * 60 * 1000), // Rate limit: 20 blog posts per hour
    verifyToken, 
    requireEmailVerification, // Optional: require email verification to post
    validateBlogData, 
    addBlog
);

// Update blog by ID (requires authentication and ownership)
blogRouter.put("/:id", 
    validateObjectId,
    verifyToken, 
    checkBlogOwnership, // Ensures user owns the blog
    validateBlogData, 
    updateBlog
);

// Delete blog by ID (requires authentication and ownership)
blogRouter.delete("/:id", 
    validateObjectId,
    verifyToken, 
    checkBlogOwnership, // Ensures user owns the blog
    deleteBlog
);

module.exports = blogRouter;