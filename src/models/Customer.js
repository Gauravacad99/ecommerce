const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    index: true // Add index for name-based searches
  },
  email: {
    type: String,
    required: true,
    unique: true,
    index: true, // Add index for email lookups
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
  },
  address: {
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String
  },
  phone: {
    type: String
  },
  registrationDate: {
    type: Date,
    default: Date.now,
    index: true // Add index for date-based queries
  }
}, {
  timestamps: true,
  _id: false // Disables auto-generated ObjectID
});

// Add text index for search functionality
CustomerSchema.index({ name: 'text', email: 'text' });

// Add compound index for analytics
CustomerSchema.index({ registrationDate: 1, 'address.country': 1 });

module.exports = mongoose.model('Customer', CustomerSchema); 