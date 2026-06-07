// ============================================================
// FILE: server.js
// PURPOSE: The main backend file — runs the Express web server
//          AND manages the WhatsApp connection.
//
// CONCEPTS TO LEARN:
//   - Express: A Node.js framework that makes building web
//     servers very easy.
//   - API (Application Programming Interface): A set of URLs
//     (called "endpoints") that the frontend talks to.
//   - async/await: A way to handle operations that take time
//     (like reading from a database) without freezing the app.
//   - REST API: A standard pattern where you use HTTP methods:
//       GET    = read data
//       POST   = create data
//       PUT    = update data
//       DELETE = delete data
// ============================================================

// Load environment variables from .env file FIRST (before anything else)
require('dotenv').config();

// Import packages
const express = require('express');
const cors = require('cors');                          // Allows frontend to talk to backend
const { Client, LocalAuth } = require('whatsapp-web.js'); // WhatsApp automation
const qrcode = require('qrcode-terminal');            // Shows QR code in your terminal
const db = require('./db');                            // Our database connection from db.js

// Create the Express application
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// MIDDLEWARE SETUP
// CONCEPT: Middleware = code that runs on EVERY request
//   before it reaches your route handler.
// ============================================================

// Allow Cross-Origin requests (frontend on same server talking to backend)
app.use(cors());

// Tell Express to read JSON data from request bodies
// Without this, req.body would be undefined when frontend sends JSON
app.use(express.json());

// Serve all files in the "public/" folder as a website
// So visiting http://localhost:3000 shows public/index.html
app.use(express.static('public'));

// ============================================================
// WHATSAPP CLIENT SETUP
//
// CONCEPT: whatsapp-web.js controls WhatsApp Web like a browser.
//   - First time: It shows a QR code in your terminal.
//   - You scan it with your phone (like logging into WhatsApp Web).
//   - LocalAuth saves your login so you don't scan every time.
// ============================================================

// Track whether WhatsApp is ready to send messages
let whatsappReady = false;

