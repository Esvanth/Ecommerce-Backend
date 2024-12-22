const express = require('express');
const router = express.Router();
const Coupon = require('../models/couponmodel');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const User = require('../models/user'); // Adjust the path to your actual User model file
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

// Function to send email to a single user
async function sendEmail(subject, message, email) {
  try {
    await transporter.sendMail({
      from: 'pecommerce8@gmail.com',
      to: email,
      subject: subject,
      text: message
    });
    console.log(`Email sent to ${email}`);
  } catch (emailError) {
    console.error(`Error sending email to ${email}:`, emailError);
  }
}

// Function to send email to all users
async function sendEmailToAllUsers(subject, message) {
  try {
    const users = await User.find({}, 'email'); // Fetch user emails
    const emailPromises = users.map(user => sendEmail(subject, message, user.email)); // Send email to all users concurrently
    await Promise.all(emailPromises);
    console.log('Emails sent to all users');
  } catch (error) {
    console.error('Error fetching users or sending emails:', error);
  }
}

// Get all coupons route
router.get('/get-coupon', async (req, res) => {
  try {
    const coupons = await Coupon.find();
    res.status(200).json({
      success: true,
      coupons
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching coupons',
      error: error.message
    });
  }
});

// Save coupon route
router.post('/save-coupon', async (req, res) => {
  const { code, discountPercentage } = req.body;
  
  // Input validation
  if (!code || !discountPercentage) {
    return res.status(400).json({
      success: false,
      message: 'Coupon code and discount percentage are required.'
    });
  }

  try {
    const coupon = new Coupon({ code, discountPercentage });
    await coupon.save();

    // Send email to all users about new coupon
    const subject = 'New Coupon Available!';
    const message = `A new coupon ${code} is now available with ${discountPercentage}% discount. Use it in your next purchase!`;
    await sendEmailToAllUsers(subject, message);

    res.status(201).json({
      success: true,
      message: 'Coupon saved successfully',
      coupon
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error saving coupon',
      error: error.message
    });
  }
});

// Verify coupon route
router.post('/verify-coupon', async (req, res) => {
  const { code } = req.body;

  // Input validation
  if (!code) {
    return res.status(400).json({
      success: false,
      message: 'Coupon code is required.'
    });
  }

  try {
    const coupon = await Coupon.findOne({ code });
    
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Invalid coupon code'
      });
    }

    res.status(200).json({
      success: true,
      discountPercentage: coupon.discountPercentage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verifying coupon',
      error: error.message
    });
  }
});

// Delete coupon route
router.delete('/delete-coupon', async (req, res) => {
  const { code, discountPercentage } = req.body;
  
  // Input validation
  if (!code || !discountPercentage) {
    return res.status(400).json({
      success: false,
      message: 'Coupon code and discount percentage are required.'
    });
  }

  try {
    const deletedCoupon = await Coupon.findOneAndDelete({ code, discountPercentage });

    if (!deletedCoupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    // Send email to all users about expired coupon
    const subject = 'Coupon Expired';
    const message = `The coupon ${code} with ${discountPercentage}% discount has expired.`;
    await sendEmailToAllUsers(subject, message);

    res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting coupon',
      error: error.message
    });
  }
});

module.exports = router;
