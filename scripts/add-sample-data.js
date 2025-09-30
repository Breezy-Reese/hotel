const mongoose = require('mongoose');

const uri = "mongodb+srv://basil59mutuku_db_user:cjq6UZRoK2Bg4cYX@plp.ycdlukc.mongodb.net/hoteldb?retryWrites=true&w=majority&appName=PLP";

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  status: { type: String, enum: ["Available", "Booked"], default: "Available" },
  createdAt: { type: Date, default: Date.now }
});

const serviceSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true },
  category: String,
  price: Number,
  description: String,
  createdAt: { type: Date, default: Date.now }
});

const Room = mongoose.model("Room", roomSchema);
const Service = mongoose.model("Service", serviceSchema);

async function addSampleData() {
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  // Add sample rooms
  const rooms = [
    { name: 'Deluxe Suite', price: 25000 },
    { name: 'Standard Room', price: 15000 },
    { name: 'Single Room', price: 10000 },
    { name: 'Double Room', price: 18000 },
    { name: 'Family Suite', price: 30000 },
    { name: 'Presidential Suite', price: 50000 },
    { name: 'Economy Room', price: 1000 },
    { name: 'Luxury Suite', price: 40000 },
    { name: 'Honeymoon Suite', price: 35000 },
    { name: 'Business Room', price: 22000 },
    { name: 'Ocean View Room', price: 30000 },
    { name: 'Garden View Room', price: 20000 },
    { name: 'Penthouse Suite', price: 60000 }
  ];

  for (const roomData of rooms) {
    const existing = await Room.findOne({ name: roomData.name });
    if (!existing) {
      const room = new Room(roomData);
      await room.save();
      console.log(`Added room: ${roomData.name}`);
    }
  }

  // Add sample services
  const services = [
    // Restaurant
    { name: 'Grilled Salmon', category: 'Restaurant', price: 1200, description: 'Delicious grilled salmon served with vegetables' },
    { name: 'Beef Steak', category: 'Restaurant', price: 1500, description: 'Juicy beef steak cooked to perfection' },
    { name: 'Caesar Salad', category: 'Restaurant', price: 800, description: 'Fresh Caesar salad with croutons and parmesan' },
    { name: 'Pasta Primavera', category: 'Restaurant', price: 900, description: 'Pasta with fresh seasonal vegetables' },
    { name: 'Chocolate Cake', category: 'Restaurant', price: 600, description: 'Rich chocolate cake dessert' },
    { name: 'Fruit Smoothie', category: 'Restaurant', price: 500, description: 'Refreshing mixed fruit smoothie' },
    // Spa
    { name: 'Swedish Massage', category: 'Spa', price: 2500, description: 'Relaxing full-body Swedish massage' },
    { name: 'Aromatherapy', category: 'Spa', price: 2000, description: 'Soothing aromatherapy treatment' },
    { name: 'Hot Stone Therapy', category: 'Spa', price: 3000, description: 'Therapeutic hot stone massage' },
    { name: 'Facial Treatment', category: 'Spa', price: 1800, description: 'Rejuvenating facial treatment' },
    // Gym
    { name: 'Treadmill Rental', category: 'Gym', price: 500, description: 'Hourly treadmill rental' },
    { name: 'Dumbbells Rental', category: 'Gym', price: 300, description: 'Set of dumbbells for exercise' },
    { name: 'Exercise Bike', category: 'Gym', price: 400, description: 'Hourly exercise bike rental' },
    { name: 'Rowing Machine', category: 'Gym', price: 450, description: 'Hourly rowing machine rental' },
    // Event
    { name: 'Wedding Hall Booking', category: 'Event', price: 20000, description: 'Full wedding hall booking' },
    { name: 'Conference Room Booking', category: 'Event', price: 15000, description: 'Conference room for meetings' },
    { name: 'Birthday Party Package', category: 'Event', price: 12000, description: 'Birthday celebration package' },
    { name: 'Exhibition Hall Rental', category: 'Event', price: 25000, description: 'Exhibition hall rental for events' },
    // Pool
    { name: 'Pool Party (2 hrs)', category: 'Pool', price: 5000, description: 'Private pool party for 2 hours' },
    { name: 'Family Swim Session', category: 'Pool', price: 3000, description: 'Family swimming session' },
    { name: 'Night Swim Event', category: 'Pool', price: 7000, description: 'Evening/night swimming event' },
    { name: 'Private Pool Rental', category: 'Pool', price: 10000, description: 'Exclusive pool rental for private events' }
  ];

  for (const serviceData of services) {
    const existing = await Service.findOne({ name: serviceData.name });
    if (!existing) {
      const service = new Service(serviceData);
      await service.save();
      console.log(`Added service: ${serviceData.name}`);
    }
  }

  console.log('Sample data added successfully');
  mongoose.disconnect();
}

addSampleData().catch(err => {
  console.error(err);
  mongoose.disconnect();
});
