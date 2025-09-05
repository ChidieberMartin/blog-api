const mongoose = require("mongoose");
const Blogs = require("../model/blog.js");
const UserModel = require("../model/user.js");

// const getAllBlogs = async (req, res, next) => {
//     let blogs;
//     try {
//         blogs = await Blogs.find();
//         console.log("blog", blogs);
//     } catch (error) {
//         console.log(error);
//         return res.status(500).json({
//             message: "Server error"
//         });
//     }
//     if (!blogs || blogs.length === 0) {
//         return res.status(404).json({
//             message: "No Blog Found"
//         });
//     }
//     return res.status(200).json({
//         blogs
//     });
// }


// Improved getAllBlogs with pagination and search
const getAllBlogs = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        
        // Calculate skip value for pagination
        const skip = (page - 1) * limit;
        
        // Build search query
        let searchQuery = {};
        if (search) {
            searchQuery = {
                $or: [
                    { title: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ]
            };
        }
        
        // Get blogs with pagination and populate user data
        const blogs = await Blogs.find(searchQuery)
            .populate('user', 'name email') // Populate user info
            .sort({ createdAt: -1 }) // Sort by newest first
            .skip(skip)
            .limit(limit);
            
        // Get total count for pagination
        const totalBlogs = await Blogs.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalBlogs / limit);
        
        console.log("blogs", blogs);
        
        return res.status(200).json({
            success: true,
            blogs,
            pagination: {
                currentPage: page,
                totalPages,
                totalBlogs,
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

// Alternative: Simple version that matches your current structure
const getAllBlogsSimple = async (req, res, next) => {
    try {
        const search = req.query.search || '';
        
        // Build search query
        let searchQuery = {};
        if (search) {
            searchQuery = {
                $or: [
                    { title: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ]
            };
        }
        
        const blogs = await Blogs.find(searchQuery)
            .populate('user', 'name email')
            .sort({ createdAt: -1 });
            
        console.log("blogs", blogs);
        
        if (!blogs || blogs.length === 0) {
            return res.status(200).json({
                success: true,
                blogs: [],
                message: "No blogs found"
            });
        }
        
        return res.status(200).json({
            success: true,
            blogs
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

const addBlog = async (req, res, next) => {
    const {
        title,
        description,
        image,
        user
    } = req.body; // Fixed: "discription" -> "description"

    if (!title || !description || !image || !user) {
        return res.status(400).json({
            success: false,
            message: "Incomplete credentials"
        }); // Added return
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

    const blog = new Blogs({
        title,
        description,
        image,
        user,
    });

    console.log('blogss', blog);
    // Save blog
    await blog.save();

    // Push blog ref into user
    existingUser.blogs.push(blog);
    await existingUser.save();

    // let session;
    // try {
    //     session = await mongoose.startSession();
    //     session.startTransaction();
    //     await blog.save({ session });
    //     existingUser.blogs.push(blog); // Fixed: "exitingUser" -> "existingUser"
    //     console.log("existingUser", existingUser);
    //     console.log("blog", blog);  
    //     await existingUser.save({ session }); // Added session
    //     await session.commitTransaction();
    // } catch (error) {
    //     if (session) {
    //         await session.abortTransaction();
    //     }
    //     console.log(error);
    //     return res.status(500).json({ message: error.message });
    // } finally {
    //     if (session) {
    //         session.endSession();
    //     }
    // }

    return res.status(201).json({
        success:true,
        blog
    }); // Changed to 201 for created resource
}

const updateBlog = async (req, res, next) => { // Fixed: parameter order (req, res, not res, req)
    const {
        title,
        description
    } = req.body; // Fixed: "discription" -> "description"
    const blogId = req.params.id;
    let blog;

    try {
        blog = await Blogs.findByIdAndUpdate(blogId, {
            title,
            description // Fixed: "discription" -> "description"
        }, {
            new: true
        }); // Added { new: true } to return updated document
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Server error"
        });
    }

    if (!blog) {
        return res.status(404).json({
            message: "Blog not found"
        }); // Added return and better message
    }

    return res.status(200).json({
        blog
    });
}

const getById = async (req, res, next) => { // Fixed: "rea" -> "req"
    const id = req.params.id;
    let blog;

    try {
        blog = await Blogs.findById(id).populate("user", "name email"); 
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Server error"
        });
    }

    if (!blog) {
        return res.status(404).json({
            message: "No Blog Found"
        }); // Added return
    }

    return res.status(200).json({
        blog
    });
}

const deleteBlog = async (req, res, next) => {
    const id = req.params.id;
    let blog;

    try {
        blog = await Blogs.findByIdAndDelete(id).populate('user'); // Changed from findByIdAndRemove (deprecated)
        if (blog && blog.user) {
            await blog.user.blogs.pull(blog);
            await blog.user.save();
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Server error"
        });
    }

    if (!blog) {
        return res.status(404).json({
            message: "Blog not found"
        });
    }

    return res.status(200).json({
        message: 'Successfully deleted'
    }); // Fixed typo
}

const getByUserId = async (req, res, next) => {
    const userId = req.params.id;
    let userBlogs;

    try {
        userBlogs = await UserModel.findById(userId).populate('blogs');
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Server error"
        });
    }

    if (!userBlogs) {
        return res.status(404).json({
            success: false,
            message: 'No user found'
        });
    }

    return res.status(200).json({
        blogs: userBlogs.blogs
    }); // Return just the blogs array
}

module.exports = {
    getAllBlogs,
    getAllBlogsSimple,
    addBlog,
    updateBlog,
    deleteBlog,
    getById,
    getByUserId
}