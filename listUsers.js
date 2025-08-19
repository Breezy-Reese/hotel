// listUsers.js
const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./hotel.db");

db.all("SELECT id, username, password FROM users", [], (err, rows) => {
  if (err) {
    console.error("❌ Error reading users:", err.message);
  } else {
    console.log("👤 Users in DB:");
    console.table(rows);
  }
  db.close();
});
