// ============================================================
// FILE: public/app.js
// PURPOSE: All the frontend JavaScript logic.
//
// CONCEPTS TO LEARN:
//
//  1. fetch() — The browser's built-in tool to call your backend API.
//     It works like: "Hey server, give me some data" — server replies.
//
//  2. async/await — Operations that take time (like fetching data)
//     are "async". The "await" keyword pauses until it's done.
//     Without await, your code would continue BEFORE data arrives.
//
//  3. DOM Manipulation — "DOM" = Document Object Model.
//     It's the live tree of HTML elements in your browser.
//     document.getElementById('foo') finds an element by its id.
//     element.innerHTML = '...' changes what's inside it.
//
//  4. Event Listeners — Code that runs when something happens.
//     button.addEventListener('click', doSomething) means:
//     "When this button is clicked, run doSomething()"
// ============================================================


// ============================================================
// CONSTANTS — URLs for our backend API
// All requests go to the same server (localhost:3000)
// ============================================================
const API = {
  status:    '/api/status',
  orders:    '/api/orders',
  notifyAll: '/api/notify-all-ready'
};


// ============================================================
// DOM REFERENCES — Get elements from HTML once and reuse them
// This is faster than calling document.getElementById every time
// ============================================================
const addOrderForm   = document.getElementById('add-order-form');
const ordersTableEl  = document.getElementById('orders-table');
const ordersTbody    = document.getElementById('orders-tbody');
const loadingMsg     = document.getElementById('loading-msg');
const emptyMsg       = document.getElementById('empty-msg');
const notifyAllBtn   = document.getElementById('notify-all-btn');
const refreshBtn     = document.getElementById('refresh-btn');
const waStatusEl     = document.getElementById('wa-status');
const waStatusText   = document.getElementById('wa-status-text');
const toastEl        = document.getElementById('toast');

// Stat counter elements
const statTotal    = document.getElementById('stat-total');
const statReady    = document.getElementById('stat-ready');
const statNotified = document.getElementById('stat-notified');
const statPending  = document.getElementById('stat-pending');


// ============================================================
// TOAST — Show a small pop-up notification message
// ============================================================
let toastTimer = null;

function showToast(message, type = 'default') {
  // type can be 'success', 'error', or 'default'

  // Clear any existing toast timer
  clearTimeout(toastTimer);

  // Set the message and style
  toastEl.textContent = message;
  toastEl.className = `toast toast-${type} show`;

  // Auto-hide after 3.5 seconds
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 3500);
}


// ============================================================
// CHECK WHATSAPP STATUS
// Calls GET /api/status every 5 seconds to update the badge
// ============================================================
async function checkWhatsAppStatus() {
  try {
    // fetch() sends an HTTP request to our backend
    // await waits for the response
    const res = await fetch(API.status);
    const data = await res.json(); // Parse the JSON response

    if (data.whatsappReady) {
      // Update the badge to show "Connected"
      waStatusEl.className = 'status-badge status-connected';
      waStatusText.textContent = 'WhatsApp Connected ✓';
    } else {
      waStatusEl.className = 'status-badge status-disconnected';
      waStatusText.textContent = 'WhatsApp Not Connected';
    }
  } catch {
    // If the server is unreachable
    waStatusEl.className = 'status-badge status-disconnected';
    waStatusText.textContent = 'Server Offline';
  }
}


// ============================================================
// FORMAT DATE — Make dates look nice in the table
// e.g. "2024-01-15T10:30:00.000Z"  →  "Jan 15, 2024, 10:30 AM"
// ============================================================
function formatDate(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  return date.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}


// ============================================================
// LOAD ORDERS — Fetch all orders from the backend and display
// ============================================================
async function loadOrders() {
  loadingMsg.style.display = 'block';
  emptyMsg.style.display   = 'none';
  ordersTableEl.style.display = 'none';

  try {
    // GET /api/orders — fetches the list of all orders
    const res = await fetch(API.orders);
    if (!res.ok) throw new Error('Failed to load orders');

    // Convert response to JavaScript array of objects
    const orders = await res.json();

    // Update stat counters at the top
    updateStats(orders);

    if (orders.length === 0) {
      // No orders yet — show the empty message
      loadingMsg.style.display = 'none';
      emptyMsg.style.display   = 'block';
      return;
    }

    // Build the table rows from the data
    renderOrderRows(orders);

    loadingMsg.style.display      = 'none';
    ordersTableEl.style.display   = 'table';

  } catch (error) {
    loadingMsg.textContent = '⚠️ Could not load orders. Is the server running?';
    console.error(error);
  }
}


