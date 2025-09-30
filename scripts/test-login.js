const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const uri = "mongodb+srv://basil59mutuku_db_user:cjq6UZRoK2Bg4cYX@plp.ycdlukc.mongodb.net/hoteldb?retryWrites=true&w=majority&appName=PLP";

const adminSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true }
});

const Admin = mongoose.model("Admin", adminSchema);

async function testLogin(email, password) {
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  email = email.toLowerCase().trim();
  const admin = await Admin.findOne({ email });
  if (!admin) {
    console.log("Admin not found");
    mongoose.disconnect();
    return;
  }

  const match = await bcrypt.compare(password, admin.password);
  console.log("Password match:", match);

  mongoose.disconnect();
}

// Test with correct password
testLogin("basil59mutuku@gmail.com", "#Basil123");

// Test with incorrect password
testLogin("basil59mutuku@gmail.com", "#WrongPassword");

// Test with non-existent admin
testLogin("nonexistentadmin@gmail.com", "#Basil123");
