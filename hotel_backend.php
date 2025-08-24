<?php
// hotel_backend.php
require __DIR__ . '/config.php';

try {
    $pdo = new PDO(
        "mysql:host={$config['db']['host']};dbname={$config['db']['dbname']}",
        $config['db']['user'],
        $config['db']['pass']
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("DB Connection failed: " . $e->getMessage());
}

// ----------------------------
// Populate Rooms if empty
// ----------------------------
$checkRooms = $pdo->query("SELECT COUNT(*) FROM rooms")->fetchColumn();
if ($checkRooms == 0) {
    $rooms = [
        ['Deluxe Suite', 25000], ['Standard Room', 15000], ['Single Room', 10000],
        ['Double Room', 18000], ['Family Suite', 30000], ['Presidential Suite', 50000],
        ['Economy Room', 1000], ['Luxury Suite', 40000], ['Honeymoon Suite', 35000],
        ['Business Room', 22000], ['Ocean View Room', 30000], ['Garden View Room', 20000],
        ['Penthouse Suite', 60000]
    ];

    $stmt = $pdo->prepare("INSERT INTO rooms (name, price, status) VALUES (?, ?, 'Available')");
    foreach ($rooms as $r) {
        $stmt->execute([$r[0], $r[1]]);
    }
}

// ----------------------------
// Populate Services if empty
// ----------------------------
$checkServices = $pdo->query("SELECT COUNT(*) FROM services")->fetchColumn();
if ($checkServices == 0) {
    $services = [
        // Restaurant
        ['Grilled Salmon','Restaurant',1200],
        ['Beef Steak','Restaurant',1500],
        ['Caesar Salad','Restaurant',800],
        ['Pasta Primavera','Restaurant',900],
        ['Chocolate Cake','Restaurant',600],
        ['Fruit Smoothie','Restaurant',500],
        // Spa
        ['Swedish Massage','Spa',2500],
        ['Aromatherapy','Spa',2000],
        ['Hot Stone Therapy','Spa',3000],
        ['Facial Treatment','Spa',1800],
        // Gym
        ['Treadmill Rental','Gym',500],
        ['Dumbbells Rental','Gym',300],
        ['Exercise Bike','Gym',400],
        ['Rowing Machine','Gym',450],
        // Event
        ['Wedding Hall Booking','Event',20000],
        ['Conference Room Booking','Event',15000],
        ['Birthday Party Package','Event',12000],
        ['Exhibition Hall Rental','Event',25000],
        // Pool
        ['Pool Party (2 hrs)','Pool',5000],
        ['Family Swim Session','Pool',3000],
        ['Night Swim Event','Pool',7000],
        ['Private Pool Rental','Pool',10000]
    ];

    $stmt = $pdo->prepare("INSERT INTO services (name, category, price) VALUES (?, ?, ?)");
    foreach ($services as $s) {
        $stmt->execute([$s[0], $s[1], $s[2]]);
    }
}

// ----------------------------
// Booking functions
// ----------------------------
function bookRoom($pdo, $user_id, $room_id, $checkin, $checkout, $payment_method='offline') {
    // Check if room is available
    $status = $pdo->query("SELECT status FROM rooms WHERE id=$room_id")->fetchColumn();
    if($status !== 'Available') {
        return "Room not available";
    }

    // Insert booking
    $stmt = $pdo->prepare("INSERT INTO room_bookings (user_id, room_id, checkin_date, checkout_date) VALUES (?, ?, ?, ?)");
    $stmt->execute([$user_id, $room_id, $checkin, $checkout]);
    $booking_id = $pdo->lastInsertId();

    // Insert payment
    $price = $pdo->query("SELECT price FROM rooms WHERE id=$room_id")->fetchColumn();
    $stmt = $pdo->prepare("INSERT INTO room_payments (room_booking_id, amount, method) VALUES (?, ?, ?)");
    $stmt->execute([$booking_id, $price, $payment_method]);

    // Update room status
    $pdo->prepare("UPDATE rooms SET status='Booked' WHERE id=?")->execute([$room_id]);

    return $booking_id;
}

function bookService($pdo, $user_id, $service_id, $payment_method='offline') {
    // Insert service booking
    $stmt = $pdo->prepare("INSERT INTO service_bookings (user_id, service_id, booking_date) VALUES (?, ?, NOW())");
    $stmt->execute([$user_id, $service_id]);
    $booking_id = $pdo->lastInsertId();

    // Insert payment
    $price = $pdo->query("SELECT price FROM services WHERE id=$service_id")->fetchColumn();
    $stmt = $pdo->prepare("INSERT INTO service_payments (service_booking_id, amount, method) VALUES (?, ?, ?)");
    $stmt->execute([$booking_id, $price, $payment_method]);

    return $booking_id;
}

function getUserBookings($pdo, $user_id) {
    $rooms = $pdo->prepare("SELECT rb.id AS booking_id, r.name AS item_name, rb.checkin_date, rb.checkout_date, rb.status, 'room' AS type
                            FROM room_bookings rb
                            JOIN rooms r ON rb.room_id = r.id
                            WHERE rb.user_id=?");
    $rooms->execute([$user_id]);
    $roomBookings = $rooms->fetchAll(PDO::FETCH_ASSOC);

    $services = $pdo->prepare("SELECT sb.id AS booking_id, s.name AS item_name, sb.booking_date, sb.status, 'service' AS type
                               FROM service_bookings sb
                               JOIN services s ON sb.service_id = s.id
                               WHERE sb.user_id=?");
    $services->execute([$user_id]);
    $serviceBookings = $services->fetchAll(PDO::FETCH_ASSOC);

    return array_merge($roomBookings, $serviceBookings);
}

// ----------------------------
// Example usage
// ----------------------------
$user_id = 1; // Change to the logged-in user

echo "Available Rooms:\n";
print_r($pdo->query("SELECT * FROM rooms")->fetchAll(PDO::FETCH_ASSOC));

echo "\nAvailable Services:\n";
print_r($pdo->query("SELECT * FROM services")->fetchAll(PDO::FETCH_ASSOC));

// Uncomment to book a room
// $roomBookingId = bookRoom($pdo, $user_id, 1, '2025-09-01', '2025-09-05');
// echo "\nRoom booked with ID: $roomBookingId\n";

// Uncomment to book a service
// $serviceBookingId = bookService($pdo, $user_id, 101);
// echo "\nService booked with ID: $serviceBookingId\n";

// Get all user bookings
echo "\nUser bookings:\n";
print_r(getUserBookings($pdo, $user_id));
?>
