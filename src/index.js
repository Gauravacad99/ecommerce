const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const mongoose = require('mongoose');
const config = require('./config');

// Import GraphQL schema and resolvers
const typeDefs = require('./schema');
const resolvers = require('./resolvers');

// MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Initialize Express
const app = express();

// Create Apollo Server
const startServer = async () => {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => ({ req }),
    formatError: (err) => {
      console.error(err);
      return {
        message: err.message,
        path: err.path
      };
    }
  });
  
  await server.start();
  server.applyMiddleware({ app });
  
  const PORT = config.PORT;
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`GraphQL endpoint: http://localhost:${PORT}${server.graphqlPath}`);
  });
};

// Connect to DB then start server
connectDB().then(() => {
  startServer();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`Error: ${err.message}`);
  // Close server & exit process
  process.exit(1);
}); 