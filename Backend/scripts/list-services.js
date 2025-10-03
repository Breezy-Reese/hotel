const mongoose = require('mongoose');

const uri = "mongodb+srv://basil59mutuku_db_user:cjq6UZRoK2Bg4cYX@plp.ycdlukc.mongodb.net/hoteldb?retryWrites=true&w=majority&appName=PLP";

const serviceSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true },
  category: String,
  price: Number,
  description: String,
  createdAt: { type: Date, default: Date.now }
});

const Service = mongoose.model("Service", serviceSchema);

async function listServices() {
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  const services = await Service.find({}, { name: 1, category: 1, _id: 0 });
  console.log("Services:");
  services.forEach((service, index) => {
    console.log(`${index + 1}: ${service.name} (${service.category})`);
  });

  mongoose.disconnect();
}

listServices().catch(err => {
  console.error(err);
  mongoose.disconnect();
});
