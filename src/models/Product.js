const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    index: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0,
    index: true
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    index: true
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  imageUrl: {
    type: String
  }
}, {
  timestamps: true,
  _id: false // Disables auto-generated ObjectID
});

// Add text index for search functionality
ProductSchema.index({ name: 'text', description: 'text', category: 'text' });

module.exports = mongoose.model('Product', ProductSchema); 