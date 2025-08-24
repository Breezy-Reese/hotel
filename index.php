<!DOCTYPE html>
<html>
<head>
    <title>Hotel Booking</title>
</head>
<body>
    <h1>Book a Service</h1>
    <form action="save_booking.php" method="POST">
        <label>Item Name:</label>
        <input type="text" name="item_name" required><br><br>

        <label>Price:</label>
        <input type="text" name="price" required><br><br>

        <label>Customer Name:</label>
        <input type="text" name="customer" required><br><br>

        <button type="submit">Book Now</button>
    </form>
</body>
</html>
