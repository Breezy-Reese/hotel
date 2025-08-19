// seedAdmin.js
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");

const db = new sqlite3.Database("hotel.db");

const username = "admin";
const plainPassword = "12345"; // test password

// First make sure the users table exists
db.run(
  `CREATE TABLE IF NOT EXISTS users (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     username TEXT UNIQUE,
     password TEXT
   )`,
  (err) => {
    if (err) throw err;

    // Now hash the password
    bcrypt.hash(plainPassword, 10, (err, hash) => {
      if (err) throw err;

      // Insert the admin user
      db.run(
        "INSERT INTO users (username, password) VALUES (?, ?)",
        [username, hash],
        function (err) {
          if (err) {
            console.error("Error inserting admin:", err.message);
          } else {
            console.log(
              "✅ Admin user created with username:",
              username,
              "and password:",
              plainPassword
            );
          }
          db.close();
        }
      );
    });
  }
);
