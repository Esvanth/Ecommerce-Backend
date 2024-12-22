const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productsInCart: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productQty: { type: Number, required: true, min: 1 }
  }]
}, { timestamps: true });

cartSchema.methods.calculateTotal = async function () {
  const products = await mongoose.model('Product').find({
    _id: { $in: this.productsInCart.map(item => item.productId) }
  });
  
  return this.productsInCart.reduce((total, item) => {
    const product = products.find(p => p._id.equals(item.productId));
    return total + (product.price * item.productQty);
  }, 0);
};

module.exports = mongoose.model('Cart', cartSchema);
