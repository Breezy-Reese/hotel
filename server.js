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

    // Create rooms table if missing
    await conn.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        status ENUM('Available','Booked') DEFAULT 'Available'
      )
    `);

    // No need to create bookings table since we use room_bookings
    // Seed sample rooms
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
    console.error('Rooms Fetch Error:', err);
    res.status(500).json({ success: false, message: 'Error fetching rooms' });
  }
});

// Book route
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

    // Insert booking into correct table
    await conn.query(
  'INSERT INTO room_bookings (user_id, room_id, name, email, checkin, checkout) VALUES (?, ?, ?, ?, ?, ?)',
  [1, roomId, name, email, checkin, checkout] // 1 = Guest User ID
);

    console.log('Booking saved:', { name, email, roomId, checkin, checkout });

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

// Service booking
app.post('/book-service', async (req, res) => {
  const { name, email, serviceId, bookingDate } = req.body;

  if (!name || !email || !serviceId || !bookingDate) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO service_bookings 
      (name, email, user_id, service_id, booking_date, status) 
      VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, 1, serviceId, bookingDate, 'pending']
    );

    // Confirm that one row was inserted
    if (result.affectedRows === 1) {
      return res.json({ success: true, message: 'Service booked successfully!' });
    } else {
      return res.status(500).json({ success: false, message: 'Booking failed to save.' });
    }
  } catch (err) {
    console.error('Service Booking Error:', err);
    return res.status(500).json({ success: false, message: 'Database error. Check logs.' });
  }
});


// Start server
app.listen(PORT, () => {
  console.log(`🚀 Hotel server running on http://localhost:${PORT}`);
});
