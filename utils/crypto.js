const jwt = require("jsonwebtoken")
const crypto = require("crypto")

exports.encrypt = (data) => {
    const token = jwt.sign(data, process.env.JWT_SECRET, { expiresIn: "6h" });
    return token;
}

exports.dcrypt = (token) => {
    const data = jwt.verify(token, process.env.JWT_SECRET);
    return data;
}

exports.remember = (data, willExpire = true, res) => {
    const expiresIn = willExpire ? { expiresIn: "30d" } : null;
    const token = jwt.sign(data, process.env.JWT_SECRET, expiresIn);


    // Set the token as a cookie
    const cookieOptions = {
        httpOnly: true, // Helps prevent XSS attacks
        secure: process.env.NODE_ENV === 'production', // Only set cookies over HTTPS in production
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days expiration (in ms)
        sameSite: 'Strict', // Adjust based on your needs
    };

    res.cookie('token', token, cookieOptions);
    return token;

}


exports.generateRandomToken = async () => {
    return crypto.randomBytes(32).toString("hex");
}