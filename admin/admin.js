async function loadRoomBookings() {
    const res = await fetch('/admin/bookings', { credentials: 'include' });

    const data = await res.json();
    const table = document.querySelector('#roomBookingsTable');
    table.innerHTML = '';
    data.bookings.forEach(b => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${b._id}</td>
            <td>${b.userId ? b.userId.name : 'Unknown'}</td>
            <td>${b.roomId ? b.roomId.name : 'Unknown'}</td>
            <td>${b.name}</td>
            <td>${b.email}</td>
            <td>${b.checkin ? new Date(b.checkin).toLocaleDateString() : ''}</td>
            <td>${b.checkout ? new Date(b.checkout).toLocaleDateString() : ''}</td>
            <td>${b.status}</td>
            <td>${b.payment_status}</td>
        `;
        table.appendChild(tr);
    });
}

async function loadServiceBookings() {
    const res = await fetch('/admin/service-bookings', { credentials: 'include' });

    const data = await res.json();
    const table = document.querySelector('#serviceBookingsTable');
    table.innerHTML = '';
    data.bookings.forEach(b => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${b._id}</td>
            <td>${b.name}</td>
            <td>${b.email}</td>
            <td>${b.userId ? b.userId.name : 'Unknown'}</td>
            <td>${b.serviceId ? b.serviceId.name : 'Unknown'}</td>
            <td>${b.booking_date ? new Date(b.booking_date).toLocaleString() : ''}</td>
            <td>${b.status}</td>
            <td>${b.payment_status}</td>
        `;
        table.appendChild(tr);
    });
}

// Call these when page loads
loadRoomBookings();
loadServiceBookings();
