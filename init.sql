-- ==========================
-- Database: hoteldb
-- ==========================

CREATE DATABASE IF NOT EXISTS hoteldb;
USE hoteldb;

-- ==========================
-- Users Table
-- ==========================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('user','admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample admin
INSERT INTO users (name, email, password, role) VALUES
('Admin', 'admin@hotel.com', 'adminpassword', 'admin');

-- ==========================
-- Rooms Table
-- ==========================
CREATE TABLE rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL, -- price in KES
    status ENUM('Available','Booked','Maintenance') DEFAULT 'Available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert hotel rooms (prices in KES)
INSERT INTO rooms (name, price, status) VALUES
('Deluxe Suite', 25000, 'Available'),
('Standard Room', 15000, 'Available'),
('Single Room', 10000, 'Available'),
('Double Room', 18000, 'Available'),
('Family Suite', 30000, 'Available'),
('Presidential Suite', 50000, 'Available'),
('Economy Room', 1000, 'Available'),
('Luxury Suite', 40000, 'Available'),
('Honeymoon Suite', 35000, 'Available'),
('Business Room', 22000, 'Available'),
('Ocean View Room', 30000, 'Available'),
('Garden View Room', 20000, 'Available'),
('Penthouse Suite', 60000, 'Available');

-- ==========================
-- Room Bookings Table
-- ==========================
CREATE TABLE room_bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    room_id INT NOT NULL,
    checkin_date DATE NOT NULL,
    checkout_date DATE NOT NULL,
    status ENUM('pending','confirmed','completed','cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- ==========================
-- Room Payments Table
-- ==========================
CREATE TABLE room_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_booking_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL, -- in KES
    method VARCHAR(50) DEFAULT 'offline',
    status ENUM('pending','paid','failed') DEFAULT 'pending',
    paid_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_booking_id) REFERENCES room_bookings(id) ON DELETE CASCADE
);

-- ==========================
-- Services Table
-- ==========================
CREATE TABLE services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category ENUM('Restaurant','Spa','Gym','Event','Pool') NOT NULL,
    price DECIMAL(10,2) NOT NULL, -- in KES
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert services (prices in KES)
-- Restaurant Items
INSERT INTO services (name, price, category, description) VALUES
('Grilled Salmon', 1200, 'Restaurant', 'Delicious grilled salmon served with vegetables'),
('Beef Steak', 1500, 'Restaurant', 'Juicy beef steak cooked to perfection'),
('Caesar Salad', 800, 'Restaurant', 'Fresh Caesar salad with croutons and parmesan'),
('Pasta Primavera', 900, 'Restaurant', 'Pasta with fresh seasonal vegetables'),
('Chocolate Cake', 600, 'Restaurant', 'Rich chocolate cake dessert'),
('Fruit Smoothie', 500, 'Restaurant', 'Refreshing mixed fruit smoothie');

-- Spa Treatments
INSERT INTO services (name, price, category, description) VALUES
('Swedish Massage', 2500, 'Spa', 'Relaxing full-body Swedish massage'),
('Aromatherapy', 2000, 'Spa', 'Soothing aromatherapy treatment'),
('Hot Stone Therapy', 3000, 'Spa', 'Therapeutic hot stone massage'),
('Facial Treatment', 1800, 'Spa', 'Rejuvenating facial treatment');

-- Gym Rentals
INSERT INTO services (name, price, category, description) VALUES
('Treadmill Rental', 500, 'Gym', 'Hourly treadmill rental'),
('Dumbbells Rental', 300, 'Gym', 'Set of dumbbells for exercise'),
('Exercise Bike', 400, 'Gym', 'Hourly exercise bike rental'),
('Rowing Machine', 450, 'Gym', 'Hourly rowing machine rental');

-- Event Bookings
INSERT INTO services (name, price, category, description) VALUES
('Wedding Hall Booking', 20000, 'Event', 'Full wedding hall booking'),
('Conference Room Booking', 15000, 'Event', 'Conference room for meetings'),
('Birthday Party Package', 12000, 'Event', 'Birthday celebration package'),
('Exhibition Hall Rental', 25000, 'Event', 'Exhibition hall rental for events');

-- Pool Events
INSERT INTO services (name, price, category, description) VALUES
('Pool Party (2 hrs)', 5000, 'Pool', 'Private pool party for 2 hours'),
('Family Swim Session', 3000, 'Pool', 'Family swimming session'),
('Night Swim Event', 7000, 'Pool', 'Evening/night swimming event'),
('Private Pool Rental', 10000, 'Pool', 'Exclusive pool rental for private events');

-- ==========================
-- Service Bookings Table
-- ==========================
CREATE TABLE service_bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    service_id INT NOT NULL,
    booking_date DATETIME NOT NULL,
    status ENUM('pending','confirmed','completed','cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

-- ==========================
-- Service Payments Table
-- ==========================
CREATE TABLE service_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_booking_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL, -- in KES
    method VARCHAR(50) DEFAULT 'offline',
    status ENUM('pending','paid','failed') DEFAULT 'pending',
    paid_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_booking_id) REFERENCES service_bookings(id) ON DELETE CASCADE
);
