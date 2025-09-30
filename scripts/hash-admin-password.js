const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const uri = "mongodb+srv://basil59mutuku_db_user:cjq6UZRoK2Bg4cYX@plp.ycdlukc.mongodb.net/hoteldb?retryWrites=true&w=majority&appName=PLP";

const adminSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true }
});

const Admin = mongoose.model("Admin", adminSchema);

async function hashAdminPassword(email, plainPassword) {
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

  const admin = await Admin.findOne({ email });
  if (!admin) {
    console.log(`Admin with email ${email} not found.`);
    process.exit(1);
  }

  admin.password = hashedPassword;
  await admin.save();
  console.log(`Password for admin ${email} has been hashed and updated.`);

  mongoose.disconnect();
}

// Replace with your admin email and current plain password
const adminEmail = "basil59mutuku@gmail.com";
const currentPlainPassword = "#Basil123";

hashAdminPassword(adminEmail, currentPlainPassword).catch(err => {
  console.error(err);
  mongoose.disconnect();
});
