const mongoose = require('mongoose');

const complaintsSchema = new mongoose.Schema({
  complaintNumber: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, match: [/^\S+@\S+\.\S+$/, 'Invalid email format.'] },
  message: { type: String, required: true },
  userType: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'In Progress', 'Resolved'], default: 'Pending' }
}, { timestamps: true });

complaintsSchema.pre('save', function (next) {
  if (!this.complaintNumber) {
    this.complaintNumber = `C${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }
  next();
});

complaintsSchema.statics.findByStatus = function (status) {
  return this.find({ status });
};

complaintsSchema.methods.updateStatus = function (newStatus) {
  this.status = newStatus;
  return this.save();
};

const Complaint = mongoose.model('Complaint', complaintsSchema);

module.exports = Complaint;
