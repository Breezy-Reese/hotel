async function loadRoomBookings() {
    const res = await fetch('http://localhost:4242/admin/room-bookings');

    const bookings = await res.json();
    const table = document.querySelector('#roomBookingsTable tbody');
    table.innerHTML = '';
    bookings.forEach(b => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${b.id}</td>
            <td>${b.user_id}</td>
            <td>${b.room_id}</td>
            <td>${b.name}</td>
            <td>${b.email}</td>
            <td>${b.check_in}</td>
            <td>${b.check_out}</td>
            <td>${b.status}</td>
            <td>${b.payment_status}</td>
        `;
        table.appendChild(tr);
    });
}

async function loadServiceBookings() {
    const res = await fetch('http://localhost:4242/admin/room-bookings');

    const bookings = await res.json();
    const table = document.querySelector('#serviceBookingsTable tbody');
    table.innerHTML = '';
    bookings.forEach(b => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${b.id}</td>
            <td>${b.name}</td>
            <td>${b.email}</td>
            <td>${b.user_id}</td>
            <td>${b.service_id}</td>
            <td>${b.booking_date}</td>
            <td>${b.status}</td>
            <td>${b.payment_status}</td>
        `;
        table.appendChild(tr);
    });
}

// Call these when page loads
loadRoomBookings();
loadServiceBookings();
