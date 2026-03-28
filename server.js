const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'loveria_db';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.get('/', (req, res) => {
    // Redirect (not sendFile) so relative assets like `Auth.css` resolve correctly.
    res.redirect('/features/auth/Signup.html');
});
app.use(express.static(path.join(__dirname, 'src')));

// Database Setup
let pool;
async function setupDatabase() {
    const connection = await mysql.createConnection({
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASSWORD
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
    await connection.end();

    pool = mysql.createPool({
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
    console.log(`Connected to MySQL database "${DB_NAME}".`);

    await pool.query(`CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        nickname VARCHAR(255),
        partner_nickname VARCHAR(255),
        relationship_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS reminders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        reminder_date DATE NOT NULL,
        note TEXT NOT NULL,
        is_notified TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS couple_photos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        image_data LONGTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
}

function mapUser(user) {
    return {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        partner_nickname: user.partner_nickname,
        relationship_date: user.relationship_date
    };
}

// Signup API
app.post('/api/signup', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = `INSERT INTO users (email, password) VALUES (?, ?)`;
        const [result] = await pool.execute(query, [email, hashedPassword]);
        res.status(201).json({ message: 'User created successfully.', userId: result.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'User already exists.' });
        }
        res.status(500).json({ error: 'Server error.' });
    }
});

// Login API
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    const query = `SELECT * FROM users WHERE email = ?`;
    try {
        const [rows] = await pool.execute(query, [email]);
        if (rows.length === 0) return res.status(401).json({ error: 'Invalid email or password.' });
        
        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid email or password.' });

        res.json({
            message: 'Login successful.',
            user: mapUser(user)
        });
    } catch (err) {
        res.status(500).json({ error: 'Database error.' });
    }
});

// Update Nicknames API
app.post('/api/user/nicknames', async (req, res) => {
    const { userId, nickname, partnerNickname } = req.body;
    if (!userId || !nickname || !partnerNickname) {
        return res.status(400).json({ error: 'User ID and both nicknames are required.' });
    }

    const query = `UPDATE users SET nickname = ?, partner_nickname = ? WHERE id = ?`;
    try {
        const [result] = await pool.execute(query, [nickname, partnerNickname, userId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const [rows] = await pool.execute(
            'SELECT id, email, nickname, partner_nickname, relationship_date FROM users WHERE id = ?',
            [userId]
        );
        res.json({ message: 'Nicknames updated successfully.', user: mapUser(rows[0]) });
    } catch (err) {
        res.status(500).json({ error: 'Database error.' });
    }
});

// Update Relationship Date API
app.post('/api/user/relationship-date', async (req, res) => {
    const { userId, relationshipDate } = req.body;
    if (!userId || !relationshipDate) {
        return res.status(400).json({ error: 'User ID and relationship date are required.' });
    }

    const query = `UPDATE users SET relationship_date = ? WHERE id = ?`;
    try {
        const [result] = await pool.execute(query, [relationshipDate, userId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const [rows] = await pool.execute(
            'SELECT id, email, nickname, partner_nickname, relationship_date FROM users WHERE id = ?',
            [userId]
        );
        res.json({ message: 'Relationship date updated successfully.', user: mapUser(rows[0]) });
    } catch (err) {
        res.status(500).json({ error: 'Database error.' });
    }
});

// Get current user profile from database.
app.get('/api/user/:id', async (req, res) => {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ error: 'Invalid user ID.' });
    }

    try {
        const [rows] = await pool.execute(
            'SELECT id, email, nickname, partner_nickname, relationship_date FROM users WHERE id = ?',
            [userId]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.json({ user: mapUser(rows[0]) });
    } catch (err) {
        res.status(500).json({ error: 'Database error.' });
    }
});

// Create reminder
app.post('/api/reminders', async (req, res) => {
    const { userId, reminderDate, note } = req.body;
    if (!userId || !reminderDate || !note || !note.trim()) {
        return res.status(400).json({ error: 'User ID, date, and note are required.' });
    }

    try {
        const [result] = await pool.execute(
            'INSERT INTO reminders (user_id, reminder_date, note) VALUES (?, ?, ?)',
            [userId, reminderDate, note.trim()]
        );
        res.status(201).json({
            message: 'Reminder created successfully.',
            reminder: {
                id: result.insertId,
                user_id: Number(userId),
                reminder_date: reminderDate,
                note: note.trim(),
                is_notified: 0
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Database error.' });
    }
});

// List reminders for a user
app.get('/api/reminders/:userId', async (req, res) => {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ error: 'Invalid user ID.' });
    }

    try {
        const [rows] = await pool.execute(
            `SELECT id, user_id, reminder_date, note, is_notified
             FROM reminders
             WHERE user_id = ?
             ORDER BY reminder_date ASC, id ASC`,
            [userId]
        );
        res.json({ reminders: rows });
    } catch (err) {
        res.status(500).json({ error: 'Database error.' });
    }
});

// Mark reminder as notified (after sending notification)
app.patch('/api/reminders/:id/notified', async (req, res) => {
    const reminderId = Number(req.params.id);
    if (!Number.isInteger(reminderId) || reminderId <= 0) {
        return res.status(400).json({ error: 'Invalid reminder ID.' });
    }

    try {
        const [result] = await pool.execute(
            'UPDATE reminders SET is_notified = 1 WHERE id = ?',
            [reminderId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Reminder not found.' });
        }
        res.json({ message: 'Reminder marked as notified.' });
    } catch (err) {
        res.status(500).json({ error: 'Database error.' });
    }
});

// Save or update couple photo
app.post('/api/couple-photo', async (req, res) => {
    const { userId, imageData } = req.body;
    if (!userId || !imageData || !imageData.trim()) {
        return res.status(400).json({ error: 'User ID and image are required.' });
    }

    try {
        await pool.execute(
            `INSERT INTO couple_photos (user_id, image_data)
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE image_data = VALUES(image_data)`,
            [userId, imageData]
        );
        res.status(201).json({ message: 'Couple photo saved successfully.' });
    } catch (err) {
        res.status(500).json({ error: 'Database error.' });
    }
});

// Get couple photo by user
app.get('/api/couple-photo/:userId', async (req, res) => {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ error: 'Invalid user ID.' });
    }

    try {
        const [rows] = await pool.execute(
            'SELECT id, user_id, image_data FROM couple_photos WHERE user_id = ?',
            [userId]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'No couple photo found.' });
        }
        res.json({ photo: rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'Database error.' });
    }
});

setupDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Database setup failed:', err.message);
        process.exit(1);
    });
