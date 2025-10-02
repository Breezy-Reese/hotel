const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const bodyParser = require("body-parser");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4242;

// ------------------ DB CONNECTION ------------------
const uri = process.env.MONGO_URI || "mongodb+srv://basil59mutuku_db_user:cjq6UZRoK2Bg4cYX@plp.ycdlukc.mongodb.net/hoteldb?retryWrites=true&w=majority&appName=PLP";
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => console.log("✅ MongoDB Connected"));

// ------------------ SCHEMAS ------------------
const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  status: { type: String, enum: ["Available", "Booked"], default: "Available" },
  createdAt: { type: Date, default: Date.now },
});

const adminSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
});

const guestSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: String, // Added phone field
});

const roomBookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "Guest" },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
  name: String,
  email: String,
  phone: String,
  checkin: Date,
  checkout: Date,
  status: { type: String, enum: ["pending", "confirmed", "completed", "cancelled"], default: "pending" },
  payment_status: { type: String, enum: ["paid", "unpaid"], default: "unpaid" },
});

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

const serviceBookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "Guest" },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
  name: String,
  email: String,
  phone: String, // Added phone field
  booking_date: Date,
  status: { type: String, enum: ["pending", "confirmed", "completed", "cancelled"], default: "pending" },
  payment_status: { type: String, enum: ["paid", "unpaid"], default: "unpaid" },
});

// ------------------ MODELS ------------------
const Room = mongoose.model("Room", roomSchema);
const Admin = mongoose.model("Admin", adminSchema);
const Guest = mongoose.model("Guest", guestSchema);
const RoomBooking = mongoose.model("RoomBooking", roomBookingSchema);
const Service = mongoose.model("Service", serviceSchema);
const ServiceBooking = mongoose.model("ServiceBooking", serviceBookingSchema);

// ------------------ MIDDLEWARE ------------------
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: "hotel-secret-key",
  resave: false,
  saveUninitialized: true,
  rolling: true,
  store: MongoStore.create({ mongoUrl: uri }),
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 },
}));

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));
app.use("/admin", express.static(path.join(__dirname, "admin")));

// ------------------ AUTH MIDDLEWARE ------------------
function isAdmin(req, res, next) {
  if (req.session && req.session.admin) return next();
  res.status(403).json({ success: false, message: "Unauthorized" });
}

// ------------------ ADMIN AUTH ------------------
const bcrypt = require("bcrypt");

app.post("/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (!admin) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const passwordMatch = await bcrypt.compare(password, admin.password);
    if (!passwordMatch) return res.status(401).json({ success: false, message: "Invalid credentials" });

    req.session.admin = { id: admin._id, email: admin.email };
    res.json({ success: true, message: "Logged in successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/admin/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ success: false, message: "Logout failed" });
    res.clearCookie("connect.sid");
    res.json({ success: true, message: "Logged out successfully" });
  });
});

// ------------------ ROOMS ------------------
app.get("/admin/rooms", isAdmin, async (req, res) => {
  try {
    const rooms = await Room.find();
    res.json({ rooms });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/admin/rooms", isAdmin, async (req, res) => {
  try {
    const { name, price } = req.body;
    if (!name || !price) return res.status(400).json({ success: false, message: "Name and price required" });
    const room = new Room({ name, price });
    await room.save();
    res.json({ success: true, room, message: "Room added successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ------------------ ROOM BOOKING ------------------
app.post("/book", async (req, res) => {
  try {
    const { name, email, phone, roomId, checkin, checkout } = req.body;
    if (!name || !email || !roomId || !checkin || !checkout) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const room = await Room.findById(roomId);
    if (!room || room.status !== "Available") return res.status(400).json({ success: false, message: "Room not available" });

    let guest = await Guest.findOne({ email: email.toLowerCase() });
    if (!guest) {
      guest = new Guest({ name, email: email.toLowerCase(), phone });
      await guest.save();
    }

    const booking = new RoomBooking({
      userId: guest._id,
      roomId,
      name,
      email: email.toLowerCase(),
      phone,
      checkin: new Date(checkin),
      checkout: new Date(checkout),
    });
    await booking.save();

    room.status = "Booked";
    await room.save();

    res.json({ success: true, message: "Room booked successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ------------------ SERVICES ------------------
app.get("/admin/services", isAdmin, async (req, res) => {
  try {
    const services = await Service.find();
    res.json({ services });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/admin/services", isAdmin, async (req, res) => {
  try {
    const { name, category, price } = req.body;
    if (!name || !category || !price) return res.status(400).json({ success: false, message: "Name, category and price required" });
    const service = new Service({ name, category, price });
    await service.save();
    res.json({ success: true, service, message: "Service added successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ------------------ SERVICE BOOKING ------------------
app.post("/book-service", async (req, res) => {
  try {
    const { name, email, phone, serviceId, bookingDate } = req.body;
    if (!name || !email || !serviceId || !bookingDate) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const service = await Service.findById(serviceId);
    if (!service) return res.status(400).json({ success: false, message: "Service not found" });

    let guest = await Guest.findOne({ email: email.toLowerCase() });
    if (!guest) {
      guest = new Guest({ name, email: email.toLowerCase(), phone });
      await guest.save();
    }

    const booking = new ServiceBooking({
      userId: guest._id,
      serviceId,
      name,
      email: email.toLowerCase(),
      phone,
      booking_date: new Date(bookingDate),
      payment_status: "unpaid",
    });
    await booking.save();

    res.json({ success: true, message: "Service booked successfully!" });
  } catch (err) {
    console.error("Error in /book-service:", err);
    res.status(500).json({ success: false, message: "Server error: " + err.message });
  }
});

// ------------------ ADMIN VIEW BOOKINGS ------------------
app.get("/admin/bookings", isAdmin, async (req, res) => {
  try {
    const bookings = await RoomBooking.find({})
      .populate("userId", "name email phone")
      .populate("roomId", "name");
    
    const formatted = bookings.map(b => ({
      id: b._id,
      room_name: b.roomId ? b.roomId.name : "Deleted",
      guest_name: b.userId ? b.userId.name : b.name || "Unknown",
      email: b.userId ? b.userId.email : b.email || "",
      phone: b.userId ? b.userId.phone : b.phone || "",
      checkin: b.checkin ? b.checkin.toISOString() : null,
      checkout: b.checkout ? b.checkout.toISOString() : null,
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
    const bookings = await ServiceBooking.find({})
      .populate("userId", "name email phone")
      .populate("serviceId", "name category");

    const formatted = bookings.map(b => ({
      _id: b._id,
      guest_name: b.userId ? b.userId.name : b.name || "Unknown",
      email: b.userId ? b.userId.email : b.email || "",
      phone: b.userId ? b.userId.phone : b.phone || "",
      service_name: b.serviceId ? b.serviceId.name : "Deleted",
      service_category: b.serviceId ? b.serviceId.category : "N/A",
      booking_date: b.booking_date ? b.booking_date.toISOString() : null,
      status: b.status,
      payment_status: b.payment_status
    }));

    res.json({ bookings: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ------------------ START SERVER ------------------
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