// Create the WhatsApp client
const whatsappClient = new Client({
  // LocalAuth saves your WhatsApp session in a local folder
  // So you only scan the QR code ONCE — then it auto-logs in
  authStrategy: new LocalAuth(),

  // Puppeteer is a headless browser that runs WhatsApp Web
  // These args make it work smoothly on most computers
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// EVENT: When WhatsApp needs you to scan a QR code
// This fires when your session is new or expired
whatsappClient.on('qr', (qr) => {
  console.log('\n======================================================');
  console.log('📱 SCAN THIS QR CODE WITH YOUR WHATSAPP:');
  console.log('   Open WhatsApp → Settings → Linked Devices → Link a Device');
  console.log('======================================================\n');
  // Print the QR code as ASCII art in the terminal
  qrcode.generate(qr, { small: true });
});

// EVENT: When WhatsApp is successfully connected and ready
whatsappClient.on('ready', () => {
  whatsappReady = true;
  console.log('\n✅ WhatsApp is connected and ready to send messages!\n');
});

// EVENT: If WhatsApp disconnects (phone turned off, logged out, etc.)
whatsappClient.on('disconnected', (reason) => {
  whatsappReady = false;
  console.log('❌ WhatsApp disconnected:', reason);
  console.log('   Restart the app to reconnect.');
});

// Start the WhatsApp client — this opens the headless browser
whatsappClient.initialize();

// ============================================================
// HELPER FUNCTION: Normalize Indian phone number for WhatsApp
//
// WhatsApp needs numbers in this format: "919876543210@c.us"
// (country code 91 + 10-digit number, no + sign, then @c.us)
//
// This function handles ALL common Indian formats automatically:
//   09876543210   (starts with 0, 11 digits) → 919876543210@c.us
//   9876543210    (10 digits, no 0)           → 919876543210@c.us
//   919876543210  (already has 91, 12 digits) → 919876543210@c.us
//   +919876543210 (has +91)                   → 919876543210@c.us
// ============================================================
function formatPhoneForWhatsApp(phone) {
  // Step 1: Strip everything that is not a digit (removes +, spaces, dashes, brackets)
  let cleaned = phone.replace(/\D/g, '');

  // Step 2: Normalize to 12-digit format (91 + 10 digits)
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    // e.g. 09876543210 → remove leading 0, add country code 91
    cleaned = '91' + cleaned.slice(1);
  } else if (cleaned.length === 10) {
    // e.g. 9876543210 → just add country code 91
    cleaned = '91' + cleaned;
  }
  // If already 12 digits starting with 91 → leave as-is

  // Step 3: Add WhatsApp's required suffix
  return cleaned + '@c.us';
}

// ============================================================
// HELPER FUNCTION: Build the WhatsApp message
// ============================================================
function buildMessage(customerName) {
  // ✏️  EDIT THIS MESSAGE to whatever you want to send customers.
  //
  // Rules:
  //   ${customerName}  →  automatically replaced with the customer's real name
  //   \n\n             →  blank line / new paragraph
  //   *word*           →  bold in WhatsApp
  //   _word_           →  italic in WhatsApp
  //
  // Save the file, restart the app (Ctrl+C then npm start), done.

  return (
   // `Hello ${customerName}! 👋\n\n` +
    //`Your *dry cleaning order* is ready for pickup! 🧺✨\n\n` +
    //`Please visit our store within *72 hours* to collect your clothes.\n\n` +
    //`Thank you for choosing us! 🙏\n` +
    //`— Your Laundry Store`

    `Hi Sir 👋 \n\n` +
    `We are working with laundry & dry cleaning stores to simplify daily operations like: \n` +
    `• order tracking \n` +
    `• pending payments \n` +
    `• delivery management \n` +
    `• customer WhatsApp updates \n\n` +
    `Wanted to understand — how are you currently managing your laundry operations? `
  );
}

// ============================================================
// API ROUTES
//
// CONCEPT: A "route" is a URL path + an HTTP method.
// When the frontend calls a URL, Express runs the matching function.
// ============================================================

// ----------------------------------------------------------
// GET /api/status
// PURPOSE: Let the frontend check if WhatsApp is connected
// ----------------------------------------------------------
app.get('/api/status', (req, res) => {
  res.json({ whatsappReady });
});

// ----------------------------------------------------------
// GET /api/orders
// PURPOSE: Fetch all orders from the database
// The frontend calls this to show the list of customers
// ----------------------------------------------------------
app.get('/api/orders', async (req, res) => {
  try {
    // SQL query: SELECT everything from the orders table
    // ORDER BY id DESC = newest orders first
    const [rows] = await db.query('SELECT * FROM orders ORDER BY id DESC');
    res.json(rows); // Send the data back as JSON
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Could not fetch orders' });
  }
});

// ----------------------------------------------------------
// POST /api/orders
// PURPOSE: Add a new customer order to the database
// The frontend sends: { customer_name, phone, status }
// ----------------------------------------------------------
app.post('/api/orders', async (req, res) => {
  // Destructure = pull values out of req.body
  const { customer_name, phone, status } = req.body;

  // Basic validation — make sure required fields are present
  if (!customer_name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required' });
  }

  try {
    // INSERT INTO = add a new row to the table
    // We use ? placeholders to prevent SQL Injection attacks
    // CONCEPT: Never put user input directly in SQL strings!
    const [result] = await db.query(
      'INSERT INTO orders (customer_name, phone, status) VALUES (?, ?, ?)',
      [customer_name.trim(), phone.trim(), status || 'pending']
    );

    res.status(201).json({
      message: 'Order added successfully',
      id: result.insertId // MySQL gives back the new row's ID
    });
  } catch (error) {
    console.error('Error adding order:', error);
    res.status(500).json({ error: 'Could not add order' });
  }
});

// ----------------------------------------------------------
// PUT /api/orders/:id/status
// PURPOSE: Update the status of a single order
// :id is a URL parameter — e.g. /api/orders/5/status
// ----------------------------------------------------------
app.put('/api/orders/:id/status', async (req, res) => {
  const { id } = req.params;         // The order ID from the URL
  const { status } = req.body;       // The new status from the request body

  const allowed = ['pending', 'ready', 'picked_up'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Could not update status' });
  }
});

// ----------------------------------------------------------
// DELETE /api/orders/:id
// PURPOSE: Remove an order from the database
// ----------------------------------------------------------
app.delete('/api/orders/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await db.query('DELETE FROM orders WHERE id = ?', [id]);
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Could not delete order' });
  }
});

