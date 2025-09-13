const mongoose = require('mongoose');

//comment schema
const CommentSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true,
        trim: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true  
    },
    blog: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Blog',
        required: true  
    },
    repliees: [{
        text:{
            type: String,
            required: true,
            trim: true
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, { timestamps: true});

const BlogSchema = new mongoose.Schema({
     title: {
        type: String,
        required: true 
    },
    description: {
        type: String,
        required: true 
    },
    image: {
        type: String,
        required: true 
    },
    user: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
        required: true 
    },
    likes: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        } 
    }],
    comments:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment'
    }],
    shares:[{
        user:{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        sharedAt: {
            type: Date,
            default: Date.now
        },
        shareMessage: {
            type: String,
            trim: true
        }
    }],
    likeCount: {
        type: Number,
        default: 0
    },
    commentCount: {
        type: Number,
        default: 0
    },
    shareCount: {
        type: Number,
        default: 0
    }
   
}, { timestamps: true });

BlogSchema.index({user:1});
BlogSchema.index({createdAt:-1});
BlogSchema.index({likeCount:-1});
BlogSchema.index({blog:1,createdAt:-1});

// Check if models already exist before creating them
const Blogs = mongoose.models.Blog || mongoose.model("Blog", BlogSchema);
const Comments = mongoose.models.Comment || mongoose.model("Comment", CommentSchema);

module.exports = {Blogs, Comments};