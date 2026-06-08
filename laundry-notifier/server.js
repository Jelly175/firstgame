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
// HELPER: Normalize Indian phone number to plain digits
//
// Handles all common Indian formats:
//   09876543210   (starts with 0, 11 digits) → 919876543210
//   9876543210    (10 digits, no 0)           → 919876543210
//   919876543210  (already has 91, 12 digits) → 919876543210
//   +919876543210 (has +91)                   → 919876543210
// ============================================================
function normalizePhone(phone) {
  let cleaned = phone.replace(/\D/g, ''); // Remove +, spaces, dashes, brackets

  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '91' + cleaned.slice(1); // 09876543210 → 919876543210
  } else if (cleaned.length === 10) {
    cleaned = '91' + cleaned;          // 9876543210  → 919876543210
  }

  return cleaned; // Just plain digits — no @c.us yet
}

// ============================================================
// HELPER: Verify number and send a WhatsApp message
//
// Returns one of three result objects — never throws:
//   { sent: true }
//       → message delivered successfully
//   { sent: false, permanent: true, reason: '...' }
//       → number not on WhatsApp — mark as permanently skipped
//         so the bulk loop never retries this number again
//   { sent: false, permanent: false, reason: '...' }
//       → temporary error (network glitch etc.) — may succeed next run
//
// WHY return instead of throw?
//   In the bulk loop, a "not on WhatsApp" failure is PERMANENT.
//   We need to treat it differently from a temporary network error.
//   Returning a typed result makes this easy to check.
// ============================================================
async function sendWhatsApp(phone, message) {
  const digits = normalizePhone(phone);

  try {
    // getNumberId() asks WhatsApp: "Is this number registered?"
    // Returns an ID object if yes, returns null if not on WhatsApp
    const numberId = await whatsappClient.getNumberId(digits);

    if (!numberId) {
      // PERMANENT failure — this number will never be on WhatsApp
      return {
        sent:      false,
        permanent: true,
        reason:    `${phone} is not registered on WhatsApp`
      };
    }

    // numberId._serialized is the verified address, e.g. "919876543210@c.us"
    await whatsappClient.sendMessage(numberId._serialized, message);
    return { sent: true };

  } catch (err) {
    // Temporary error (network, WhatsApp rate limit, etc.)
    return {
      sent:      false,
      permanent: false,
      reason:    err.message
    };
  }
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

  //  `Hi Sir 👋 \n\n` +
    //`We are working with laundry & dry cleaning stores to simplify daily operations like: \n` +
    //`• order tracking \n` +
    //`• pending payments \n` +
    //`• delivery management \n` +
    //`• customer WhatsApp updates \n\n` +
    //`Wanted to understand — how are you currently managing your laundry operations? `

    `हेलो सर 👋 \n\n` +
    `लॉन्ड्री बिज़नेस में कपड़ों की टैगिंग, पेंडिंग पेमेंट्स और कस्टमर्स को बार-बार अपडेट देने में काफी समय चला जाता है। हम इसी काम को पूरी तरह ऑटोमैटिक और आसान बनाने में स्टोर्स की मदद करते हैं। \n\n` +
    `क्या आप अभी इसके लिए कोई सॉफ्टवेयर इस्तेमाल कर रहे हैं या सब मैनुअल (डायरी में) होता है? \n\n` +
    `Fabric First`
  );
}

// ============================================================
// SAFE MESSAGING CONFIGURATION
//
// WHY THIS MATTERS:
//   WhatsApp monitors accounts that send many identical messages
//   rapidly. If you send 80 messages with a 2-second gap, it
//   looks exactly like spam — and they block your number.
//
//   Safe rules:
//     - Random delay between messages (looks human, not a bot)
//     - Max 30 messages per run (spread the rest across hours)
//     - These values are configurable in your .env file
// ============================================================
const MAX_BULK_PER_RUN  = parseInt(process.env.MAX_BULK_PER_RUN   || '30');
const DELAY_MIN_SEC     = parseInt(process.env.MESSAGE_DELAY_MIN   || '20');
const DELAY_MAX_SEC     = parseInt(process.env.MESSAGE_DELAY_MAX   || '45');

// Returns a Promise that resolves after a RANDOM wait between min and max seconds
// Random = harder for WhatsApp to detect as automated
function randomDelay() {
  const ms = Math.floor(
    Math.random() * (DELAY_MAX_SEC - DELAY_MIN_SEC + 1) + DELAY_MIN_SEC
  ) * 1000;
  console.log(`   ⏳ Waiting ${(ms / 1000).toFixed(0)}s before next message...`);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// PROGRESS TRACKER
//
// CONCEPT: Global state object
//   Because the bulk send loop runs in the background (after the
//   HTTP response is already sent), we store progress here.
//   The frontend polls GET /api/notify-progress to read it.
// ============================================================
let notifyProgress = {
  running:     false,   // Is a bulk send currently happening?
  total:       0,       // How many messages to send this run
  sent:        0,       // How many sent so far
  failed:      0,       // How many failed
  queued:      0,       // How many are waiting for the NEXT run
  currentName: '',      // The customer being messaged right now
  results:     [],
  finishedAt:  null
};

// ----------------------------------------------------------
// GET /api/notify-progress
// PURPOSE: Let the frontend check real-time bulk-send progress.
//   Frontend calls this every 3 seconds while a send is running.
// ----------------------------------------------------------
app.get('/api/notify-progress', (req, res) => {
  res.json(notifyProgress);
});

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
    const message = buildMessage(order.customer_name);
    const result  = await sendWhatsApp(order.phone, message);

    if (result.sent) {
      await db.query('UPDATE orders SET notified = 1 WHERE id = ?', [id]);
      return res.json({ message: `WhatsApp sent to ${order.customer_name}` });
    }

    if (result.permanent) {
      // Mark notified = 2 (permanently invalid) so bulk send never retries this
      await db.query('UPDATE orders SET notified = 2 WHERE id = ?', [id]);
    }

    return res.status(400).json({ error: result.reason });
  } catch (error) {
    console.error('Error in single notify:', error);
    res.status(500).json({ error: error.message || 'Failed to send WhatsApp message' });
  }
});

