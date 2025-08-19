const sqlite3 = require('sqlite3').verbose();

// Open the same DB your server is using
const db = new sqlite3.Database('bookings.db');

db.all("SELECT * FROM admins", (err, rows) => {
  if (err) {
    console.error("❌ Error:", err.message);
  } else {
    console.log("✅ Admins table content:", rows);
  }
  db.close();
});
