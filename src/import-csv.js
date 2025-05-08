const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const csv = require('csv-parser');
const Customer = require('./models/Customer');
const Product = require('./models/Product');
const Order = require('./models/Order');
const config = require('./config');

// CSV file paths
const customersFilePath = path.resolve(process.argv[2] || '../mongo_assignment_sead_data/customers.csv');
const productsFilePath = path.resolve(process.argv[3] || '../mongo_assignment_sead_data/products.csv');
const ordersFilePath = path.resolve(process.argv[4] || '../mongo_assignment_sead_data/orders.csv');

console.log('Using file paths:');
console.log('- Customers:', customersFilePath);
console.log('- Products:', productsFilePath);
console.log('- Orders:', ordersFilePath);

// Check if files exist
if (!fs.existsSync(customersFilePath)) {
  console.error(`Error: Customers file not found at ${customersFilePath}`);
  process.exit(1);
}

if (!fs.existsSync(productsFilePath)) {
  console.error(`Error: Products file not found at ${productsFilePath}`);
  process.exit(1);
}

if (!fs.existsSync(ordersFilePath)) {
  console.error(`Error: Orders file not found at ${ordersFilePath}`);
  process.exit(1);
}

// Helper function to parse CSV files
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .on('error', error => reject(error))
      .pipe(csv())
      .on('data', data => results.push(data))
      .on('end', () => resolve(results))
      .on('error', error => reject(error));
  });
};

// Import function
const importData = async () => {
  // Connect to MongoDB
  console.log(`Connecting to MongoDB: ${config.MONGODB_URI}`);
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('MongoDB Connected');
    
    // Clear existing data
    console.log('Clearing existing collections...');
    await Customer.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    console.log('Collections cleared');

    // Import customers
    const customersData = await parseCSV(customersFilePath);
    const mappedCustomers = customersData.map(customer => ({
      _id: customer._id,
      name: customer.name,
      email: customer.email,
      address: {
        street: 'Unknown', // These fields are not in the CSV
        city: customer.location,
        state: 'Unknown',
        zip: 'Unknown',
        country: 'Unknown'
      },
      phone: 'Unknown',
      registrationDate: new Date()
    }));
    
    await Customer.insertMany(mappedCustomers);
    console.log(`${mappedCustomers.length} customers imported`);

    // Import products
    const productsData = await parseCSV(productsFilePath);
    const mappedProducts = productsData.map(product => ({
      _id: product._id,
      name: product.name,
      description: `Description for ${product.name}`, // Not in CSV
      price: parseFloat(product.price),
      category: product.category,
      stock: parseInt(product.stock),
      sku: `SKU-${product._id.substring(0, 8)}`, // Generate a SKU from ID
      imageUrl: `https://example.com/${product.name.toLowerCase().replace(/ /g, '_')}.jpg`
    }));
    
    await Product.insertMany(mappedProducts);
    console.log(`${mappedProducts.length} products imported`);

    // Import orders
    const ordersData = await parseCSV(ordersFilePath);
    
    // Map orders with proper ObjectId references
    const mappedOrders = ordersData.map(order => {
      // Parse the products array from the string format
      let productsArray;
      try {
        // Replace single quotes with double quotes for valid JSON
        const productsString = order.products.replace(/'/g, '"');
        productsArray = JSON.parse(productsString);
      } catch (error) {
        console.error(`Error parsing products for order ${order._id}:`, error);
        productsArray = [];
      }

      // Map order items
      const items = productsArray.map(item => ({
        product: item.productId,
        quantity: parseInt(item.quantity),
        price: parseFloat(item.priceAtPurchase)
      }));

      return {
        _id: order._id,
        customer: order.customerId,
        items: items,
        total: parseFloat(order.totalAmount),
        status: order.status === 'canceled' ? 'cancelled' : order.status, // Adjust status to match our schema
        paymentMethod: 'credit_card', // Default as not in CSV
        shippingAddress: {
          street: 'Unknown',
          city: 'Unknown',
          state: 'Unknown',
          zip: 'Unknown',
          country: 'Unknown'
        },
        orderDate: new Date(order.orderDate)
      };
    });

    await Order.insertMany(mappedOrders);
    console.log(`${mappedOrders.length} orders imported`);

    console.log('All data imported successfully!');
    process.exit(0);
  } catch (error) {
    console.error(`Error importing data: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
};

// Run the import
importData(); 