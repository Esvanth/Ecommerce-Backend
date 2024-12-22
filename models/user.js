const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { 
    type: String, 
    unique: true, 
    required: true, 
    match: [/.+@.+\..+/, 'Please enter a valid email address'] 
  },
  password: { type: String, required: true },
  userId: { type: String, unique: true, required: true }, // Unique userId
  accountStatus: { 
    type: String, 
    enum: ['open', 'closed', 'suspended'], 
    default: 'open' 
  }, // Restrict accountStatus to specific values
  phone: { 
    type: String, 
    default: 'not available', 
    match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number'] 
  }, // Phone validation
}, { timestamps: true }); // Include timestamps

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Static method for finding users by email
UserSchema.statics.findByEmail = function (email) {
  return this.findOne({ email });
};

// Index for optimization
UserSchema.index({ email: 1, userId: 1 });

module.exports = mongoose.model('User', UserSchema);
