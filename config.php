<?php
// config.php: ONLY database connection
$host = 'localhost';
$db   = 'hoteldb';
$user = '';
$pass = '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";

try {
    $conn = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
} catch (PDOException $e) {
    // Stop script and show JSON error (useful for AJAX)
    header('Content-Type: application/json');
    echo json_encode(['status'=>'error','message'=>'Database connection failed: '.$e->getMessage()]);
    exit;
}