// ----------------------------------------------------------
// POST /api/notify-all-ready
// PURPOSE: Send WhatsApp to customers with status "ready" (safe version)
//
// HOW IT WORKS (beginner explanation):
//   1. We respond to the frontend IMMEDIATELY (so the page doesn't freeze)
//   2. The actual sending loop runs in the background
//   3. The frontend polls GET /api/notify-progress every 3 seconds
//      to show a live progress bar
//
// WHY BATCH LIMIT + RANDOM DELAY?
//   WhatsApp tracks how fast messages leave your account.
//   Sending 80 messages in 2 minutes = flagged as spam = number blocked.
//   With 20-45 second random gaps, 30 messages takes ~15-20 minutes
//   but looks completely human to WhatsApp.
// ----------------------------------------------------------
app.post('/api/notify-all-ready', async (req, res) => {
  if (!whatsappReady) {
    return res.status(503).json({
      error: 'WhatsApp is not connected yet. Please scan the QR code in the terminal.'
    });
  }

  // Don't allow two bulk sends at the same time
  if (notifyProgress.running) {
    return res.status(409).json({
      error: 'A bulk send is already running. Check the progress bar.'
    });
  }

  try {
    // Fetch all ready, unnotified orders
    const [allOrders] = await db.query(
      "SELECT * FROM orders WHERE status = 'ready' AND notified = 0"
    );

    if (allOrders.length === 0) {
      return res.json({ message: 'No pending notifications to send', total: 0, queued: 0 });
    }

    // Take only the first MAX_BULK_PER_RUN orders this session
    // The rest will be sent next time the button is clicked
    const toSend       = allOrders.slice(0, MAX_BULK_PER_RUN);
    const queuedCount  = allOrders.length - toSend.length;

    // Reset and initialize progress
    notifyProgress = {
      running:     true,
      total:       toSend.length,
      sent:        0,
      failed:      0,
      queued:      queuedCount,
      currentName: toSend[0]?.customer_name || '',
      results:     [],
      finishedAt:  null
    };

    // Send the HTTP response NOW — frontend gets this instantly
    // The loop below keeps running after this line
    res.json({
      message:  `Starting — sending ${toSend.length} messages`,
      total:    toSend.length,
      queued:   queuedCount
    });

    // --- BACKGROUND SEND LOOP ---
    // This runs AFTER the response was sent.
    // Node.js is single-threaded but non-blocking: await randomDelay()
    // yields control back so other requests (like /api/notify-progress)
    // can be handled while we wait between messages.
    for (let i = 0; i < toSend.length; i++) {
      const order = toSend[i];
      notifyProgress.currentName = order.customer_name;

      const message = buildMessage(order.customer_name);
      const result  = await sendWhatsApp(order.phone, message);

      if (result.sent) {
        // ✅ Success — mark as notified
        await db.query('UPDATE orders SET notified = 1 WHERE id = ?', [order.id]);
        notifyProgress.sent++;
        notifyProgress.results.push({ name: order.customer_name, success: true });
        console.log(`✅ [${notifyProgress.sent}/${notifyProgress.total}] Sent to ${order.customer_name}`);

      } else if (result.permanent) {
        // ❌ Permanent failure — number is not on WhatsApp, will never work.
        // Set notified = 2 so this row is NEVER picked up by bulk send again.
        // This stops the infinite retry loop.
        await db.query('UPDATE orders SET notified = 2 WHERE id = ?', [order.id]);
        notifyProgress.failed++;
        notifyProgress.results.push({ name: order.customer_name, success: false, permanent: true });
        console.warn(`⚠️  Permanently skipped ${order.customer_name} — ${result.reason}`);

      } else {
        // ⚠️  Temporary failure — keep notified = 0 so it's retried next run
        notifyProgress.failed++;
        notifyProgress.results.push({ name: order.customer_name, success: false, permanent: false });
        console.error(`❌ Temp failure: ${order.customer_name} — ${result.reason}`);
      }

      // Wait a random delay before the NEXT message (skip wait after last one)
      if (i < toSend.length - 1) {
        await randomDelay();
      }
    }

    // Mark send as complete
    notifyProgress.running     = false;
    notifyProgress.currentName = '';
    notifyProgress.finishedAt  = new Date().toISOString();
    console.log(`\n🏁 Bulk send done: ${notifyProgress.sent} sent, ${notifyProgress.failed} failed\n`);

  } catch (error) {
    notifyProgress.running = false;
    console.error('Error in bulk notify:', error);
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
