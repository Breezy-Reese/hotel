const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4242;

// ------------------ MIDDLEWARE ------------------
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing URL-encoded data
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// ------------------ DATABASE CONFIG ------------------
const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '', // empty if no password
  database: 'hoteldb',
  waitForConnections: true,
  connectionLimit: 10
};

let pool;

// ------------------ DATABASE CONNECTION ------------------
(async () => {
  try {
    pool = mysql.createPool(DB_CONFIG).promise();
    const [r] = await pool.query('SELECT DATABASE() AS db, VERSION() AS version, NOW() AS server_time');
    console.log('✅ Connected to MySQL DB:', r[0]);
  } catch (err) {
    console.error('❌ DB connect failed at startup:', err);
    process.exit(1);
  }
})();

// ------------------ DEBUG ROUTE ------------------
app.get("/debug/db-test", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT NOW() AS server_time");
    res.json({ success: true, db_time: rows[0]?.server_time || null });
  } catch (err) {
    console.error("DB test error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ------------------ BOOKING ROUTE ------------------
app.post('/book', async (req, res) => {
  try {
    const body = req.body || {};
    const { name, email, checkin, checkout, room_type } = body;

    if (!name || !email || !checkin || !checkout || !room_type) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const sql = `INSERT INTO bookings (name, email, checkin, checkout, room_type, created_at)
                 VALUES (?, ?, ?, ?, ?, NOW())`;
    await pool.query(sql, [name, email, checkin, checkout, room_type]);

    console.log(`✅ Booking saved for ${name} (${email})`);
    res.json({ success: true, message: 'Booking saved successfully' });
  } catch (err) {
    console.error('❌ Booking error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ------------------ ADMIN LOGIN ROUTE ------------------
app.post('/admin/login', async (req, res) => {
  try {
    const body = req.body || {};
    const { username, password } = body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    const [rows] = await pool.query('SELECT * FROM admins WHERE username = ?', [username]);
    if (!rows.length) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    console.log(`✅ Admin ${username} logged in`);
    res.json({ success: true, message: 'Login successful' });
  } catch (err) {
    console.error('❌ Admin login error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ------------------ GET ALL BOOKINGS (ADMIN) ------------------
app.get('/api/bookings', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM bookings ORDER BY created_at DESC');
    res.json({ success: true, bookings: rows });
  } catch (err) {
    console.error('❌ Fetch bookings error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ------------------ MOCK PAYMENT ROUTE ------------------
app.post('/pay', async (req, res) => {
  try {
    const body = req.body || {};
    const { name, email, amount } = body;

    if (!name || !email || !amount) {
      return res.status(400).json({ success: false, message: 'Missing payment fields' });
    }

    console.log(`💰 Payment request received for ${name} (${email}) amount: ${amount}`);
    res.json({ success: true, message: `Payment request for ${amount} received for ${name} (${email})` });
  } catch (err) {
    console.error('❌ Payment error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ------------------ START SERVER ------------------
app.listen(PORT, () => console.log(`🚀 Hotel server running on http://localhost:${PORT}`));
