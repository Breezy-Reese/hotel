const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const db = new sqlite3.Database('bookings.db');

const newPassword = "admin123"; // your new password
bcrypt.hash(newPassword, 10, (err, hash) => {
  if (err) throw err;
  db.run("UPDATE admins SET password = ? WHERE username = ?", [hash, "admin"], (err) => {
    if (err) throw err;
    console.log("✅ Admin password reset to:", newPassword);
    db.close();
  });
});
