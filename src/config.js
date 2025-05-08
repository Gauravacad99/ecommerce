const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Default configuration with preset values
const defaults = {
  MONGODB_URI: 'mongodb+srv://17ucs056:assignment@cluster0.grenzmn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
  PORT: 4000,
  REDIS_URI: 'redis://default:sz4c1cgwK6JrHY1zsxRTluF3Czd25wR9@redis-16574.c305.ap-south-1-1.ec2.redns.redis-cloud.com:16574'
};

console.log('Using preset configuration values');

// Export configuration with defaults
module.exports = {
  MONGODB_URI: defaults.MONGODB_URI,
  PORT: defaults.PORT,
  REDIS_URI: defaults.REDIS_URI
}; 