const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const dotenv = require('dotenv');
const Joi = require('joi');

// Load environment variables
dotenv.config();

// Validate environment variables
const schema = Joi.object({
  MONGO_URI: Joi.string().required(),
  NODE_ENV: Joi.string().valid('development', 'production').required(),
}).validate(process.env);

if (schema.error) {
  throw new Error(`Environment variables validation error: ${schema.error.message}`);
}

// Create an Express app
const app = express();
app.use(express.json());
app.use(morgan('combined')); // HTTP request logging
app.use(helmet()); // Set security headers

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Allow all origins, adjust as needed
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  next();
});

// MongoDB connection setup
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  poolSize: 10, // Connection pooling
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});

// Rate limiting for login and registration
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit to 5 requests per window
  message: 'Too many login attempts, please try again later.',
});
app.use('/auth/login', loginLimiter);

// Middleware for error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong',
    error: err.message,
  });
});

// User schema example with bcrypt password hashing
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  email: String,
});

userSchema.index({ username: 1 }); // Index for performance on frequent queries

// Hash password before saving user
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10); // 10 salt rounds
  }
  next();
});

const User = mongoose.model('User', userSchema);

// Example route: Register a user
app.post('/auth/register', async (req, res) => {
  const { username, password, email } = req.body;
  try {
    const newUser = new User({ username, password, email });
    await newUser.save();
    res.status(201).json({ success: true, message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error registering user', error: err.message });
  }
});

// Example route: Login a user
app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    res.json({ success: true, message: 'Login successful' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error logging in', error: err.message });
  }
});

// Graceful shutdown
const server = app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});

process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Process terminated');
  });
});
