<?php
include 'config.php';
?>

<?php
// api.php
// Single-file API for Hotel: rooms/services bookings + payments
// Place next to your config.php (which returns ['db'=>[...] ])

/* ===== CORS + JSON headers (useful while testing) ===== */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

/* ===== Load DB config ===== */
$config = require __DIR__ . '/config.php';

try {
    $pdo = new PDO(
        "mysql:host={$config['db']['host']};dbname={$config['db']['dbname']};charset=utf8mb4",
        $config['db']['user'],
        $config['db']['pass']
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'DB connection failed', 'details' => $e->getMessage()]);
    exit;
}

/* ===== Helpers ===== */
function respond($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function getJsonInput() {
    $body = file_get_contents('php://input');
    if (empty($body)) return [];
    $data = json_decode($body, true);
    return is_array($data) ? $data : [];
}

function exists($pdo, $table, $id) {
    $stmt = $pdo->prepare("SELECT 1 FROM `$table` WHERE id = ? LIMIT 1");
    $stmt->execute([$id]);
    return (bool)$stmt->fetchColumn();
}

/* ===== Routing via query params: ?resource=rooms&action=book ===== */
$resource = $_GET['resource'] ?? null;    // e.g., rooms, services, payments
$action   = $_GET['action'] ?? null;      // e.g., list, book, bookings, room/service

$method = $_SERVER['REQUEST_METHOD'];

/* ===== Implementations ===== */

if ($resource === 'rooms' && $action === 'list' && $method === 'GET') {
    // optional ?status=Available
    $status = $_GET['status'] ?? null;
    if ($status) {
        $stmt = $pdo->prepare("SELECT * FROM rooms WHERE status = ? ORDER BY id");
        $stmt->execute([$status]);
    } else {
        $stmt = $pdo->query("SELECT * FROM rooms ORDER BY id");
    }
    respond(['rooms' => $stmt->fetchAll()]);
}

if ($resource === 'rooms' && $action === 'book' && $method === 'POST') {
    $in = getJsonInput();
    // required: user_id, room_id, checkin_date, checkout_date
    foreach (['user_id','room_id','checkin_date','checkout_date'] as $f) {
        if (empty($in[$f])) respond(['error' => "$f is required"], 400);
    }
    $user_id = (int)$in['user_id'];
    $room_id = (int)$in['room_id'];
    $checkin = $in['checkin_date'];
    $checkout = $in['checkout_date'];

    // verify user and room exist
    if (!exists($pdo,'users',$user_id)) respond(['error'=>'Invalid user_id'],400);
    if (!exists($pdo,'rooms',$room_id)) respond(['error'=>'Invalid room_id'],400);

    // basic date validation
    try {
        $ci = new DateTime($checkin);
        $co = new DateTime($checkout);
    } catch (Exception $e) {
        respond(['error'=>'Invalid date format'],400);
    }
    if ($ci >= $co) respond(['error'=>'checkout_date must be after checkin_date'],400);

    // availability check: overlapping bookings (exclude cancelled)
    $stmt = $pdo->prepare(
        "SELECT COUNT(*) FROM room_bookings
         WHERE room_id = ?
           AND status <> 'cancelled'
           AND NOT (checkout_date <= ? OR checkin_date >= ?)"
    );
    $stmt->execute([$room_id, $checkin, $checkout]);
    if ($stmt->fetchColumn() > 0) {
        respond(['error'=>'Room not available for the selected dates'], 400);
    }

    // create booking
    $stmt = $pdo->prepare("INSERT INTO room_bookings (user_id, room_id, checkin_date, checkout_date, status) VALUES (?, ?, ?, ?, 'pending')");
    $stmt->execute([$user_id, $room_id, $checkin, $checkout]);
    $bookingId = (int)$pdo->lastInsertId();

    // optionally mark room as Booked (simple behaviour; you may prefer to leave as Available)
    $pdo->prepare("UPDATE rooms SET status = 'Booked' WHERE id = ?")->execute([$room_id]);

    respond(['message'=>'Room booked','booking_id'=>$bookingId], 201);
}

if ($resource === 'rooms' && $action === 'bookings' && $method === 'GET') {
    // optional ?user_id=1 to filter for a user
    $user_id = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;
    if ($user_id) {
        $stmt = $pdo->prepare(
            "SELECT rb.*, u.name as user_name, r.name as room_name, r.price as room_price
             FROM room_bookings rb
             JOIN users u ON rb.user_id = u.id
             JOIN rooms r ON rb.room_id = r.id
             WHERE rb.user_id = ? ORDER BY rb.id DESC"
        );
        $stmt->execute([$user_id]);
    } else {
        $stmt = $pdo->query(
            "SELECT rb.*, u.name as user_name, r.name as room_name, r.price as room_price
             FROM room_bookings rb
             JOIN users u ON rb.user_id = u.id
             JOIN rooms r ON rb.room_id = r.id
             ORDER BY rb.id DESC"
        );
    }
    respond(['room_bookings' => $stmt->fetchAll()]);
}

if ($resource === 'services' && $action === 'list' && $method === 'GET') {
    // optional ?category=Spa
    $cat = $_GET['category'] ?? null;
    if ($cat) {
        $stmt = $pdo->prepare("SELECT * FROM services WHERE category = ? ORDER BY id");
        $stmt->execute([$cat]);
    } else {
        $stmt = $pdo->query("SELECT * FROM services ORDER BY id");
    }
    respond(['services' => $stmt->fetchAll()]);
}

if ($resource === 'services' && $action === 'book' && $method === 'POST') {
    $in = getJsonInput();
    foreach (['user_id','service_id','booking_date'] as $f) {
        if (empty($in[$f])) respond(['error' => "$f is required"], 400);
    }
    $user_id = (int)$in['user_id'];
    $service_id = (int)$in['service_id'];
    $booking_date = $in['booking_date'];

    if (!exists($pdo,'users',$user_id)) respond(['error'=>'Invalid user_id'],400);
    if (!exists($pdo,'services',$service_id)) respond(['error'=>'Invalid service_id'],400);

    // optional overlap prevention: same user booking same service at same datetime
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM service_bookings WHERE service_id = ? AND booking_date = ? AND status <> 'cancelled'");
    $stmt->execute([$service_id, $booking_date]);
    if ($stmt->fetchColumn() > 0) {
        // you can decide whether to block or allow; here we allow (comment/remove if you want strict blocking)
        // respond(['error'=>'Service already booked for that date/time'], 400);
    }

    $stmt = $pdo->prepare("INSERT INTO service_bookings (user_id, service_id, booking_date, status) VALUES (?, ?, ?, 'pending')");
    $stmt->execute([$user_id, $service_id, $booking_date]);
    $bookingId = (int)$pdo->lastInsertId();

    respond(['message'=>'Service booked','booking_id'=>$bookingId], 201);
}

if ($resource === 'services' && $action === 'bookings' && $method === 'GET') {
    $user_id = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;
    if ($user_id) {
        $stmt = $pdo->prepare(
            "SELECT sb.*, u.name as user_name, s.name as service_name, s.category, s.price as service_price
             FROM service_bookings sb
             JOIN users u ON sb.user_id = u.id
             JOIN services s ON sb.service_id = s.id
             WHERE sb.user_id = ? ORDER BY sb.id DESC"
        );
        $stmt->execute([$user_id]);
    } else {
        $stmt = $pdo->query(
            "SELECT sb.*, u.name as user_name, s.name as service_name, s.category, s.price as service_price
             FROM service_bookings sb
             JOIN users u ON sb.user_id = u.id
             JOIN services s ON sb.service_id = s.id
             ORDER BY sb.id DESC"
        );
    }
    respond(['service_bookings' => $stmt->fetchAll()]);
}

/* ===== Payments ===== */

if ($resource === 'payments' && $action === 'room' && $method === 'POST') {
    // body: booking_id, amount, method
    $in = getJsonInput();
    foreach (['booking_id','amount'] as $f) if (empty($in[$f])) respond(['error'=>"$f required"],400);
    $booking_id = (int)$in['booking_id'];
    $amount = $in['amount'];
    $methodName = $in['method'] ?? 'offline';

    // check booking exists
    if (!exists($pdo,'room_bookings',$booking_id)) respond(['error'=>'Invalid booking_id'],400);

    // insert payment
    $stmt = $pdo->prepare("INSERT INTO room_payments (room_booking_id, amount, method, status, paid_at) VALUES (?, ?, ?, 'paid', ?)");
    $stmt->execute([$booking_id, $amount, $methodName, date('Y-m-d H:i:s')]);

    // update booking status to confirmed
    $pdo->prepare("UPDATE room_bookings SET status = 'confirmed' WHERE id = ?")->execute([$booking_id]);

    respond(['message'=>'Payment recorded, booking confirmed']);
}

if ($resource === 'payments' && $action === 'service' && $method === 'POST') {
    // body: booking_id, amount, method
    $in = getJsonInput();
    foreach (['booking_id','amount'] as $f) if (empty($in[$f])) respond(['error'=>"$f required"],400);
    $booking_id = (int)$in['booking_id'];
    $amount = $in['amount'];
    $methodName = $in['method'] ?? 'offline';

    if (!exists($pdo,'service_bookings',$booking_id)) respond(['error'=>'Invalid booking_id'],400);

    $stmt = $pdo->prepare("INSERT INTO service_payments (service_booking_id, amount, method, status, paid_at) VALUES (?, ?, ?, 'paid', ?)");
    $stmt->execute([$booking_id, $amount, $methodName, date('Y-m-d H:i:s')]);

    $pdo->prepare("UPDATE service_bookings SET status = 'confirmed' WHERE id = ?")->execute([$booking_id]);

    respond(['message'=>'Payment recorded, service booking confirmed']);
}

/* ===== Fallback ===== */
respond(['error'=>'Endpoint not found. Use resource & action query params. Example: ?resource=rooms&action=book'], 404);
