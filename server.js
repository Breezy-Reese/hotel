const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4242;

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

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

// Initialize DB
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

    await conn.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        room_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        checkin DATE NOT NULL,
        checkout DATE NOT NULL,
        FOREIGN KEY (room_id) REFERENCES rooms(id)
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
        ('Family Suite', 300, 'Available'),
        ('Presidential Suite', 500, 'Available'),
        ('Economy Room', 80, 'Booked'),
        ('Business Suite', 350, 'Available'),
        ('Penthouse Suite', 600, 'Available'),
        ('Luxury Suite', 800, 'Available'),
        ('Honeymoon Suite', 400, 'Available'),
        ('Garden Room', 120, 'Available')
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

// Fetch rooms
app.get('/rooms', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM rooms');
    res.json({ success: true, rooms: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error fetching rooms' });
  }
});

// Robust Book route with transaction
app.post('/book', async (req, res) => {
  const { name, email, roomId, checkin, checkout } = req.body;

  if (!name || !email || !roomId || !checkin || !checkout) {
    return res.json({ success: false, message: 'All fields are required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Check room availability
    const [roomRows] = await conn.query('SELECT status FROM rooms WHERE id=? FOR UPDATE', [roomId]);
    if (roomRows.length === 0) {
      await conn.rollback();
      return res.json({ success: false, message: 'Room not found' });
    }
    if (roomRows[0].status === 'Booked') {
      await conn.rollback();
      return res.json({ success: false, message: 'Room already booked' });
    }

    // Insert booking
    await conn.query(
      'INSERT INTO bookings (room_id, name, email, checkin, checkout) VALUES (?, ?, ?, ?, ?)',
      [roomId, name, email, checkin, checkout]
    );

    // Update room status
    await conn.query('UPDATE rooms SET status="Booked" WHERE id=?', [roomId]);

    await conn.commit();
    res.json({ success: true, message: 'Room booked successfully!' });
  } catch (err) {
    await conn.rollback();
    console.error('Booking Error:', err);
    res.status(500).json({ success: false, message: 'Booking failed. Check server logs.' });
  } finally {
    conn.release();
  }
});

// Book a service (dummy payment for now)
app.post('/book-service', async (req, res) => {
  const { name, email, serviceId, bookingDate } = req.body;

  if (!name || !email || !serviceId || !bookingDate) {
    return res.json({ success: false, message: 'All fields are required' });
  }

  try {
    console.log('Service booking:', { name, email, serviceId, bookingDate });

    // No services table defined in DB; simulate success
    res.json({ success: true, message: 'Service booked successfully!' });
  } catch (err) {
    console.error('Service Booking Error:', err);
    res.status(500).json({ success: false, message: 'Payment failed. Check server logs.' });
  }
});


app.listen(PORT, () => {
  console.log(`🚀 Hotel server running on http://localhost:${PORT}`);
});
