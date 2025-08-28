const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 4242;

// -------------------- MIDDLEWARE --------------------
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
app.use(session({
  secret: 'hotel-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // true if using HTTPS
}));

// -------------------- DATABASE POOL --------------------
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'hoteldb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// -------------------- INITIALIZE DB --------------------
async function initDB() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        status ENUM('Available','Booked') DEFAULT 'Available',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(100)
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS room_bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        room_id INT,
        name VARCHAR(100),
        email VARCHAR(100),
        checkin DATE,
        checkout DATE,
        status ENUM('pending','confirmed','cancelled') DEFAULT 'pending',
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(room_id) REFERENCES rooms(id)
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100)
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS service_bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        service_id INT,
        name VARCHAR(100),
        email VARCHAR(100),
        booking_date DATETIME,
        status ENUM('pending','confirmed','cancelled') DEFAULT 'pending',
        payment_status ENUM('paid','unpaid') DEFAULT 'unpaid',
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(service_id) REFERENCES services(id)
      )
    `);
    console.log('✅ DB Initialized');
  } catch (err) {
    console.error('DB Init Error:', err);
  } finally {
    conn.release();
  }
}
initDB();

// -------------------- ADMIN AUTH --------------------
function isAdmin(req, res, next) {
  if (req.session.admin) return next();
  res.status(403).json({ success: false, message: 'Access denied. Please log in.' });
}

app.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM admins WHERE email=?', [email]);
    if (!rows.length || rows[0].password !== password)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    req.session.admin = { id: rows[0].id, email: rows[0].email };
    res.json({ success: true, message: 'Logged in successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/admin/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ success: false, message: 'Logout failed' });
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// -------------------- ADMIN ROUTES --------------------
app.get('/admin/rooms', isAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM rooms ORDER BY FIELD(status,"Available","Booked") ASC, id DESC');
    res.json({ success: true, rooms: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

app.post('/admin/rooms', isAdmin, async (req, res) => {
  const { name, price } = req.body;
  if (!name || !price) return res.status(400).json({ success: false, message: 'Name and price required' });
  try {
    const [result] = await pool.query('INSERT INTO rooms (name, price) VALUES (?, ?)', [name, price]);
    res.json({ success: true, message: 'Room added', roomId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

app.delete('/admin/rooms/:id', isAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid room ID' });
  try {
    const [bookings] = await pool.query('SELECT * FROM room_bookings WHERE room_id=? AND status="pending"', [id]);
    if (bookings.length) return res.status(400).json({ success: false, message: 'Cannot delete room with active bookings' });
    const [result] = await pool.query('DELETE FROM rooms WHERE id=?', [id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Room not found' });
    res.json({ success: true, message: 'Room deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

app.post('/admin/rooms/:id/available', isAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid room ID' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [room] = await conn.query('SELECT * FROM rooms WHERE id=? FOR UPDATE', [id]);
    if (!room.length) { await conn.rollback(); return res.status(404).json({ success: false, message: 'Room not found' }); }
    await conn.query('UPDATE rooms SET status="Available" WHERE id=?', [id]);
    await conn.commit();
    res.json({ success: true, message: 'Room status updated', room: { ...room[0], status: 'Available' } });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: 'Database error' });
  } finally {
    conn.release();
  }
});

// -------------------- FETCH BOOKINGS --------------------
app.get('/admin/bookings', isAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT b.id, u.name AS user_name, r.name AS room_name, b.name AS guest_name, b.email, b.checkin, b.checkout, b.status
      FROM room_bookings b
      LEFT JOIN users u ON b.user_id=u.id
      LEFT JOIN rooms r ON b.room_id=r.id
    `);
    res.json({ success: true, bookings: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

app.get('/admin/service-bookings', isAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT sb.id, u.name AS user_name, s.name AS service_name, sb.name AS guest_name, sb.email, sb.booking_date, sb.status, sb.payment_status
      FROM service_bookings sb
      LEFT JOIN users u ON sb.user_id=u.id
      LEFT JOIN services s ON sb.service_id=s.id
    `);
    res.json({ success: true, bookings: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// -------------------- CUSTOMER ROUTES --------------------
app.get('/rooms', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, price, status FROM rooms ORDER BY FIELD(status,"Available","Booked") ASC, id DESC');
    res.json({ success: true, rooms: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error fetching rooms' });
  }
});

// -------------------- ROOM BOOKING --------------------
app.post('/book', async (req, res) => {
  const { name, email, roomId, checkin, checkout } = req.body;
  if (!name || !email || !roomId || !checkin || !checkout)
    return res.status(400).json({ success: false, message: 'All fields are required' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [roomRows] = await conn.query('SELECT * FROM rooms WHERE id=? FOR UPDATE', [roomId]);
    if (!roomRows.length) { await conn.rollback(); return res.status(404).json({ success: false, message: 'Room not found' }); }
    if (roomRows[0].status === 'Booked') { await conn.rollback(); return res.status(400).json({ success: false, message: 'Room already booked' }); }

    // Check or create user
    const [users] = await conn.query('SELECT id FROM users WHERE email=?', [email]);
    let userId;
    if (users.length) {
      userId = users[0].id;
    } else {
      const [userResult] = await conn.query('INSERT INTO users (name, email) VALUES (?, ?)', [name, email]);
      userId = userResult.insertId;
    }

    // Insert booking
    await conn.query(
      'INSERT INTO room_bookings (user_id, room_id, name, email, checkin, checkout, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, roomId, name, email, checkin, checkout, 'confirmed']
    );

    // Update room status
    await conn.query('UPDATE rooms SET status="Booked" WHERE id=?', [roomId]);

    await conn.commit();
    res.json({ success: true, message: 'Room booked successfully!' });

  } catch (err) {
    await conn.rollback();
    console.error('Booking error:', err);
    res.status(500).json({ success: false, message: 'Booking failed. Check server logs.' });
  } finally {
    conn.release();
  }
});

// -------------------- SERVICE BOOKING --------------------
app.post('/book-service', async (req, res) => {
  const { name, email, serviceId, bookingDate } = req.body;
  if (!name || !email || !serviceId || !bookingDate)
    return res.status(400).json({ success: false, message: 'All fields are required' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Check or create user
    const [users] = await conn.query('SELECT id FROM users WHERE email=?', [email]);
    let userId;
    if (users.length) {
      userId = users[0].id;
    } else {
      const [userResult] = await conn.query('INSERT INTO users (name, email) VALUES (?, ?)', [name, email]);
      userId = userResult.insertId;
    }

    // Insert service booking
    await conn.query(
      'INSERT INTO service_bookings (user_id, service_id, name, email, booking_date, status) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, serviceId, name, email, bookingDate, 'pending']
    );

    await conn.commit();
    res.json({ success: true, message: 'Service booked successfully!' });

  } catch (err) {
    await conn.rollback();
    console.error('Service booking error:', err);
    res.status(500).json({ success: false, message: 'Service booking failed. Check server logs.' });
  } finally {
    conn.release();
  }
});

// -------------------- STATIC FILES --------------------
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// -------------------- START SERVER --------------------
app.listen(PORT, () => console.log(`🚀 Hotel server running on http://localhost:${PORT}`));
