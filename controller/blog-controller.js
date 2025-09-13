const mongoose = require("mongoose");
const {
    Blogs,
    Comments
} = require("../model/blog.js");
const UserModel = require("../model/user.js");

// Get all Blogss with social data
const getAllBlogs = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const userId = req.user?.id; // Get current user ID from auth middleware

        const skip = (page - 1) * limit;

        let searchQuery = {};
        if (search) {
            searchQuery = {
                $or: [{
                        title: {
                            $regex: search,
                            $options: 'i'
                        }
                    },
                    {
                        description: {
                            $regex: search,
                            $options: 'i'
                        }
                    }
                ]
            };
        }

        const Blogss = await Blogs.find(searchQuery)
            .populate('user', 'name email avatar')
            .populate({
                path: 'comments',
                populate: {
                    path: 'user',
                    select: 'name email avatar'
                },
                options: {
                    sort: {
                        createdAt: -1
                    },
                    limit: 3
                } // Get latest 3Commentss
            })
            .populate('likes.user', 'name email')
            .populate('shares.user', 'name email')
            .sort({
                createdAt: -1
            })
            .skip(skip)
            .limit(limit);

        // Add user interaction status for each Blogs
        const BlogssWithUserStatus = Blogss.map(Blogs => {
            const BlogsObj = Blogs.toObject();
            if (userId) {
                BlogsObj.isLikedByUser = Blogs.likes.some(like => like.user._id.toString() === userId);
                BlogsObj.isSharedByUser = Blogs.shares.some(share => share.user._id.toString() === userId);
            }
            return BlogsObj;
        });

        const totalBlogss = await Blogs.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalBlogss / limit);

        return res.status(200).json({
            success: true,
            Blogss: BlogssWithUserStatus,
            pagination: {
                currentPage: page,
                totalPages,
                totalBlogss,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
}


const getAllBlogsSimple = async (req, res, next) => {
    try {
        const search = req.query.search || '';

        // Build search query
        let searchQuery = {};
        if (search) {
            searchQuery = {
                $or: [{
                        title: {
                            $regex: search,
                            $options: 'i'
                        }
                    },
                    {
                        description: {
                            $regex: search,
                            $options: 'i'
                        }
                    }
                ]
            };
        }

        const Blogss = await Blogss.find(searchQuery)
            .populate('user', 'name email')
            .sort({
                createdAt: -1
            });


        if (!Blogss || Blogss.length === 0) {
            return res.status(200).json({
                success: true,
                Blogss: [],
                message: "No Blogss found"
            });
        }

        return res.status(200).json({
            success: true,
            Blogss
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
}

// Like/Unlike a Blogs
const toggleLike = async (req, res, next) => {
    try {
        const BlogsId = req.params.id;
        const userId = req.user.id; // From auth middleware

        const Blogs = await Blogs.findById(BlogsId);
        if (!Blogs) {
            return res.status(404).json({
                success: false,
                message: "Blogs not found"
            });
        }

        const existingLikeIndex = Blogs.likes.findIndex(like =>
            like.user.toString() === userId
        );

        let isLiked;
        if (existingLikeIndex > -1) {
            // Unlike - remove like
            Blogs.likes.splice(existingLikeIndex, 1);
            Blogs.likesCount = Math.max(0, Blogs.likesCount - 1);
            isLiked = false;
        } else {
            // Like - add like
            Blogs.likes.push({
                user: userId
            });
            Blogs.likesCount += 1;
            isLiked = true;
        }

        await Blogs.save();

        return res.status(200).json({
            success: true,
            isLiked,
            likesCount: Blogs.likesCount,
            message: isLiked ? "Blogs liked" : "Blogs unliked"
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
}

// AddComments to a Blogs
const addComment = async (req, res, next) => {
    try {
        const BlogsId = req.params.id;
        const {
            text
        } = req.body;
        const userId = req.user.id;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "Comment text is required"
            });
        }

        const Blogs = await Blogs.findById(BlogsId);
        if (!Blogs) {
            return res.status(404).json({
                success: false,
                message: "Blogs not found"
            });
        }

        constComments = newComments({
            text: text.trim(),
            user: userId,
            Blogs: BlogsId
        });

        awaitComments.save();

        // AddComments reference to Blogs and update counter
        Blogs.comments.push(comment._id);
        Blogs.commentsCount += 1;
        await Blogs.save();

        // PopulateComments with user data before returning
        awaitComments.populate('user', 'name email avatar');

        return res.status(201).json({
            success: true,
            Commentssssssssssss,
            message: "Comment added successfully"
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
}

// Reply to aComments
const replyToComment = async (req, res, next) => {
    try {
        constCommentsId = req.params.commentId;
        const {
            text
        } = req.body;
        const userId = req.user.id;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "Reply text is required"
            });
        }

        constComments = awaitComments.findById(commentId);
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: "Comment not found"
            });
        }

        const reply = {
            text: text.trim(),
            user: userId,
            createdAt: new Date()
        };

        Commentssssssss.replies.push(reply);
        awaitComments.save();

        // Populate the reply user data
        awaitComments.populate('replies.user', 'name email avatar');

        return res.status(201).json({
            success: true,
            reply: Comments.replies[comment.replies.length - 1],
            message: "Reply added successfully"
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
}

// Share a Blogs
const shareBlog = async (req, res, next) => {
    try {
        const BlogsId = req.params.id;
        const {
            shareMessage
        } = req.body;
        const userId = req.user.id;

        const Blogs = await Blogs.findById(BlogsId);
        if (!Blogs) {
            return res.status(404).json({
                success: false,
                message: "Blogs not found"
            });
        }

        // Check if user already shared this Blogs
        const existingShare = Blogs.shares.find(share =>
            share.user.toString() === userId
        );

        if (existingShare) {
            return res.status(400).json({
                success: false,
                message: "You have already shared this Blogs"
            });
        }

        const share = {
            user: userId,
            shareMessage: shareMessage?.trim() || '',
            sharedAt: new Date()
        };

        Blogs.shares.push(share);
        Blogs.sharesCount += 1;
        await Blogs.save();

        return res.status(201).json({
            success: true,
            sharesCount: Blogs.sharesCount,
            message: "Blogs shared successfully"
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
}

// Get allCommentss for a Blogs
const getBlogComments = async (req, res, next) => {
    try {
        const BlogsId = req.params.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const Comments = awaitComments.find({
                Blogs: BlogsId
            })
            .populate('user', 'name email avatar')
            .populate('replies.user', 'name email avatar')
            .sort({
                createdAt: -1
            })
            .skip(skip)
            .limit(limit);

        const totalComments = awaitComments.countDocuments({
            Blogs: BlogsId
        });
        const totalPages = Math.ceil(totalComments / limit);

        return res.status(200).json({
            success: true,
            Comments,
            pagination: {
                currentPage: page,
                totalPages,
                totalComments,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
}

// DeleteComments (only byComments author or Blogs owner)
const deleteComment = async (req, res, next) => {
    try {
        constCommentsId = req.params.commentId;
        const userId = req.user.id;

        constComments = awaitComments.findById(commentId).populate('Blogs');
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: "Comment not found"
            });
        }

        // Check if user isComments author or Blogs owner
        const isCommentAuthor = Comments.user.toString() === userId;
        const isBlogsOwner = Comments.Blogs.user.toString() === userId;

        if (!isCommentAuthor && !isBlogsOwner) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized to delete thisComments"
            });
        }

        // RemoveComments from Blogs and update counter
        await Blogs.findByIdAndUpdate(comment.Blogs._id, {
            $pull: {
                Commentss: CommentsId
            },
            $inc: {
                CommentssCount: -1
            }
        });

        awaitComments.findByIdAndDelete(commentId);

        return res.status(200).json({
            success: true,
            message: "Comment deleted successfully"
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
}

// Get Blogs likes
const getBlogLikes = async (req, res, next) => {
    try {
        const BlogsId = req.params.id;

        const Blogs = await Blogs.findById(BlogsId)
            .populate('likes.user', 'name email avatar')
            .select('likes likesCount');

        if (!Blogs) {
            return res.status(404).json({
                success: false,
                message: "Blogs not found"
            });
        }

        return res.status(200).json({
            success: true,
            likes: Blogs.likes,
            likesCount: Blogs.likesCount
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
}

// Your existing functions (updated to use new schema)
const addBlog = async (req, res, next) => {
    const {
        title,
        description,
        image,
        user
    } = req.body;

    if (!title || !description || !image || !user) {
        return res.status(400).json({
            success: false,
            message: "Incomplete credentials"
        });
    }

    let existingUser;
    try {
        existingUser = await UserModel.findById(user);
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Server error"
        });
    }

    if (!existingUser) {
        return res.status(400).json({
            success: false,
            message: "Unable to find user"
        });
    }

    const Blogs = new Blogs({
        title,
        description,
        image,
        user,
    });

    await Blogs.save();
    existingUser.Blogss.push(Blogs);
    await existingUser.save();

    return res.status(201).json({
        success: true,
        Blogs
    });
}

const updateBlog = async (req, res, next) => {
    const {
        title,
        description
    } = req.body;
    const BlogsId = req.params.id;
    let Blogs;

    try {
        Blogs = await Blogs.findByIdAndUpdate(BlogsId, {
            title,
            description
        }, {
            new: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Server error"
        });
    }

    if (!Blogs) {
        return res.status(404).json({
            message: "Blogs not found"
        });
    }

    return res.status(200).json({
        Blogs
    });
}

const getById = async (req, res, next) => {
    const id = req.params.id;
    const userId = req.user?.id;
    let Blogs;

    try {
        Blogs = await Blogs.findById(id)
            .populate('user', 'name email avatar')
            .populate({
                path: 'comments',
                populate: {
                    path: 'user',
                    select: 'name email avatar'
                },
                options: {
                    sort: {
                        createdAt: -1
                    },
                    limit: 5
                }
            })
            .populate('likes.user', 'name email')
            .populate('shares.user', 'name email');
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Server error"
        });
    }

    if (!Blogs) {
        return res.status(404).json({
            message: "No Blogs Found"
        });
    }

    // Add user interaction status
    const BlogsObj = Blogs.toObject();
    if (userId) {
        BlogsObj.isLikedByUser = Blogs.likes.some(like => like.user._id.toString() === userId);
        BlogsObj.isSharedByUser = Blogs.shares.some(share => share.user._id.toString() === userId);
    }

    return res.status(200).json({
        Blogs: BlogsObj
    });
}

const deleteBlog = async (req, res, next) => {
    const id = req.params.id;
    let Blogs;

    try {
        Blogs = await Blogs.findByIdAndDelete(id).populate('user');
        if (Blogs) {
            // Delete allCommentss for this Blogs
            awaitComments.deleteMany({
                Blogs: id
            });

            // Remove Blogs from user's Blogss array
            if (Blogs.user) {
                await Blogs.user.Blogss.pull(Blogs);
                await Blogs.user.save();
            }
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Server error"
        });
    }

    if (!Blogs) {
        return res.status(404).json({
            message: "Blogs not found"
        });
    }

    return res.status(200).json({
        message: 'Successfully deleted'
    });
}

const getByUserId = async (req, res, next) => {
    const userId = req.params.id;
    let userBlogss;

    try {
        userBlogss = await UserModel.findById(userId).populate({
            path: 'Blogss',
            populate: {
                path: 'user',
                select: 'name email avatar'
            }
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Server error"
        });
    }

    if (!userBlogss) {
        return res.status(404).json({
            success: false,
            message: 'No user found'
        });
    }

    return res.status(200).json({
        Blogss: userBlogss.Blogs
    });
}

module.exports = {
    getAllBlogs,
    getAllBlogsSimple,
    addBlog,
    updateBlog,
    deleteBlog,
    getById,
    getByUserId,
    toggleLike,
    addComment,
    replyToComment,
    shareBlog,
    getBlogComments,
    deleteComment,
    getBlogLikes
};