// ----------------------------------------------------------
// POST /api/orders/:id/notify
// PURPOSE: Send a WhatsApp message to ONE specific customer
// ----------------------------------------------------------
app.post('/api/orders/:id/notify', async (req, res) => {
  const { id } = req.params;

  // Check if WhatsApp is connected before trying to send
  if (!whatsappReady) {
    return res.status(503).json({
      error: 'WhatsApp is not connected yet. Please scan the QR code in the terminal.'
    });
  }

  try {
    // Fetch the customer's details from the database
    const [rows] = await db.query('SELECT * FROM orders WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = rows[0];

    // Format the phone number for WhatsApp
    const whatsappNumber = formatPhoneForWhatsApp(order.phone);

    // Build the message text
    const message = buildMessage(order.customer_name);

    // Send the message via WhatsApp!
    await whatsappClient.sendMessage(whatsappNumber, message);

    // Mark this order as "notified" in the database
    await db.query('UPDATE orders SET notified = 1 WHERE id = ?', [id]);

    res.json({ message: `WhatsApp sent to ${order.customer_name}` });
  } catch (error) {
    console.error('Error sending WhatsApp:', error);
    res.status(500).json({ error: 'Failed to send WhatsApp message. Check if the number is valid.' });
  }
});

// ----------------------------------------------------------
// POST /api/notify-all-ready
// PURPOSE: Send WhatsApp to ALL customers with status "ready"
//          who haven't been notified yet
// ----------------------------------------------------------
app.post('/api/notify-all-ready', async (req, res) => {
  if (!whatsappReady) {
    return res.status(503).json({
      error: 'WhatsApp is not connected yet. Please scan the QR code in the terminal.'
    });
  }

  try {
    // Fetch all orders that are "ready" but not yet notified
    const [orders] = await db.query(
      "SELECT * FROM orders WHERE status = 'ready' AND notified = 0"
    );

    if (orders.length === 0) {
      return res.json({ message: 'No pending notifications to send', count: 0 });
    }

    const results = [];

    // Loop through each order and send a WhatsApp message
    // CONCEPT: "for...of" loop lets us use await inside it
    for (const order of orders) {
      try {
        const whatsappNumber = formatPhoneForWhatsApp(order.phone);
        const message = buildMessage(order.customer_name);

        await whatsappClient.sendMessage(whatsappNumber, message);

        // Mark as notified in the database
        await db.query('UPDATE orders SET notified = 1 WHERE id = ?', [order.id]);

        results.push({ id: order.id, name: order.customer_name, success: true });

        // Wait 2 seconds between messages to avoid WhatsApp spam detection
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (err) {
        // If one message fails, log it but continue with others
        console.error(`Failed to notify ${order.customer_name}:`, err.message);
        results.push({ id: order.id, name: order.customer_name, success: false });
      }
    }

    res.json({
      message: `Notification process complete`,
      count: results.filter((r) => r.success).length,
      results
    });
  } catch (error) {
    console.error('Error in bulk notify:', error);
    res.status(500).json({ error: 'Bulk notification failed' });
  }
});

// ----------------------------------------------------------
// POST /api/orders/bulk
// PURPOSE: Add MANY orders at once from a CSV upload.
// The frontend sends: { orders: [ {customer_name, phone, status}, ... ] }
// ----------------------------------------------------------
app.post('/api/orders/bulk', async (req, res) => {
  const { orders } = req.body;

  // Validate that we actually received an array
  if (!Array.isArray(orders) || orders.length === 0) {
    return res.status(400).json({ error: 'No orders provided' });
  }

  const results = [];
  let added = 0;

  // Loop through each row from the CSV and insert into DB
  for (const order of orders) {
    const { customer_name, phone, status } = order;

    // Skip rows that are missing required fields
    if (!customer_name || !phone) {
      results.push({ name: customer_name, phone, success: false, reason: 'Missing name or phone' });
      continue;
    }

    try {
      await db.query(
        'INSERT INTO orders (customer_name, phone, status) VALUES (?, ?, ?)',
        [customer_name.trim(), phone.trim(), status || 'pending']
      );
      results.push({ name: customer_name, phone, success: true });
      added++;
    } catch (err) {
      // If one row fails (e.g. duplicate), log it but continue with the rest
      results.push({ name: customer_name, phone, success: false, reason: err.message });
    }
  }

  res.json({
    message: `Imported ${added} of ${orders.length} orders`,
    added,
    results
  });
});

// ============================================================
// START THE SERVER
// app.listen() starts the server on the given port
// ============================================================
app.listen(PORT, () => {
  console.log('======================================================');
  console.log(`🚀 Laundry Notifier running at http://localhost:${PORT}`);
  console.log('======================================================');
  console.log('⏳ Initializing WhatsApp... Please wait for the QR code.');
  console.log('   (This may take 10-30 seconds on first run)');
  console.log('======================================================\n');
});
