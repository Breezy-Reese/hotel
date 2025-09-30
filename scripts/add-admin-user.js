const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const uri = "mongodb+srv://basil59mutuku_db_user:cjq6UZRoK2Bg4cYX@plp.ycdlukc.mongodb.net/hoteldb?retryWrites=true&w=majority&appName=PLP";

const adminSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true }
});

const Admin = mongoose.model("Admin", adminSchema);

async function addAdminUser(email, plainPassword) {
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  const existingAdmin = await Admin.findOne({ email });
  if (existingAdmin) {
    console.log(`Admin with email ${email} already exists.`);
    mongoose.disconnect();
    return;
  }

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

  const newAdmin = new Admin({
    email,
    password: hashedPassword
  });

  await newAdmin.save();
  console.log(`Admin user ${email} has been added successfully.`);

  mongoose.disconnect();
}

// Add basil59mutuku@gmail.com as admin
const adminEmail = "basil59mutuku@gmail.com";
const plainPassword = "#Basil123";

addAdminUser(adminEmail, plainPassword).catch(err => {
  console.error(err);
  mongoose.disconnect();
});
