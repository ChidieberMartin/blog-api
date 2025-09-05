const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const connectdb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected...');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1); // stop the app if DB fails
  }
};

module.exports = connectdb;
