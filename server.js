const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 4242;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Database
const db = new sqlite3.Database('bookings.db', (err) => {
  if (err) console.error("❌ Error opening database:", err);
  else console.log("✅ Connected to SQLite database");
});

// Create tables + default admin
db.serialize(() => {
  // Bookings table
  db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      checkin TEXT NOT NULL,
      checkout TEXT NOT NULL,
      room_type TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Admins table
  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    );
  `);

  // Insert default admin if none exists
  db.get(`SELECT COUNT(*) AS count FROM admins`, (err, row) => {
    if (err) {
      console.error("❌ Error checking admins table:", err);
    } else if (row.count === 0) {
      // hash default password
      const defaultPass = "admin123";
      bcrypt.hash(defaultPass, 10, (err, hash) => {
        if (err) return console.error("❌ Error hashing password:", err);

        db.run(
          `INSERT INTO admins(username, password) VALUES (?, ?)`,
          ["admin", hash],
          (err) => {
            if (err) console.error("❌ Error inserting default admin:", err);
            else console.log("✅ Default admin added (username: admin, password: admin123)");
          }
        );
      });
    } else {
      console.log("ℹ️ Admin already exists in database");
    }
  });
});

// Booking route
app.post('/book', (req, res) => {
  const { name, email, checkin, checkout, room } = req.body;
  if (!name || !email || !checkin || !checkout || !room) {
    return res.status(400).send('❌ Missing required fields');
  }

  db.run(
    `INSERT INTO bookings(name,email,checkin,checkout,room_type) VALUES (?,?,?,?,?)`,
    [name, email, checkin, checkout, room],
    function (err) {
      if (err) {
        console.error("❌ Database error:", err);
        return res.status(500).send('Database error');
      }
      console.log(`✅ Booking saved for ${name} (${email})`);
      res.redirect('/success.html');
    }
  );
});

// Admin login route (with bcrypt)
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send("❌ Please enter username and password");
  }

  db.get(
    `SELECT * FROM admins WHERE username = ?`,
    [username],
    (err, row) => {
      if (err) {
        console.error("❌ Database error:", err);
        return res.status(500).send('Database error');
      }
      if (!row) {
        console.warn(`⚠️ Failed login attempt for user: ${username}`);
        return res.status(401).send('Invalid credentials');
      }

      // compare entered password with hashed password
      bcrypt.compare(password, row.password, (err, result) => {
        if (err) {
          console.error("❌ Error comparing passwords:", err);
          return res.status(500).send("Internal error");
        }
        if (!result) {
          console.warn(`⚠️ Wrong password for user: ${username}`);
          return res.status(401).send("Invalid credentials");
        }

        console.log(`✅ Admin ${username} logged in successfully`);
        res.redirect('/dashboard.html');
      });
    }
  );
});

// Admin: get all bookings
app.get('/api/bookings', (req, res) => {
  db.all(`SELECT * FROM bookings ORDER BY created_at DESC`, (err, rows) => {
    if (err) {
      console.error("❌ Error fetching bookings:", err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Serve pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/success.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
