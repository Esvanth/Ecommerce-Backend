const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  discountPercentage: {
    type: Number,
    required: true,
    min: 1,
    max: 100
  },
  expirationDate: {
    type: Date,
    required: true
  },
  usageLimit: {
    type: Number,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Static method to validate a coupon
couponSchema.statics.validateCoupon = function (code) {
  return this.findOne({
    code,
    isActive: true,
    expirationDate: { $gte: new Date() },
    usageLimit: { $gt: 0 }
  });
};

// Instance method to decrement usage limit
couponSchema.methods.decrementUsage = function () {
  if (this.usageLimit > 0) {
    this.usageLimit -= 1;
    return this.save();
  }
  throw new Error('Usage limit exceeded');
};

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
