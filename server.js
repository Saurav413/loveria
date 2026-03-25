const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'src')));

// Database Setup
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE,
                password TEXT,
                nickname TEXT,
                partner_nickname TEXT,
                relationship_date TEXT
            )`, (err) => {
            if (err) console.error('Error creating table:', err.message);
        });
    }
});

// Signup API
app.post('/api/signup', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = `INSERT INTO users (email, password) VALUES (?, ?)`;
        db.run(query, [email, hashedPassword], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'User already exists.' });
                }
                return res.status(500).json({ error: 'Database error.' });
            }
            res.status(201).json({ message: 'User created successfully.', userId: this.lastID });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error.' });
    }
});

// Login API
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    const query = `SELECT * FROM users WHERE email = ?`;
    db.get(query, [email], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid email or password.' });

        res.json({
            message: 'Login successful.',
            user: {
                id: user.id,
                email: user.email,
                nickname: user.nickname,
                partner_nickname: user.partner_nickname,
                relationship_date: user.relationship_date
            }
        });
    });
});

// Update Nicknames API
app.post('/api/user/nicknames', (req, res) => {
    const { userId, nickname, partnerNickname } = req.body;
    if (!userId || !nickname || !partnerNickname) {
        return res.status(400).json({ error: 'User ID and both nicknames are required.' });
    }

    const query = `UPDATE users SET nickname = ?, partner_nickname = ? WHERE id = ?`;
    db.run(query, [nickname, partnerNickname, userId], function (err) {
        if (err) return res.status(500).json({ error: 'Database error.' });
        res.json({ message: 'Nicknames updated successfully.' });
    });
});

// Update Relationship Date API
app.post('/api/user/relationship-date', (req, res) => {
    const { userId, relationshipDate } = req.body;
    if (!userId || !relationshipDate) {
        return res.status(400).json({ error: 'User ID and relationship date are required.' });
    }

    const query = `UPDATE users SET relationship_date = ? WHERE id = ?`;
    db.run(query, [relationshipDate, userId], function (err) {
        if (err) return res.status(500).json({ error: 'Database error.' });
        res.json({ message: 'Relationship date updated successfully.' });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
