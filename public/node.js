// server.js
import express from "express";
import fetch from "node-fetch"; // Node 18+ has fetch built-in

const app = express();
app.use(express.json());

// Replace with your sandbox credentials
const consumerKey = "YOUR_CONSUMER_KEY";
const consumerSecret = "YOUR_CONSUMER_SECRET";
const shortCode = "YOUR_SHORTCODE";
const passkey = "YOUR_PASSKEY";
const callbackURL = "https://yourdomain.com/payment-callback"; // Replace with your callback

async function getAccessToken() {
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const res = await fetch("https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
    headers: { Authorization: `Basic ${auth}` }
  });
  const data = await res.json();
  return data.access_token;
}

app.post("/stkpush", async (req, res) => {
  const { phone, amount, roomName } = req.body;
  const token = await getAccessToken();

  const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
  const password = Buffer.from(shortCode + passkey + timestamp).toString("base64");

  const body = {
    BusinessShortCode: shortCode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: amount,
    PartyA: phone,
    PartyB: shortCode,
    PhoneNumber: phone,
    CallBackURL: callbackURL,
    AccountReference: roomName,
    TransactionDesc: `Booking ${roomName}`
  };

  try {
    const stkRes = await fetch("https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    const data = await stkRes.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "STK Push request failed" });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
