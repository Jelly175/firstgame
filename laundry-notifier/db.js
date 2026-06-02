// ============================================================
// FILE: db.js
// PURPOSE: Connects our app to the MySQL database
//
// CONCEPT TO LEARN: "Connection Pool"
//   Instead of opening a new database connection for every
//   single request (which is slow), a pool keeps a few
//   connections open and reuses them — much faster!
//
// "require" is how Node.js imports a package.
// "dotenv" reads your .env file and loads the values.
// ============================================================

// Load the .env file so we can use process.env.DB_HOST, etc.
require('dotenv').config();

// Import the mysql2 package (we installed it via npm)
const mysql = require('mysql2');

// Create a "connection pool" — a group of ready-to-use DB connections
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',       // Where MySQL is running
  port: process.env.DB_PORT || 3306,              // MySQL's port number
  user: process.env.DB_USER || 'root',            // MySQL username
  password: process.env.DB_PASSWORD || '',        // MySQL password
  database: process.env.DB_NAME || 'laundry_db', // Which database to use
  waitForConnections: true,   // Wait if all connections are busy
  connectionLimit: 10,        // Max 10 connections at a time
  queueLimit: 0               // Unlimited requests can wait in queue
});

// .promise() lets us use async/await instead of old callback style
// CONCEPT: async/await makes code easier to read — it runs line by line
const promisePool = pool.promise();

// Export the pool so other files can "require" and use it
module.exports = promisePool;
