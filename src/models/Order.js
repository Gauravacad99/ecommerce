const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  product: {
    type: String,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  }
});

const OrderSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  customer: {
    type: String,
    ref: 'Customer',
    required: true,
    index: true
  },
  items: [OrderItemSchema],
  total: {
    type: Number,
    required: true,
    min: 0,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'canceled', 'completed'],
    default: 'pending',
    index: true
  },
  paymentMethod: {
    type: String,
    required: true
  },
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String
  },
  orderDate: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  _id: false
});

OrderSchema.index({ customer: 1, orderDate: -1 });
OrderSchema.index({ orderDate: 1, status: 1 });

module.exports = mongoose.model('Order', OrderSchema); 