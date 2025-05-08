const Customer = require('./models/Customer');
const Product = require('./models/Product');
const Order = require('./models/Order');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const { v4: uuidv4 } = require('uuid');
const Redis = require('ioredis');
const { ApolloError } = require('apollo-server-express');
const config = require('./config');

// Initialize Redis client
const redis = new Redis(config.REDIS_URI);

// Set TTL for cache (in seconds)
const CACHE_TTL = 60 * 60; // 1 hour

// Helper function to get cached data
const getCache = async (key) => {
  try {
    const cachedData = await redis.get(key);
    if (cachedData) {
      console.log(`Cache hit for key: ${key}`);
      return JSON.parse(cachedData);
    }
    console.log(`Cache miss for key: ${key}`);
    return null;
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
};

// Helper function to set cache data
const setCache = async (key, data, ttl = CACHE_TTL) => {
  try {
    await redis.set(key, JSON.stringify(data), 'EX', ttl);
    console.log(`Cache set for key: ${key}`);
  } catch (error) {
    console.error('Redis set error:', error);
  }
};

const resolvers = {
  Query: {
    // Simple query to get all customers
    getCustomers: async () => {
      return await Customer.find({}).select('name email address phone registrationDate');
    },
    
    // Query 1: Get customer spending details
    getCustomerSpending: async (_, { customerId }) => {
      // Try to get from cache first
      const cacheKey = `customer_spending:${customerId}`;
      const cachedData = await getCache(cacheKey);
      
      if (cachedData) {
        return cachedData;
      }
      
      // First, check if customer exists
      const customer = await Customer.findById(customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }
      
      // Using MongoDB aggregation for customer spending analytics
      const pipeline = [
        // Stage 1: Match orders for this customer
        {
          $match: {
            customer: customerId
          }
        },
        // Stage 2: Group all orders to calculate metrics
        {
          $group: {
            _id: "$customer",
            totalSpent: { $sum: "$total" },
            orderCount: { $count: {} },
            orders: { $push: "$$ROOT" }
          }
        },
        // Stage 3: Lookup customer details
        {
          $lookup: {
            from: "customers",
            localField: "_id",
            foreignField: "_id",
            as: "customerDetails"
          }
        },
        // Stage 4: Project final results format
        {
          $project: {
            _id: 0,
            customer: { $arrayElemAt: ["$customerDetails", 0] },
            totalSpent: 1,
            orderCount: 1,
            averageOrderValue: { $divide: ["$totalSpent", "$orderCount"] },
            orders: 1
          }
        }
      ];

      const results = await Order.aggregate(pipeline);
      
      // If no orders found, return basic info
      if (results.length === 0) {
        const basicInfo = {
          customer,
          totalSpent: 0,
          orderCount: 0,
          averageOrderValue: 0,
          recentOrders: [],
          purchasesByCategory: []
        };
        
        // Cache the result
        await setCache(cacheKey, basicInfo);
        
        return basicInfo;
      }
      
      const result = results[0];
      
      // Get recent orders (last 5)
      const recentOrders = await Order.find({ customer: customerId })
        .sort({ orderDate: -1 })
        .limit(5)
        .populate({
          path: 'items.product',
          model: 'Product',
          select: 'name price category' // Using projection to select only needed fields
        });
      
      // Get purchases by category
      const categoryPipeline = [
        { $match: { customer: customerId } },
        { $unwind: "$items" },
        { 
          $lookup: {
            from: "products",
            localField: "items.product",
            foreignField: "_id",
            as: "productDetail"
          }
        },
        { $unwind: "$productDetail" },
        {
          $group: {
            _id: "$productDetail.category",
            amount: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
          }
        },
        { $sort: { amount: -1 } }
      ];
      
      const categoryResults = await Order.aggregate(categoryPipeline);
      
      // Calculate percentage for each category
      const purchasesByCategory = categoryResults.map(cat => ({
        category: cat._id,
        amount: cat.amount,
        percentage: (cat.amount / result.totalSpent) * 100
      }));
      
      const response = {
        customer: result.customer,
        totalSpent: result.totalSpent,
        orderCount: result.orderCount,
        averageOrderValue: result.averageOrderValue,
        recentOrders,
        purchasesByCategory
      };
      
      // Cache the result
      await setCache(cacheKey, response);
      
      return response;
    },
    
    // Query 2: Get top selling products
    getTopSellingProducts: async (_, { limit }) => {
      // Try to get from cache first
      const cacheKey = `top_products:${limit}`;
      const cachedData = await getCache(cacheKey);
      
      if (cachedData) {
        return cachedData;
      }
      
      // Using MongoDB aggregation with projections
      const pipeline = [
        // Stage 1: Unwind items in orders
        { $unwind: "$items" },
        
        // Stage 2: Group by product to calculate metrics
        {
          $group: {
            _id: "$items.product",
            totalSold: { $sum: "$items.quantity" },
            revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
            orderCount: { $count: {} }
          }
        },
        
        // Stage 3: Lookup product details
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "productDetails"
          }
        },
        
        // Stage 4: Project final results
        {
          $project: {
            _id: 0,
            product: { $arrayElemAt: ["$productDetails", 0] },
            totalSold: 1,
            revenue: 1,
            orderCount: 1
          }
        },
        
        // Stage 5: Sort by totalSold descending
        { $sort: { totalSold: -1 } },
        
        // Stage 6: Limit results
        { $limit: limit }
      ];
      
      const topProducts = await Order.aggregate(pipeline);
      
      // Cache the result
      await setCache(cacheKey, topProducts);
      
      return topProducts;
    },
    
    // Query 3: Get sales analytics
    getSalesAnalytics: async (_, { startDate, endDate }) => {
      // Try to get from cache first
      const cacheKey = `sales_analytics:${startDate}_${endDate}`;
      const cachedData = await getCache(cacheKey);
      
      if (cachedData) {
        return cachedData;
      }
      
      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Invalid date format');
      }
      
      // Base match filter for date range
      const dateRangeMatch = {
        orderDate: {
          $gte: start,
          $lte: end
        }
      };
      
      // 1. Overall sales metrics
      const overallPipeline = [
        { $match: dateRangeMatch },
        {
          $group: {
            _id: null,
            totalSales: { $sum: "$total" },
            orderCount: { $count: {} }
          }
        },
        {
          $project: {
            _id: 0,
            totalSales: 1,
            orderCount: 1,
            averageOrderValue: { $divide: ["$totalSales", "$orderCount"] }
          }
        }
      ];
      
      // 2. Sales by day
      const salesByDayPipeline = [
        { $match: dateRangeMatch },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } },
            sales: { $sum: "$total" },
            orderCount: { $count: {} }
          }
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            _id: 0,
            date: "$_id",
            sales: 1,
            orderCount: 1
          }
        }
      ];
      
      // 3. Sales by category
      const salesByCategoryPipeline = [
        { $match: dateRangeMatch },
        { $unwind: "$items" },
        {
          $lookup: {
            from: "products",
            localField: "items.product",
            foreignField: "_id",
            as: "productDetails"
          }
        },
        { $unwind: "$productDetails" },
        {
          $group: {
            _id: "$productDetails.category",
            sales: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
          }
        },
        { $sort: { sales: -1 } }
      ];
      
      // 4. Top products
      const topProductsPipeline = [
        { $match: dateRangeMatch },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            totalSold: { $sum: "$items.quantity" },
            revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
            orderCount: { $count: {} }
          }
        },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "productDetails"
          }
        },
        {
          $project: {
            _id: 0,
            product: { $arrayElemAt: ["$productDetails", 0] },
            totalSold: 1,
            revenue: 1,
            orderCount: 1
          }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 5 }
      ];
      
      // Execute all queries in parallel
      const [overallResults, salesByDay, categoryResults, topProducts] = await Promise.all([
        Order.aggregate(overallPipeline),
        Order.aggregate(salesByDayPipeline),
        Order.aggregate(salesByCategoryPipeline),
        Order.aggregate(topProductsPipeline)
      ]);
      
      // Handle empty results
      const overall = overallResults.length > 0 ? overallResults[0] : { totalSales: 0, orderCount: 0, averageOrderValue: 0 };
      
      // Calculate percentages for category sales
      const totalSales = overall.totalSales;
      const salesByCategory = categoryResults.map(cat => ({
        category: cat._id,
        sales: cat.sales,
        percentage: totalSales > 0 ? (cat.sales / totalSales) * 100 : 0
      }));
      
      const response = {
        totalSales: overall.totalSales,
        orderCount: overall.orderCount,
        averageOrderValue: overall.averageOrderValue,
        salesByDay,
        salesByCategory,
        topProducts
      };
      
      // Cache the result
      await setCache(cacheKey, response);
      
      return response;
    },

    // Query 4: Get customer orders with pagination
    getCustomerOrders: async (_, { customerId, page = 1, limit = 10 }) => {
      // Validate customer exists
      const customer = await Customer.findById(customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      // Calculate pagination values
      const skip = (page - 1) * limit;
      
      // Get total count for pagination metadata
      const totalOrders = await Order.countDocuments({ customer: customerId });
      const totalPages = Math.ceil(totalOrders / limit);
      
      // Get paginated orders
      const orders = await Order.find({ customer: customerId })
        .sort({ orderDate: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'items.product',
          model: 'Product',
          select: 'name price category description'
        });
      
      return {
        orders,
        totalOrders,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      };
    }
  },

  Mutation: {
    // Mutation 1: Place a new order
    placeOrder: async (_, { input }) => {
      const { customerId, items, paymentMethod, shippingAddress } = input;
      
      // Validate customer exists
      const customer = await Customer.findById(customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }
      
      // Validate products and calculate order total
      let orderItems = [];
      let orderTotal = 0;
      
      for (const item of items) {
        const product = await Product.findById(item.productId);
        if (!product) {
          throw new Error(`Product with ID ${item.productId} not found`);
        }
        
        // Check if enough stock is available
        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for product: ${product.name}`);
        }
        
        // Add to order items
        orderItems.push({
          product: product._id,
          quantity: item.quantity,
          price: product.price
        });
        
        // Add to order total
        orderTotal += product.price * item.quantity;
        
        // Update product stock
        await Product.findByIdAndUpdate(product._id, {
          $inc: { stock: -item.quantity }
        });
      }
      
      // Create new order
      const newOrder = new Order({
        _id: uuidv4(),
        customer: customerId,
        items: orderItems,
        total: orderTotal,
        status: 'pending',
        paymentMethod,
        shippingAddress: shippingAddress || customer.address,
        orderDate: new Date()
      });
      
      // Save order to database
      await newOrder.save();
      
      // Invalidate relevant cache keys
      await redis.del(`customer_spending:${customerId}`);
      await redis.keys('top_products:*').then(keys => {
        if (keys.length > 0) {
          return redis.del(keys);
        }
      });
      await redis.keys('sales_analytics:*').then(keys => {
        if (keys.length > 0) {
          return redis.del(keys);
        }
      });
      
      // Populate the product details for the response
      const populatedOrder = await Order.findById(newOrder._id).populate({
        path: 'customer items.product',
        select: 'name email address phone price category stock items'
      });
      
      return populatedOrder;
    }
  }
};

module.exports = resolvers; 