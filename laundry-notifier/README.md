# 🧺 Laundry Notifier

A simple tool for laundry/dry cleaning stores to send WhatsApp messages to customers when their order is ready for pickup.

## What It Does

- Store owner adds customer name + phone number + order status
- When an order is marked **Ready**, the store can send a WhatsApp message
- Message tells the customer: *"Your dry cleaning is ready — pick up within 72 hours"*
- Can notify one customer or all ready customers at once

---

## Tech Stack

| Layer    | Technology        |
|----------|-------------------|
| Frontend | HTML + CSS + Vanilla JS |
| Backend  | Node.js + Express |
| Database | MySQL             |
| WhatsApp | whatsapp-web.js (free, no API key needed) |

---

## Project Structure

```
laundry-notifier/
├── server.js          ← Backend: Express server + all API routes
├── db.js              ← Database: MySQL connection pool
├── setup.sql          ← Database: Run once to create tables
├── package.json       ← Lists all npm packages used
├── .env.example       ← Template for your config — copy to .env
├── .gitignore         ← Files git should NOT track
└── public/
    ├── index.html     ← The webpage (structure)
    ├── style.css      ← The webpage (styling)
    └── app.js         ← The webpage (logic / API calls)
```

---

## Setup Instructions (macOS with Homebrew MySQL)

### Step 1 — Install Node dependencies

```bash
cd laundry-notifier
npm install
```

> **What this does:** Reads `package.json` and downloads all the packages into a `node_modules/` folder.

---

### Step 2 — Create your .env file

```bash
cp .env.example .env
```

Then open `.env` and fill in your MySQL credentials:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=           ← leave blank if Homebrew MySQL has no password
DB_NAME=laundry_db
PORT=3000
```

> **What is .env?** A private config file. It keeps secrets (passwords) out of your code.

---

### Step 3 — Start MySQL (Homebrew)

```bash
brew services start mysql
```

Check it's running:
```bash
brew services list
```

---

### Step 4 — Create the database

```bash
mysql -u root < setup.sql
```

If your MySQL root has a password:
```bash
mysql -u root -p < setup.sql
```

> **What this does:** Runs the SQL script that creates the `laundry_db` database and the `orders` table.

---

### Step 5 — Start the app

```bash
npm start
```

You'll see:
```
🚀 Laundry Notifier running at http://localhost:3000
⏳ Initializing WhatsApp...
```

Then a **QR code** appears in the terminal.

---

### Step 6 — Connect WhatsApp

1. Open WhatsApp on your phone
2. Go to **Settings → Linked Devices → Link a Device**
3. Scan the QR code shown in the terminal
4. Wait for "✅ WhatsApp is connected and ready!"

> **You only do this ONCE.** The session is saved locally, so next time you start the app it reconnects automatically.

---

### Step 7 — Open the app

Visit **http://localhost:3000** in your browser.

---

## How to Use

1. **Add a customer** — Fill in name, phone (with country code), and status
   - Phone format: `+919876543210` (India) or `+14155551234` (USA)
2. **Mark as Ready** — Click the ✓ button to update an order to Ready
3. **Send WhatsApp** — Click 📲 Notify to send a message to one customer
4. **Bulk Send** — Click "Send WhatsApp to All Ready Orders" at the top

---

## WhatsApp Message Sent

```
Hello Rahul Sharma! 👋

Your *dry cleaning order* is ready for pickup! 🧺✨

Please visit our store within *72 hours* to collect your clothes.

Thank you for choosing us! 🙏
— Your Laundry Store
```

---

## API Endpoints (for reference)

| Method | URL                          | What it does                     |
|--------|------------------------------|----------------------------------|
| GET    | /api/status                  | Check if WhatsApp is connected   |
| GET    | /api/orders                  | Get all orders                   |
| POST   | /api/orders                  | Add a new order                  |
| PUT    | /api/orders/:id/status       | Update order status              |
| DELETE | /api/orders/:id              | Delete an order                  |
| POST   | /api/orders/:id/notify       | Send WhatsApp to one customer    |
| POST   | /api/notify-all-ready        | Send WhatsApp to all ready       |

---

## Troubleshooting

**"Cannot connect to MySQL"**
- Make sure MySQL is running: `brew services list`
- Check your `.env` credentials

**"WhatsApp is not connected"**
- Check the terminal for the QR code
- Scan it with your phone
- WhatsApp must be active on your phone (not logged out)

**"Failed to send — number is invalid"**
- Make sure the phone number includes the country code
- Format: `+919876543210` (no spaces, dashes)
- The customer must have WhatsApp on that number
