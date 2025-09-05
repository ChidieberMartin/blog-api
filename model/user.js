const mongoose = require('mongoose');
const crypto = require('crypto');
const {
    encrypt,
    decrypt
} = require('../utils/encrypt'); // Fixed: typo "enrypt" -> "bcrypt"

const UsersSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true // Automatically convert to lowercase
    },
    password: {
        type: String,
        required: true,
        minlength: 8
    },
    emailVerificationToken: {
        type: String,
        default: undefined
    },
    emailVerificationExpiry: {
        type: Date,
        default: undefined
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    resetPasswordToken: { // Fixed: "restPasswordToken" -> "resetPasswordToken" 
        type: String
    },
    resetPasswordExpires: { // Fixed: "restPasswordExpires" -> "resetPasswordExpires"
        type: Date
    },
    blogs: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Blog', // Fixed: Should reference 'Blog' model, not 'Users'
        required: false // Fixed: blogs are optional when user is created
    }]
}, {
    timestamps: true
});

// Pre-save middleware to hash password
UsersSchema.pre('save', async function (next) {
    try {
        // Only hash the password if it has been modified (or is new)
        if (!this.isModified('password')) {
            return next();
        }

        const hashPassword = await encrypt(this.password);

        if (!hashPassword) {
            const error = new Error('Password encryption failed');
            return next(error);
        }

        this.password = hashPassword;
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
UsersSchema.methods.matchPassword = async function (enteredPassword) {
    try {
        return await decrypt(enteredPassword, this.password);
    } catch (error) {
        console.log('Password comparison error:', error);
        return false;
    }
};

// Generate and hash password reset token
UsersSchema.methods.getResetPasswordToken = function () { // Fixed: method name typo
    try {
        // Generate token
        const resetToken = crypto.randomBytes(20).toString("hex");

        // Hash token and set to resetPasswordToken field
        this.resetPasswordToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");

        // Set expire time (15 minutes)
        this.resetPasswordExpires = Date.now() + 15 * 60 * 1000;

        return resetToken; // Return unhashed token to send via email
    } catch (error) {
        console.log('Reset token generation error:', error);
        return null;
    }
};

// Static method to find user by reset token
UsersSchema.statics.findByResetToken = function (token) {
    const hashedToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    return this.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: {
            $gt: Date.now()
        }
    });
};

// Virtual for user's full profile (excluding password)
UsersSchema.methods.toJSON = function () {
    const user = this.toObject();
    delete user.password;
    delete user.resetPasswordToken;
    delete user.resetPasswordExpires;
    return user;
};

const UserModel = mongoose.model('User', UsersSchema);

module.exports = UserModel;

// {
//     "name":"kate",
//     "email":"kate@gmail.com",
//     "password":"kate12345"
//     "user":"kate"
// }