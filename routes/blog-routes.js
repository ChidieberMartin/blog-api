const express = require("express");
const {
  addBlog,
  deleteBlog,
  getAllBlogs,
  getById,
  getByUserId,
  updateBlog,
  getAllBlogsSimple,
  // New social features
  toggleLike,
  addComment,
  replyToComment,
  shareBlog,
  getBlogComments,
  deleteComment,
  getBlogLikes
} = require("../controller/blog-controller");

// Import middleware
const {
  verifyToken,
  checkBlogOwnership,
  validateBlogData,
  validateObjectId,
  rateLimit,
  requestLogger,
  requireEmailVerification,
  validateCommentData, // New middleware for comment validation
  checkCommentOwnership // New middleware for comment ownership
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

// ✅ Public social interaction routes (read-only)
// Get blog likes (public)
blogRouter.get("/:id/likes", validateObjectId, getBlogLikes);

// Get blog comments with pagination (public)
blogRouter.get("/:id/comments", validateObjectId, getBlogComments);

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

// ✅ Protected social interaction routes (authentication required)

// Like/Unlike blog
blogRouter.post("/:id/like", 
    validateObjectId,
    rateLimit(100, 60 * 1000), // Rate limit: 100 likes per minute
    verifyToken,
    requireEmailVerification, // Optional: require email verification to interact
    toggleLike
);

// Add comment to blog
blogRouter.post("/:id/comment", 
    validateObjectId,
    rateLimit(50, 60 * 1000), // Rate limit: 50 comments per minute
    verifyToken,
    requireEmailVerification, // Optional: require email verification to comment
    validateCommentData, // Validate comment content
    addComment
);

// Reply to a comment
blogRouter.post("/comment/:commentId/reply", 
    validateObjectId,
    rateLimit(50, 60 * 1000), // Rate limit: 50 replies per minute
    verifyToken,
    requireEmailVerification,
    validateCommentData, // Validate reply content
    replyToComment
);

// Share a blog
blogRouter.post("/:id/share", 
    validateObjectId,
    rateLimit(30, 60 * 1000), // Rate limit: 30 shares per minute
    verifyToken,
    requireEmailVerification,
    shareBlog
);

// Delete comment (only comment author or blog owner can delete)
blogRouter.delete("/comment/:commentId", 
    validateObjectId,
    verifyToken,
    checkCommentOwnership, // Check if user owns comment or blog
    deleteComment
);

module.exports = blogRouter;