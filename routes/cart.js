const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Cart = require('../models/cartmodel');
const Order = require('../models/complaintmodel'); // Replace with correct path
const User = require('../models/user'); // Replace with correct path
const Product = require('../models/product'); // Replace with correct path
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true', // Convert string to boolean
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Add to Cart Route
router.post('/addtocart', async (req, res) => {
  try {
    const { userId, productId, quantity } = req.body;
    const productQty = parseInt(quantity);

    if (productQty <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be a positive number.' });
    }

    let cart = await Cart.findOne({ userId });

    if (cart) {
      // Check if product already exists in cart
      const existingProduct = cart.productsInCart.find(item => item.productId.toString() === productId);
      if (existingProduct) {
        existingProduct.productQty += productQty; // Update quantity if the product already exists
      } else {
        cart.productsInCart.push({ productId, productQty }); // Add new product if not present
      }
      await cart.save();
    } else {
      // Create a new cart if none exists
      cart = new Cart({ userId, productsInCart: [{ productId, quantity: productQty }] });
      await cart.save();
    }

    res.status(200).json({ success: true, message: 'Product added to cart successfully', cart });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error adding product to cart', error: error.message });
  }
});

// Get Cart by User ID Route
router.post('/get-cart', async (req, res) => {
  try {
    const { userId } = req.body;
    const cart = await Cart.findOne({ userId });

    if (!cart || cart.productsInCart.length === 0) {
      return res.status(404).json({ success: false, message: 'Cart is empty' });
    }

    res.status(200).json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching cart', error: error.message });
  }
});

// Update Quantity Route
router.put('/update-quantity', async (req, res) => {
  const { userId, productId, productQty } = req.body;

  if (!userId || !productId || typeof productQty !== 'number' || productQty <= 0) {
    return res.status(400).json({ message: 'Valid userId, productId, and productQty are required.' });
  }

  try {
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found.' });
    }

    const product = cart.productsInCart.find(item => item.productId.toString() === productId);

    if (!product) {
      return res.status(404).json({ message: 'Product not found in the cart.' });
    }

    product.productQty = productQty; // Update product quantity
    await cart.save();

    res.status(200).json({ message: 'Quantity updated successfully.' });
  } catch (error) {
    console.error('Error updating quantity:', error);
    res.status(500).json({ message: 'An error occurred while updating the quantity.' });
  }
});

// Delete Item from Cart Route
router.post('/delete-items', async (req, res) => {
  const { userId, productId } = req.body;

  if (!userId || !productId) {
    return res.status(400).json({ message: 'userId and productId are required.' });
  }

  try {
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found.' });
    }

    const product = cart.productsInCart.find(item => item.productId.toString() === productId);

    if (!product) {
      return res.status(404).json({ message: 'Product not found in the cart.' });
    }

    // Delete the product from the cart
    cart.productsInCart = cart.productsInCart.filter(item => item.productId.toString() !== productId);
    await cart.save();

    res.status(200).json({ message: 'Item deleted successfully.' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ message: 'An error occurred while deleting the item.' });
  }
});

// Place Order Route
router.post('/place-order', async (req, res) => {
  try {
    const { userId, date, time, address, price, productsOrdered } = req.body;

    const orderId = Math.floor(100000 + Math.random() * 900000).toString();
    const trackingId = Math.random().toString(36).substring(2, 14).toUpperCase();

    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const productIds = productsOrdered.map(item => item.productId);

    // Fetch product details for ordered products
    const productDetails = await Product.find({ productId: { $in: productIds } });

    // Check if all ordered products are in stock
    const stockCheck = productDetails.every(product => {
      const orderedQty = productsOrdered.find(item => item.productId === product.productId).quantity;
      return product.stock >= orderedQty;
    });

    if (!stockCheck) {
      return res.status(400).json({ success: false, message: 'One or more products are out of stock.' });
    }

    // Create a new order
    const order = new Order({
      userId,
      orderId,
      date,
      time,
      address,
      email: user.email,
      name: user.name,
      productIds,
      trackingId,
      price
    });

    await order.save();

    // Send order confirmation email
    const emailHtml = `
      <h1>Order Confirmation</h1>
      <p>Hello ${user.name},</p>
      <p>Your order with Order ID: ${orderId} has been placed successfully!</p>
      <p>Tracking ID: ${trackingId}</p>
      <p>Thank you for shopping with us.</p>
    `;
    await transporter.sendMail({ from: `pecommerce8@gmail.com`, to: user.email, subject: 'Order Confirmation', html: emailHtml });

    res.status(200).json({ success: true, message: 'Order placed successfully', orderId, trackingId });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error placing order', error: error.message });
  }
});

module.exports = router;