// ============================================================
// UPDATE STATS — Fill in the 4 counter numbers at the top
// ============================================================
function updateStats(orders) {
  statTotal.textContent    = orders.length;
  statReady.textContent    = orders.filter(o => o.status === 'ready').length;
  statNotified.textContent = orders.filter(o => o.notified == 1).length;
  statPending.textContent  = orders.filter(o => o.status === 'pending').length;
}


// ============================================================
// RENDER ORDER ROWS — Build HTML for each row in the table
// ============================================================
function renderOrderRows(orders) {
  // Clear existing rows before rebuilding
  ordersTbody.innerHTML = '';

  // Loop through each order and create a <tr> (table row)
  orders.forEach((order) => {
    const row = document.createElement('tr');

    // Build the action buttons based on current status
    const actionButtons = buildActionButtons(order);

    // Fill the row with data
    // template literals (backticks) let us embed variables with ${}
    row.innerHTML = `
      <td>${order.id}</td>
      <td><strong>${escapeHtml(order.customer_name)}</strong></td>
      <td>${escapeHtml(order.phone)}</td>
      <td><span class="badge badge-${order.status}">${statusLabel(order.status)}</span></td>
      <td>
        <span class="badge ${order.notified ? 'badge-yes' : 'badge-no'}">
          ${order.notified ? '✓ Sent' : 'Not Sent'}
        </span>
      </td>
      <td style="color: var(--color-muted); font-size: 0.82rem;">${formatDate(order.created_at)}</td>
      <td><div class="actions-cell">${actionButtons}</div></td>
    `;

    ordersTbody.appendChild(row);
  });

  // Attach click events to every action button in the table
  attachTableButtonEvents();
}


// ============================================================
// BUILD ACTION BUTTONS — Shown per row based on order status
// ============================================================
function buildActionButtons(order) {
  let buttons = '';

  // "Mark Ready" button — only if status is 'pending'
  if (order.status === 'pending') {
    buttons += `
      <button class="btn btn-icon btn-ready" data-action="ready" data-id="${order.id}">
        ✓ Mark Ready
      </button>`;
  }

  // "Send WhatsApp" button — only if status is 'ready'
  if (order.status === 'ready') {
    buttons += `
      <button class="btn btn-icon btn-notify" data-action="notify" data-id="${order.id}">
        📲 Notify
      </button>`;
  }

  // "Mark Picked Up" button — only if status is 'ready'
  if (order.status === 'ready') {
    buttons += `
      <button class="btn btn-icon btn-pickup" data-action="pickup" data-id="${order.id}">
        📦 Picked Up
      </button>`;
  }

  // "Delete" button — always visible
  buttons += `
    <button class="btn btn-icon btn-delete" data-action="delete" data-id="${order.id}">
      🗑 Delete
    </button>`;

  return buttons;
}


// ============================================================
// ATTACH TABLE BUTTON EVENTS
// Uses "event delegation" — one listener on the tbody handles
// all button clicks by checking data-action attribute
// ============================================================
function attachTableButtonEvents() {
  // Remove old listener to avoid duplicates, then add fresh one
  const newTbody = ordersTbody.cloneNode(true);
  ordersTbody.parentNode.replaceChild(newTbody, ordersTbody);

  // Re-assign the reference since we replaced the element
  const tbody = document.getElementById('orders-tbody');

  tbody.addEventListener('click', async (event) => {
    // Find the closest button that was clicked
    const button = event.target.closest('[data-action]');
    if (!button) return;

    const action = button.dataset.action;
    const id     = button.dataset.id;

    // Disable the button while working to prevent double-clicks
    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = '…';

    try {
      if (action === 'ready') {
        await updateStatus(id, 'ready');
      } else if (action === 'pickup') {
        await updateStatus(id, 'picked_up');
      } else if (action === 'notify') {
        await notifyCustomer(id);
      } else if (action === 'delete') {
        await deleteOrder(id);
      }
    } finally {
      // Re-enable even if there was an error
      button.disabled = false;
      button.textContent = originalText;
    }
  });
}


// ============================================================
// UPDATE STATUS — PUT /api/orders/:id/status
// ============================================================
async function updateStatus(id, status) {
  const res = await fetch(`${API.orders}/${id}/status`, {
    method: 'PUT',                                  // HTTP method
    headers: { 'Content-Type': 'application/json' },// Tell server we send JSON
    body: JSON.stringify({ status })                 // The data we send
  });

  const data = await res.json();

  if (res.ok) {
    showToast(
      status === 'ready' ? '✅ Order marked as Ready!' : '📦 Marked as Picked Up!',
      'success'
    );
    await loadOrders(); // Refresh the table
  } else {
    showToast(data.error || 'Failed to update status', 'error');
  }
}


