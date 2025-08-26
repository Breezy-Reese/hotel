const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 4242;

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Serve admin folder
app.use('/admin', express.static(path.join(__dirname, 'admin')));


// Session middleware for admin login
app.use(session({
  secret: 'hotel-secret-key',
  resave: false,
  saveUninitialized: true,
}));

// Database connection
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'hoteldb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Initialize DB (rooms seeding only)
async function initDB() {
  try {
    const conn = await pool.getConnection();

    await conn.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        status ENUM('Available','Booked') DEFAULT 'Available'
      )
    `);

    const [rows] = await conn.query('SELECT COUNT(*) AS cnt FROM rooms');
    if (rows[0].cnt === 0) {
      await conn.query(`
        INSERT INTO rooms (name, price, status) VALUES
        ('Deluxe Suite', 250, 'Available'),
        ('Standard Room', 150, 'Available'),
        ('Single Room', 100, 'Available'),
        ('Double Room', 180, 'Available'),
        ('Family Suite', 300, 'Available')
      `);
      console.log('✅ Rooms seeded successfully');
    }

    conn.release();
    console.log('✅ DB initialized');
  } catch (err) {
    console.error('DB Init Error:', err);
  }
}
initDB();

// -------------------- ADMIN LOGIN --------------------
app.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM admins WHERE email=?', [email]);
    if(rows.length === 0) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const admin = rows[0];
    if(admin.password !== password) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    req.session.admin = { id: admin.id, email: admin.email };
    res.json({ success: true, message: 'Logged in successfully' });
  } catch (err) {
    console.error('Admin Login Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Middleware to protect admin routes
function isAdmin(req, res, next) {
  if(req.session.admin) next();
  else res.status(403).send('Access denied. Please log in.');
}

// Example: Fetch all room bookings (admin only)
app.get('/admin/bookings', isAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM room_bookings');
    res.json(rows);
  } catch(err) {
    console.error('Admin Fetch Bookings Error:', err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// -------------------- ROOM BOOKINGS --------------------
app.get('/rooms', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM rooms');
    res.json({ success: true, rooms: rows });
  } catch (err) {
    console.error('Rooms Fetch Error:', err);
    res.status(500).json({ success: false, message: 'Error fetching rooms' });
  }
});

app.post('/book', async (req, res) => {
  const { name, email, roomId, checkin, checkout } = req.body;
  if (!name || !email || !roomId || !checkin || !checkout) return res.json({ success: false, message: 'All fields are required' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [roomRows] = await conn.query('SELECT status FROM rooms WHERE id=? FOR UPDATE', [roomId]);
    if(roomRows.length === 0) { await conn.rollback(); return res.json({ success: false, message: 'Room not found' }); }
    if(roomRows[0].status === 'Booked') { await conn.rollback(); return res.json({ success: false, message: 'Room already booked' }); }

    await conn.query(
      'INSERT INTO room_bookings (user_id, room_id, name, email, checkin, checkout) VALUES (?, ?, ?, ?, ?, ?)',
      [1, roomId, name, email, checkin, checkout]
    );

    await conn.query('UPDATE rooms SET status="Booked" WHERE id=?', [roomId]);
    await conn.commit();
    res.json({ success: true, message: 'Room booked successfully!' });
  } catch(err) {
    await conn.rollback();
    console.error('Booking Error:', err);
    res.status(500).json({ success: false, message: 'Booking failed. Check server logs.' });
  } finally { conn.release(); }
});

// -------------------- SERVICE BOOKINGS --------------------
app.post('/book-service', async (req, res) => {
  const { name, email, serviceId, bookingDate } = req.body;
  if (!name || !email || !serviceId || !bookingDate) return res.status(400).json({ success: false, message: 'All fields are required' });

  try {
    const [result] = await pool.query(
      `INSERT INTO service_bookings 
      (name, email, user_id, service_id, booking_date, status) 
      VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, 1, serviceId, bookingDate, 'pending']
    );

    if(result.affectedRows === 1) res.json({ success: true, message: 'Service booked successfully!' });
    else res.status(500).json({ success: false, message: 'Booking failed to save.' });
  } catch(err) {
    console.error('Service Booking Error:', err);
    res.status(500).json({ success: false, message: 'Database error. Check logs.' });
  }
});

// Start server
app.listen(PORT, () => console.log(`🚀 Hotel server running on http://localhost:${PORT}`));

// -------------------- ADMIN LOGOUT --------------------
app.post('/admin/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true, message: 'Logged out successfully' });
});

// -------------------- SERVICE BOOKINGS (ADMIN) --------------------
app.get('/admin/service-bookings', isAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM service_bookings');
    res.json(rows);
  } catch(err) {
    console.error('Admin Fetch Service Bookings Error:', err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// -------------------- PROTECT DASHBOARD HTML --------------------
app.get('/admin/dashboard.html', isAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});

// Admin route to fetch room bookings with payment info
app.get('/admin/room-bookings', isAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT rb.id AS booking_id,
             rb.user_id,
             rb.room_id,
             r.name AS room_name,
             rb.name AS guest_name,
             rb.email,
             rb.checkin,
             rb.checkout,
             rb.status AS booking_status,
             rp.status AS payment_status,
             rp.amount,
             rp.method,
             rp.paid_at
      FROM room_bookings rb
      JOIN rooms r ON rb.room_id = r.id
      LEFT JOIN room_payments rp ON rb.id = rp.room_booking_id
      ORDER BY rb.id DESC
      LIMIT 50
    `);
    res.json({ success: true, bookings: rows });
  } catch (err) {
    console.error('Admin Fetch Bookings Error:', err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// Get all room bookings (including payment status)
app.get('/admin/room-bookings', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM room_bookings');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get all service bookings (including payment status)
app.get('/admin/service-bookings', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM service_bookings');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// -------------------- CUSTOMER ROOMS --------------------
app.get('/rooms', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, price, status FROM rooms ORDER BY FIELD(status,"Available","Booked") ASC, id DESC'
    );
    res.json(rows); // just return array of rooms
  } catch(err) {
    console.error('Customer Fetch Rooms Error:', err);
    res.status(500).json({ success: false, message: 'Error fetching rooms' });
  }
});
