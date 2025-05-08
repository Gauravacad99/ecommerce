const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type Query {
    getCustomers: [Customer]
    getCustomerSpending(customerId: ID!): CustomerSpending
    getTopSellingProducts(limit: Int!): [TopProduct]
    getSalesAnalytics(startDate: String!, endDate: String!): SalesAnalytics
    getCustomerOrders(customerId: ID!, page: Int, limit: Int): OrderPagination
  }

  type Mutation {
    placeOrder(input: PlaceOrderInput!): Order
  }

  input PlaceOrderInput {
    customerId: ID!
    items: [OrderItemInput!]!
    paymentMethod: String!
    shippingAddress: AddressInput
  }

  input OrderItemInput {
    productId: ID!
    quantity: Int!
  }

  input AddressInput {
    street: String
    city: String
    state: String
    zip: String
    country: String
  }

  type OrderPagination {
    orders: [Order!]!
    totalOrders: Int!
    totalPages: Int!
    currentPage: Int!
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
  }

  type Customer {
    _id: ID!
    name: String!
    email: String!
    address: Address
    phone: String
    registrationDate: String
  }

  type Address {
    street: String
    city: String
    state: String
    zip: String
    country: String
  }

  type Product {
    _id: ID!
    name: String!
    description: String!
    price: Float!
    category: String!
    stock: Int!
    sku: String!
    imageUrl: String
  }

  type OrderItem {
    product: Product!
    quantity: Int!
    price: Float!
  }

  type Order {
    _id: ID!
    customer: Customer!
    items: [OrderItem!]!
    total: Float!
    status: String!
    paymentMethod: String!
    shippingAddress: Address!
    orderDate: String!
  }

  type CustomerSpending {
    customer: Customer!
    totalSpent: Float!
    orderCount: Int!
    averageOrderValue: Float!
    recentOrders: [Order]
    purchasesByCategory: [CategorySpending]
  }

  type CategorySpending {
    category: String!
    amount: Float!
    percentage: Float!
  }

  type TopProduct {
    product: Product!
    totalSold: Int!
    revenue: Float!
    orderCount: Int!
  }

  type DailySales {
    date: String!
    sales: Float!
    orderCount: Int!
  }

  type CategorySales {
    category: String!
    sales: Float!
    percentage: Float!
  }

  type SalesAnalytics {
    totalSales: Float!
    orderCount: Int!
    averageOrderValue: Float!
    salesByDay: [DailySales]
    salesByCategory: [CategorySales]
    topProducts: [TopProduct]
  }
`;

module.exports = typeDefs; 