// ============================================================
// NOTIFY ONE CUSTOMER — POST /api/orders/:id/notify
// ============================================================
async function notifyCustomer(id) {
  const res = await fetch(`${API.orders}/${id}/notify`, {
    method: 'POST'
  });

  const data = await res.json();

  if (res.ok) {
    showToast(`📲 ${data.message}`, 'success');
    await loadOrders();
  } else {
    showToast(data.error || 'Failed to send WhatsApp', 'error');
  }
}


// ============================================================
// DELETE ORDER — DELETE /api/orders/:id
// ============================================================
async function deleteOrder(id) {
  // Ask for confirmation before deleting
  const confirmed = confirm('Delete this order? This cannot be undone.');
  if (!confirmed) return;

  const res = await fetch(`${API.orders}/${id}`, {
    method: 'DELETE'
  });

  if (res.ok) {
    showToast('🗑 Order deleted', 'default');
    await loadOrders();
  } else {
    const data = await res.json();
    showToast(data.error || 'Delete failed', 'error');
  }
}


// ============================================================
// NOTIFY ALL READY — POST /api/notify-all-ready
// ============================================================
notifyAllBtn.addEventListener('click', async () => {
  const confirmed = confirm(
    'Send WhatsApp to ALL customers with "Ready" status?\n(Only sends to those not yet notified.)'
  );
  if (!confirmed) return;

  notifyAllBtn.disabled     = true;
  notifyAllBtn.textContent  = '⏳ Sending…';

  try {
    const res  = await fetch(API.notifyAll, { method: 'POST' });
    const data = await res.json();

    if (res.ok) {
      showToast(
        `📲 Sent ${data.count} WhatsApp message${data.count !== 1 ? 's' : ''}!`,
        'success'
      );
      await loadOrders();
    } else {
      showToast(data.error || 'Bulk send failed', 'error');
    }
  } catch {
    showToast('Server error during bulk send', 'error');
  } finally {
    notifyAllBtn.disabled    = false;
    notifyAllBtn.textContent = '📲 Send WhatsApp to All Ready Orders';
  }
});


// ============================================================
// ADD ORDER FORM SUBMIT — POST /api/orders
// ============================================================
addOrderForm.addEventListener('submit', async (event) => {
  // Prevent the default browser behavior (page reload on submit)
  event.preventDefault();

  // Read the values from the form fields
  const customer_name = document.getElementById('customer-name').value.trim();
  const phone         = document.getElementById('phone').value.trim();
  const status        = document.getElementById('status').value;

  if (!customer_name || !phone) {
    showToast('Please enter both name and phone number', 'error');
    return;
  }

  // Simple phone validation — must start with + and have digits
  if (!/^\+?\d{7,15}$/.test(phone.replace(/[\s\-()]/g, ''))) {
    showToast('Enter a valid phone number with country code (e.g. +919876543210)', 'error');
    return;
  }

  const submitBtn = addOrderForm.querySelector('button[type="submit"]');
  submitBtn.disabled    = true;
  submitBtn.textContent = '⏳ Adding…';

  try {
    const res = await fetch(API.orders, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ customer_name, phone, status })
    });

    const data = await res.json();

    if (res.ok) {
      showToast('✅ Order added!', 'success');
      addOrderForm.reset(); // Clear the form fields
      await loadOrders();   // Refresh the table
    } else {
      showToast(data.error || 'Failed to add order', 'error');
    }
  } catch {
    showToast('Could not reach the server', 'error');
  } finally {
    submitBtn.disabled    = false;
    submitBtn.textContent = 'Add Order';
  }
});


// ============================================================
// REFRESH BUTTON
// ============================================================
refreshBtn.addEventListener('click', () => loadOrders());


// ============================================================
// HELPER: Convert status key to readable label
// ============================================================
function statusLabel(status) {
  const labels = {
    pending:   '⏳ Pending',
    ready:     '✅ Ready',
    picked_up: '📦 Picked Up'
  };
  return labels[status] || status;
}


// ============================================================
// HELPER: Escape HTML to prevent XSS attacks
// CONCEPT: Never put raw user input into innerHTML without
//   escaping it. A user could type <script>alert('hacked')</script>
//   as their name! This function makes it safe.
// ============================================================
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


// ============================================================
// STARTUP — Runs when the page first loads
// ============================================================
(function init() {
  // Load orders immediately
  loadOrders();

  // Check WhatsApp status now and then every 5 seconds
  checkWhatsAppStatus();
  setInterval(checkWhatsAppStatus, 5000);
})();
