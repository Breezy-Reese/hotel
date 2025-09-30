const mongoose = require('mongoose');

const uri = "mongodb+srv://basil59mutuku_db_user:cjq6UZRoK2Bg4cYX@plp.ycdlukc.mongodb.net/hoteldb?retryWrites=true&w=majority&appName=PLP";

const adminSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true }
});

const Admin = mongoose.model("Admin", adminSchema);

async function listAdminUsers() {
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  const admins = await Admin.find({}, { email: 1, _id: 0 });
  console.log("Admin users:");
  admins.forEach(admin => {
    console.log(admin.email);
  });

  mongoose.disconnect();
}

listAdminUsers().catch(err => {
  console.error(err);
  mongoose.disconnect();
});
