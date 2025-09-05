const mongoose = require('mongoose');

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
    }
}, { timestamps: true });

const Blogs = mongoose.model("Blog", BlogSchema)

module.exports = Blogs

// {
//     "title"
//     "description"
//     "image"
//     "username"
// }

