const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
require('dotenv').config(); // load .env file

const app = express();
const PORT = process.env.PORT || 4242;

// -------------------- MIDDLEWARE --------------------
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
app.use(session({
  secret: 'hotel-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// -------------------- MONGO CONNECTION --------------------
const uri = "mongodb+srv://basil59mutuku_db_user:cjq6UZRoK2Bg4cYX@plp.ycdlukc.mongodb.net/hoteldb?retryWrites=true&w=majority&appName=PLP";

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err));

// -------------------- SCHEMAS --------------------
const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  status: { type: String, enum: ["Available", "Booked"], default: "Available" },
  createdAt: { type: Date, default: Date.now }
});

const adminSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true }
});

const guestSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true }
});

const roomBookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "Guest" },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
  name: String,
  email: String,
  checkin: Date,
  checkout: Date,
  status: { type: String, enum: ["pending", "confirmed", "completed", "cancelled"], default: "pending" },
  payment_status: { type: String, enum: ["paid", "unpaid"], default: "unpaid" }
});

const serviceSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true },
  category: String,
  price: Number,
  description: String,
  createdAt: { type: Date, default: Date.now }
});

const serviceBookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "Guest" },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
  name: String,
  email: String,
  booking_date: Date,
  status: { type: String, enum: ["pending", "confirmed", "completed", "cancelled"], default: "pending" },
  payment_status: { type: String, enum: ["paid", "unpaid"], default: "unpaid" }
});

// -------------------- MODELS --------------------
const Room = mongoose.model("Room", roomSchema);
const Admin = mongoose.model("Admin", adminSchema);
const Guest = mongoose.model("Guest", guestSchema);
const RoomBooking = mongoose.model("RoomBooking", roomBookingSchema);
const Service = mongoose.model("Service", serviceSchema);
const ServiceBooking = mongoose.model("ServiceBooking", serviceBookingSchema);

// -------------------- AUTH --------------------
function isAdmin(req, res, next) {
  if (req.session.admin) return next();
  res.status(403).json({ success: false, message: 'Access denied. Please log in.' });
}

app.post("/admin/login", async (req, res) => {
  let { email, password } = req.body;
  console.log("Login attempt with email:", email);
  email = email.toLowerCase().trim();
  try {
    const admin = await Admin.findOne({ email });
    console.log("Admin found:", admin);
    if (!admin) {
      console.log("Admin user not found");
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
      console.log("Password mismatch");
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
    req.session.admin = { id: admin._id, email: admin.email };
    res.json({ success: true });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/admin/bookings", isAdmin, async (req, res) => {
  try {
    const bookings = await RoomBooking.find({}).populate('userId', 'name').populate('roomId', 'name');
    const formatted = bookings.map(b => ({
      id: b._id,
      room_name: b.roomId ? b.roomId.name : 'Deleted',
      guest_name: b.userId ? b.userId.name : null,
      booking_name: b.name,
      email: b.email,
      checkin: b.checkin,
      checkout: b.checkout,
      status: b.status,
      payment_status: b.payment_status
    }));
    res.json({ bookings: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/admin/service-bookings", isAdmin, async (req, res) => {
  try {
    const bookings = await ServiceBooking.find({}).populate('userId', 'name').populate('serviceId', 'name category');
    const formatted = bookings.map(b => ({
      id: b._id,
      guest_name: b.userId ? b.userId.name : null,
      booking_name: b.name,
      service_name: b.serviceId ? b.serviceId.name : 'Not Selected',
      service_category: b.serviceId ? b.serviceId.category : 'N/A',
      email: b.email,
      booking_date: b.booking_date,
      status: b.status,
      payment_status: b.payment_status
    }));
    res.json({ bookings: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/admin/rooms", isAdmin, async (req, res) => {
  try {
    const rooms = await Room.find({});
    const formatted = rooms.map(r => ({
      id: r._id,
      name: r.name,
      price: r.price,
      status: r.status
    }));
    res.json({ rooms: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/admin/rooms", isAdmin, async (req, res) => {
  try {
    const { name, price } = req.body;
    const room = new Room({ name, price });
    await room.save();
    res.json({ room: { id: room._id, name: room.name, price: room.price, status: room.status } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.delete("/admin/rooms/:id", isAdmin, async (req, res) => {
  try {
    await Room.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/admin/rooms/:id/available", isAdmin, async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, { status: "Available" }, { new: true });
    res.json({ room: { id: room._id, name: room.name, price: room.price, status: room.status } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/admin/services", isAdmin, async (req, res) => {
  try {
    const services = await Service.find({});
    const formatted = services.map(s => ({
      id: s._id,
      name: s.name,
      category: s.category,
      price: s.price,
      description: s.description
    }));
    res.json({ services: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/book", async (req, res) => {
  try {
    const { name, email, roomId, checkin, checkout } = req.body;
    let guest = await Guest.findOne({ email });
    if (!guest) {
      guest = new Guest({ name, email });
      await guest.save();
    }
    const roomBooking = new RoomBooking({
      userId: guest._id,
      roomId,
      name,
      email,
      checkin: new Date(checkin),
      checkout: new Date(checkout)
    });
    await roomBooking.save();
    // Optionally update room status to Booked
    await Room.findByIdAndUpdate(roomId, { status: "Booked" });
    res.json({ success: true, message: "Room booked successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/book-service", async (req, res) => {
  try {
    let { name, email, serviceId, bookingDate } = req.body;
    const categoryMap = {
      1: "Restaurant",
      2: "Spa",
      3: "Pool",
      4: "Gym",
      5: "Event"
    };
    if (typeof serviceId === 'number') {
      if (serviceId <= 22) {
        const services = await Service.find({});
        if (serviceId < 1 || serviceId > services.length) {
          return res.status(400).json({ success: false, message: "Invalid service ID" });
        }
        serviceId = services[serviceId - 1]._id;
      } else {
        const categoryIndex = Math.floor(serviceId / 10);
        const subIndex = serviceId % 10;
        if (!categoryMap[categoryIndex]) {
          return res.status(400).json({ success: false, message: "Invalid service ID" });
        }
        const category = categoryMap[categoryIndex];
        const servicesInCategory = await Service.find({ category }).sort({ name: 1 });
        if (subIndex < 1 || subIndex > servicesInCategory.length) {
          return res.status(400).json({ success: false, message: "Invalid service ID" });
        }
        serviceId = servicesInCategory[subIndex - 1]._id;
      }
    } else if (typeof serviceId === 'string') {
      const service = await Service.findOne({ name: serviceId });
      if (!service) {
        return res.status(400).json({ success: false, message: "Invalid service name" });
      }
      serviceId = service._id;
    }
    let guest = await Guest.findOne({ email });
    if (!guest) {
      guest = new Guest({ name, email });
      await guest.save();
    }
    const serviceBooking = new ServiceBooking({
      userId: guest._id,
      serviceId,
      name,
      email,
      booking_date: new Date(bookingDate)
    });
    await serviceBooking.save();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/rooms", async (req, res) => {
  try {
    const rooms = await Room.find({});
    res.json({ rooms });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/admin/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ success: false, message: "Logout failed" });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// -------------------- STATIC FILES --------------------
app.use(express.static(path.join(__dirname, "public")));
app.use("/admin", express.static(path.join(__dirname, "admin")));

// -------------------- START SERVER --------------------
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
