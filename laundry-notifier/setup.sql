-- ============================================================
-- WHAT THIS FILE IS:
-- This is a SQL script. It creates your database and table.
-- Run it ONCE before starting the app.
--
-- HOW TO RUN IT (on macOS with Homebrew MySQL):
--   mysql -u root < setup.sql
--
-- WHAT IS A DATABASE?
--   Think of it as a folder that holds your data.
--
-- WHAT IS A TABLE?
--   Think of it as a spreadsheet inside that folder.
--   Each row = one customer order.
-- ============================================================

-- Create the database if it doesn't already exist
CREATE DATABASE IF NOT EXISTS laundry_db;

-- Switch to that database so all commands below apply to it
USE laundry_db;

-- Create the "orders" table
-- Each column is like a column header in a spreadsheet
CREATE TABLE IF NOT EXISTS orders (
  -- id: auto-increments automatically (1, 2, 3, ...)
  -- This is called a PRIMARY KEY — a unique ID for each row
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- The customer's name (up to 100 characters)
  customer_name VARCHAR(100) NOT NULL,

  -- The customer's phone number (e.g. +919876543210)
  -- VARCHAR(20) means text, up to 20 characters
  phone VARCHAR(20) NOT NULL,

  -- Order status — can only be one of these 3 values
  -- ENUM means "one of these options only"
  status ENUM('pending', 'ready', 'picked_up') DEFAULT 'pending',

  -- Was the WhatsApp notification sent? 0 = no, 1 = yes
  -- TINYINT(1) is just a boolean (true/false) in MySQL
  notified TINYINT(1) DEFAULT 0,

  -- Automatically records WHEN the order was created
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Automatically updates WHEN the row is changed
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Show a success message
SELECT 'Database and table created successfully!' AS message;
