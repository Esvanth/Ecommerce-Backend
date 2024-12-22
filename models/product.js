const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  img: { type: String, required: true },
  category: { type: String, required: true },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  productId: { type: String, unique: true, required: true },
  inStockValue: { type: Number, default: 0 },
  soldStockValue: { type: Number, default: 0 },
  visibility: { type: String, enum: ['on', 'off'], default: 'on' }
}, { timestamps: true });

// Virtual field for total stock value
productSchema.virtual('totalStockValue').get(function () {
  return this.inStockValue + this.soldStockValue;
});

// Method to sell products and update stock
productSchema.methods.sellProduct = function (quantity) {
  if (this.inStockValue < quantity) {
    throw new Error('Insufficient stock');
  }
  this.inStockValue -= quantity;
  this.soldStockValue += quantity;
  return this.save();
};

// Index for optimized search
productSchema.index({ name: 1, category: 1 });

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
