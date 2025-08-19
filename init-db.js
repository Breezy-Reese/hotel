const sqlite3 = require('sqlite3').verbose();

// Open the database (or create it if not exists)
const db = new sqlite3.Database('bookings.db');

// Create tables
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

  // Insert default admin if not exists
  db.get(`SELECT COUNT(*) as count FROM admins`, (err, row) => {
    if (err) {
      console.error("❌ Error checking admins:", err);
      return;
    }
    if (row.count === 0) {
      db.run(`INSERT INTO admins(username, password) VALUES (?, ?)`, ["admin", "admin123"]);
      console.log("✅ Default admin created (username: admin, password: admin123)");
    } else {
      console.log("ℹ️ Admin already exists.");
    }
  });
});

db.close();
