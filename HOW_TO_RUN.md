# How to Run the E-Commerce Analytics API

This document provides step-by-step instructions on how to run the API.

## Prerequisites

- Node.js and npm installed

## Setup and Installation

1. **Clone the repository:**

2. **Install dependencies:**
   ```bash
   cd ecommerce-api
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   ```
   
   Or alternatively:
   ```bash
   node src/index.js
   ```

4. **Access the GraphQL playground:**
   Open your browser and go to http://localhost:4000/graphql

## Using the API

### Available Queries

1. **Get All Customers**
   ```graphql
   query {
     getCustomers {
       _id
       name
       email
     }
   }
   ```

2. **Get Customer Spending**
   ```graphql
   query {
     getCustomerSpending(customerId: "7895595e-7f25-47fe-a6f8-94b31bfab736") {
       customer {
         _id
         name
         email
       }
       totalSpent
       orderCount
       averageOrderValue
       recentOrders {
         _id
         total
         status
       }
       purchasesByCategory {
         category
         amount
         percentage
       }
     }
   }
   ```

3. **Get Top Selling Products**
   ```graphql
   query {
     getTopSellingProducts(limit: 5) {
       product {
         _id
         name
         price
         category
       }
       totalSold
       revenue
       orderCount
     }
   }
   ```

4. **Get Sales Analytics**
   ```graphql
   query {
     getSalesAnalytics(startDate: "2024-01-01", endDate: "2025-02-28") {
       totalSales
       orderCount
       averageOrderValue
       salesByDay {
         date
         sales
       }
       salesByCategory {
         category
         sales
         percentage
       }
       topProducts {
         product {
           _id
           name
         }
         totalSold
         revenue
       }
     }
   }
   ```

5. **Get Customer Orders (Paginated)**
   ```graphql
   query {
     getCustomerOrders(
       customerId: "7895595e-7f25-47fe-a6f8-94b31bfab736"
       page: 1
       limit: 5
     ) {
       orders {
         _id
         total
         status
         orderDate
       }
       totalOrders
       totalPages
       currentPage
       hasNextPage
       hasPreviousPage
     }
   }
   ```

### Mutations

1. **Place a New Order**
   ```graphql
   mutation {
     placeOrder(
       input: {
         customerId: "7895595e-7f25-47fe-a6f8-94b31bfab736"
         items: [
           { productId: "34fad6ef-d906-44ce-ae7a-44453282b0e9", quantity: 2 }
           { productId: "508220fc-2f77-414e-b9d6-120be0fca340", quantity: 1 }
         ]
         paymentMethod: "credit_card"
         shippingAddress: {
           street: "123 Main Street"
           city: "New York"
           state: "NY"
           zip: "10001"
           country: "USA"
         }
       }
     ) {
       _id
       total
       status
       orderDate
     }
   }
   ```

## Testing with Postman

You can use the provided Postman collection to test the API:

1. Import the `ecommerce-postman-collection.json` file into Postman
2. Make sure your server is running at http://localhost:4000/graphql
3. Send requests directly from Postman

## Additional Documentation

For detailed explanations of the MongoDB operations used in this application, please refer to:

- **MONGODB_QUERIES.md**: Contains in-depth descriptions of the projections, aggregations, and indexing strategies used in the API 