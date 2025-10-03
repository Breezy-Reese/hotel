// API base URL
const API_BASE = 'https://hotel-system-75c6.onrender.com';

// Fetch available rooms
async function fetchRooms() {
  try {
    const res = await fetch(`${API_BASE}/rooms`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.rooms || [];
  } catch (err) {
    console.error('Error fetching rooms:', err);
    throw err;
  }
}

// Book a room
async function bookRoom(payload) {
  try {
    const res = await fetch(`${API_BASE}/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Error booking room:', err);
    throw err;
  }
}

// Book a service
async function bookService(payload) {
  try {
    const res = await fetch(`${API_BASE}/book-service`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Error booking service:', err);
    throw err;
  }
}

// Admin login
async function adminLogin(credentials) {
  try {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Error logging in:', err);
    throw err;
  }
}

// Admin logout
async function adminLogout() {
  try {
    const res = await fetch(`${API_BASE}/admin/logout`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Error logging out:', err);
    throw err;
  }
}

// Fetch admin rooms
async function fetchAdminRooms() {
  try {
    const res = await fetch(`${API_BASE}/admin/rooms`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.rooms || [];
  } catch (err) {
    console.error('Error fetching admin rooms:', err);
    throw err;
  }
}

// Add room (admin)
async function addRoom(roomData) {
  try {
    const res = await fetch(`${API_BASE}/admin/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(roomData)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Error adding room:', err);
    throw err;
  }
}

// Delete room (admin)
async function deleteRoom(roomId) {
  try {
    const res = await fetch(`${API_BASE}/admin/rooms/${roomId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Error deleting room:', err);
    throw err;
  }
}

// Fetch admin bookings
async function fetchAdminBookings() {
  try {
    const res = await fetch(`${API_BASE}/admin/bookings`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.bookings || [];
  } catch (err) {
    console.error('Error fetching admin bookings:', err);
    throw err;
  }
}

// Fetch admin services
async function fetchAdminServices() {
  try {
    const res = await fetch(`${API_BASE}/admin/services`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.services || [];
  } catch (err) {
    console.error('Error fetching admin services:', err);
    throw err;
  }
}

// Fetch admin service bookings
async function fetchAdminServiceBookings() {
  try {
    const res = await fetch(`${API_BASE}/admin/service-bookings`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.bookings || [];
  } catch (err) {
    console.error('Error fetching admin service bookings:', err);
    throw err;
  }
}
