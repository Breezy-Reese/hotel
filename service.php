<?php
session_start();
header('Content-Type: application/json');
include 'config.php'; // Make sure this contains only your DB connection

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status'=>'error','message'=>'Invalid request method. Use POST.']);
    exit;
}

// Get JSON data from frontend
$data = json_decode(file_get_contents('php://input'), true);

$name = trim($data['name'] ?? '');
$email = trim($data['email'] ?? '');
$service_id = intval($data['service_id'] ?? 0);

if (!$name || !$email || !$service_id) {
    echo json_encode(['status'=>'error','message'=>'Missing required fields: name, email, or service_id.']);
    exit;
}

try {
    // Check if user already exists (by email)
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user) {
        $user_id = $user['id'];
    } else {
        // Create a guest user
        $stmt = $conn->prepare("INSERT INTO users (name, email, password) VALUES (?, ?, '')");
        $stmt->execute([$name, $email]);
        $user_id = $conn->lastInsertId();
    }

    // Check if the service exists
    $stmt = $conn->prepare("SELECT id, price, name FROM services WHERE id = ?");
    $stmt->execute([$service_id]);
    $service = $stmt->fetch();

    if (!$service) {
        echo json_encode(['status'=>'error','message'=>'Service not found in database.']);
        exit;
    }

    // Insert service booking
    $stmt = $conn->prepare("
        INSERT INTO service_bookings (user_id, service_id, booking_date, status)
        VALUES (?, ?, NOW(), 'pending')
    ");
    $stmt->execute([$user_id, $service_id]);
    $booking_id = $conn->lastInsertId();

    // Insert payment record
    $stmt = $conn->prepare("
        INSERT INTO service_payments (service_booking_id, amount, method, status, paid_at)
        VALUES (?, ?, 'online', 'paid', NOW())
    ");
    $stmt->execute([$booking_id, $service['price']]);

    echo json_encode([
        'status' => 'success',
        'message' => "Service '{$service['name']}' booked and paid successfully!",
        'booking_id' => $booking_id,
        'amount_paid' => $service['price']
    ]);

} catch (PDOException $e) {
    // Catch all DB errors
    echo json_encode([
        'status' => 'error',
        'message' => 'Database query failed: '.$e->getMessage()
    ]);
}
