const bcrypt = require('bcrypt');

const encrypt = async (plainText) => {
    try {
        const saltRounds = 10;
        const hashedText = await bcrypt.hash(plainText, saltRounds);
        return hashedText;
    } catch (error) {
        console.log('Encryption error:', error);
        return null;
    }
}

const decrypt = async (plainText, hashedText) => {
    try {
        const isMatch = await bcrypt.compare(plainText, hashedText);
        return isMatch;
    } catch (error) {
        console.log('Decryption error:', error);
        return false;
    }
}

module.exports = {
    encrypt,
    decrypt
}