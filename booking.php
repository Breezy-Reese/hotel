<?php
include 'config.php';

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $item_name = $_POST['item_name'];
    $price = $_POST['price'];

    $stmt = $conn->prepare("INSERT INTO bookings (item_name, price) VALUES (?, ?)");
    $stmt->bind_param("sd", $item_name, $price);

    if ($stmt->execute()) {
        echo "Booking saved successfully!";
    } else {
        echo "Error: " . $stmt->error;
    }

    $stmt->close();
    $conn->close();
}
?>
