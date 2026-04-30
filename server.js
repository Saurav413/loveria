const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config({ override: true });

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*'
    }
});
const PORT = process.env.PORT || 3000;
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'loveria_db';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

const mailTransporter = SMTP_HOST && SMTP_USER && SMTP_PASS
    ? nodemailer.createTransport({
          host: SMTP_HOST,
          port: SMTP_PORT,
          secure: SMTP_PORT === 465,
          auth: {
              user: SMTP_USER,
              pass: SMTP_PASS
          }
      })
    : null;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '15mb' }));
app.get('/', (req, res) => {
    // Redirect (not sendFile) so relative assets like `Auth.css` resolve correctly.
    res.redirect('/features/auth/Signup.html');
});
app.use(express.static(path.join(__dirname, 'src')));

io.on('connection', (socket) => {
    socket.on('join-pair-room', async ({ userId }) => {
        const currentUserId = Number(userId);
        if (!Number.isInteger(currentUserId) || currentUserId <= 0) {
            socket.emit('drawing-error', { message: 'Invalid user ID for realtime drawing.' });
            return;
        }

        try {
            const [rows] = await pool.execute(
                'SELECT partner_user_id FROM users WHERE id = ?',
                [currentUserId]
            );
            if (!rows.length || !rows[0].partner_user_id) {
                socket.emit('drawing-error', { message: 'User is not paired yet.' });
                return;
            }

            const partnerUserId = Number(rows[0].partner_user_id);
            const roomId = `pair-${Math.min(currentUserId, partnerUserId)}-${Math.max(currentUserId, partnerUserId)}`;
            socket.join(roomId);
            socket.data.roomId = roomId;
        } catch (err) {
            socket.emit('drawing-error', { message: 'Failed to join drawing room.' });
        }
    });

    socket.on('drawing-stroke', ({ stroke }) => {
        if (!socket.data.roomId || !stroke) return;
        socket.to(socket.data.roomId).emit('drawing-stroke', { stroke });
    });

    socket.on('drawing-clear', () => {
        if (!socket.data.roomId) return;
        socket.to(socket.data.roomId).emit('drawing-clear');
    });
});

app.get('/api/config/public', (req, res) => {
    res.json({
        googleClientId: GOOGLE_CLIENT_ID,
        smtpConfigured: Boolean(mailTransporter && SMTP_FROM)
    });
});

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
        gender VARCHAR(20),
        nickname VARCHAR(255),
        partner_nickname VARCHAR(255),
        relationship_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`);
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20) AFTER password');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS partner_user_id INT NULL AFTER relationship_date');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7) NULL AFTER partner_user_id');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7) NULL AFTER latitude');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS location_updated_at DATETIME NULL AFTER longitude');

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

    await pool.query(`CREATE TABLE IF NOT EXISTS user_profile_photos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        image_data LONGTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS pairing_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(6) NOT NULL UNIQUE,
        owner_user_id INT NOT NULL,
        connected_user_id INT NULL,
        status ENUM('active','connected') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        connected_at TIMESTAMP NULL,
        FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (connected_user_id) REFERENCES users(id) ON DELETE SET NULL
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS shared_drawings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        image_data LONGTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS shared_slideshow_photos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pair_user_a INT NOT NULL,
        pair_user_b INT NOT NULL,
        uploaded_by INT NOT NULL,
        caption VARCHAR(255) NULL,
        image_data LONGTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pair_user_a) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (pair_user_b) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_pair_users (pair_user_a, pair_user_b, created_at)
    )`);
    await pool.query('ALTER TABLE shared_slideshow_photos ADD COLUMN IF NOT EXISTS caption VARCHAR(255) NULL AFTER uploaded_by');

    await pool.query(`CREATE TABLE IF NOT EXISTS email_verifications (
        id VARCHAR(64) PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        google_sub VARCHAR(255) NOT NULL,
        code_hash VARCHAR(255) NOT NULL,
        expires_at DATETIME NOT NULL,
        used_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
}

function mapUser(user) {
    return {
        id: user.id,
        email: user.email,
        gender: user.gender,
        nickname: user.nickname,
        partner_nickname: user.partner_nickname,
        relationship_date: user.relationship_date,
        partner_user_id: user.partner_user_id || null,
        latitude: user.latitude != null ? Number(user.latitude) : null,
        longitude: user.longitude != null ? Number(user.longitude) : null,
        location_updated_at: user.location_updated_at || null
    };
}

function haversineKm(lat1, lon1, lat2, lon2) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const earthKm = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthKm * c;
}

function generateOtpCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

function generatePairingCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i += 1) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

function maskEmail(email) {
    const [local, domain] = email.split('@');
    if (!local || !domain) return email;
    if (local.length <= 2) return `**@${domain}`;
    return `${local[0]}${'*'.repeat(Math.max(local.length - 2, 1))}${local[local.length - 1]}@${domain}`;
}

async function verifyGoogleCredential(credential) {
    if (!credential) {
        return { error: 'Google credential is required.', status: 400 };
    }
    if (!googleClient) {
        return { error: 'Google sign-in is not configured on server.', status: 500 };
    }

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();

        if (!payload || !payload.email || !payload.sub) {
            return { error: 'Unable to read Google account details.', status: 400 };
        }
        if (!payload.email_verified) {
            return { error: 'Google email is not verified.', status: 400 };
        }
        const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
        if (!validIssuers.includes(payload.iss)) {
            return { error: 'Invalid Google token issuer.', status: 401 };
        }

        return { payload };
    } catch (err) {
        return { error: 'Invalid Google credential.', status: 401 };
    }
}

// Start Google auth verification (send OTP to Gmail)
app.post('/api/auth/google/start', async (req, res) => {
    const { credential } = req.body;
    const verification = await verifyGoogleCredential(credential);
    if (verification.error) {
        return res.status(verification.status).json({ error: verification.error });
    }

    if (!mailTransporter || !SMTP_FROM) {
        return res.status(500).json({ error: 'Email OTP is not configured on server.' });
    }

    const email = verification.payload.email;
    const googleSub = verification.payload.sub;
    const otpCode = generateOtpCode();
    const codeHash = await bcrypt.hash(otpCode, 10);
    const verificationId = crypto.randomUUID().replace(/-/g, '');

    try {
        await pool.execute('DELETE FROM email_verifications WHERE expires_at < NOW()');
        await pool.execute(
            `INSERT INTO email_verifications (id, email, google_sub, code_hash, expires_at)
             VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
            [verificationId, email, googleSub, codeHash]
        );

        await mailTransporter.sendMail({
            from: SMTP_FROM,
            to: email,
            subject: 'Your Loveria verification code',
            text: `Your verification code is ${otpCode}. It expires in 10 minutes.`,
            html: `<p>Your verification code is:</p><h2>${otpCode}</h2><p>This code expires in 10 minutes.</p>`
        });

        return res.json({
            message: 'Verification code sent.',
            verificationId,
            email: maskEmail(email)
        });
    } catch (err) {
        console.error('OTP email send failed:', err.message);
        return res.status(500).json({ error: 'Failed to send verification code.' });
    }
});

// Complete Google auth after OTP verification
app.post('/api/auth/google/verify', async (req, res) => {
    const { verificationId, code } = req.body;
    if (!verificationId || !code) {
        return res.status(400).json({ error: 'Verification ID and code are required.' });
    }

    try {
        const [rows] = await pool.execute(
            `SELECT id, email, google_sub, code_hash, expires_at, used_at
             FROM email_verifications WHERE id = ?`,
            [verificationId]
        );
        if (rows.length === 0) {
            return res.status(400).json({ error: 'Invalid verification request.' });
        }

        const verification = rows[0];
        if (verification.used_at) {
            return res.status(400).json({ error: 'Verification code already used.' });
        }
        if (new Date(verification.expires_at).getTime() < Date.now()) {
            return res.status(400).json({ error: 'Verification code expired.' });
        }

        const isCodeValid = await bcrypt.compare(String(code).trim(), verification.code_hash);
        if (!isCodeValid) {
            return res.status(401).json({ error: 'Invalid verification code.' });
        }

        await pool.execute('UPDATE email_verifications SET used_at = NOW() WHERE id = ?', [verificationId]);

        const [existingUsers] = await pool.execute('SELECT * FROM users WHERE email = ?', [verification.email]);

        let user;
        if (existingUsers.length > 0) {
            user = existingUsers[0];
        } else {
            const syntheticPassword = await bcrypt.hash(`google:${verification.google_sub}:${Date.now()}`, 10);
            const [result] = await pool.execute(
                'INSERT INTO users (email, password) VALUES (?, ?)',
                [verification.email, syntheticPassword]
            );
            const [newUsers] = await pool.execute('SELECT * FROM users WHERE id = ?', [result.insertId]);
            user = newUsers[0];
        }

        return res.json({
            message: 'Google sign-in successful.',
            user: mapUser(user)
        });
    } catch (err) {
        return res.status(500).json({ error: 'Verification failed.' });
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
            'SELECT id, email, gender, nickname, partner_nickname, relationship_date, partner_user_id FROM users WHERE id = ?',
            [userId]
        );
        res.json({ message: 'Nicknames updated successfully.', user: mapUser(rows[0]) });
    } catch (err) {
        res.status(500).json({ error: 'Database error.' });
    }
});

// Update gender API
app.post('/api/user/gender', async (req, res) => {
    const { userId, gender } = req.body;
    const allowed = ['male', 'female', 'others'];
    if (!userId || !allowed.includes(gender)) {
        return res.status(400).json({ error: 'User ID and valid gender are required.' });
    }

    try {
        const [result] = await pool.execute(
            'UPDATE users SET gender = ? WHERE id = ?',
            [gender, userId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const [rows] = await pool.execute(
            'SELECT id, email, gender, nickname, partner_nickname, relationship_date, partner_user_id FROM users WHERE id = ?',
            [userId]
        );
        res.json({ message: 'Gender updated successfully.', user: mapUser(rows[0]) });
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
            'SELECT id, email, gender, nickname, partner_nickname, relationship_date, partner_user_id FROM users WHERE id = ?',
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
            `SELECT id, email, gender, nickname, partner_nickname, relationship_date, partner_user_id,
                    latitude, longitude, location_updated_at
             FROM users WHERE id = ?`,
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

// Save current user location from browser GPS
app.post('/api/location/update', async (req, res) => {
    const userId = Number(req.body.userId);
    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);

    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ error: 'Valid user ID is required.' });
    }
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return res.status(400).json({ error: 'Valid latitude and longitude are required.' });
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return res.status(400).json({ error: 'Latitude/longitude out of range.' });
    }

    try {
        const [result] = await pool.execute(
            `UPDATE users
             SET latitude = ?, longitude = ?, location_updated_at = NOW()
             WHERE id = ?`,
            [latitude, longitude, userId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }
        return res.json({ message: 'Location updated successfully.' });
    } catch (err) {
        return res.status(500).json({ error: 'Database error.' });
    }
});

// Get current + partner location and distance between them
app.get('/api/location/:userId', async (req, res) => {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ error: 'Invalid user ID.' });
    }

    try {
        const [rows] = await pool.execute(
            `SELECT id, nickname, partner_user_id, latitude, longitude, location_updated_at
             FROM users
             WHERE id = ?`,
            [userId]
        );
        if (!rows.length) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const currentUser = rows[0];
        const partnerUserId = Number(currentUser.partner_user_id || 0);
        let partner = null;
        if (partnerUserId) {
            const [partnerRows] = await pool.execute(
                `SELECT id, nickname, latitude, longitude, location_updated_at
                 FROM users
                 WHERE id = ?`,
                [partnerUserId]
            );
            partner = partnerRows[0] || null;
        }

        let distanceKm = null;
        if (
            currentUser.latitude != null
            && currentUser.longitude != null
            && partner
            && partner.latitude != null
            && partner.longitude != null
        ) {
            distanceKm = haversineKm(
                Number(currentUser.latitude),
                Number(currentUser.longitude),
                Number(partner.latitude),
                Number(partner.longitude)
            );
        }

        return res.json({
            self: {
                id: currentUser.id,
                nickname: currentUser.nickname || 'You',
                latitude: currentUser.latitude != null ? Number(currentUser.latitude) : null,
                longitude: currentUser.longitude != null ? Number(currentUser.longitude) : null,
                updated_at: currentUser.location_updated_at || null
            },
            partner: partner
                ? {
                    id: partner.id,
                    nickname: partner.nickname || 'Partner',
                    latitude: partner.latitude != null ? Number(partner.latitude) : null,
                    longitude: partner.longitude != null ? Number(partner.longitude) : null,
                    updated_at: partner.location_updated_at || null
                }
                : null,
            distance_km: distanceKm != null ? Number(distanceKm.toFixed(2)) : null
        });
    } catch (err) {
        return res.status(500).json({ error: 'Database error.' });
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

// Save or update user profile picture
app.post('/api/user/profile-picture', async (req, res) => {
    const { userId, imageData } = req.body;
    if (!userId || !imageData || !imageData.trim()) {
        return res.status(400).json({ error: 'User ID and image are required.' });
    }

    try {
        await pool.execute(
            `INSERT INTO user_profile_photos (user_id, image_data)
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE image_data = VALUES(image_data)`,
            [userId, imageData]
        );
        res.status(201).json({ message: 'Profile picture saved successfully.' });
    } catch (err) {
        res.status(500).json({ error: 'Database error.' });
    }
});

// Get user profile picture by user
app.get('/api/user/profile-picture/:userId', async (req, res) => {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ error: 'Invalid user ID.' });
    }

    try {
        const [rows] = await pool.execute(
            'SELECT id, user_id, image_data FROM user_profile_photos WHERE user_id = ?',
            [userId]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'No profile picture found.' });
        }
        res.json({ photo: rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'Database error.' });
    }
});

// Create a pairing code for current user
app.post('/api/pairing/create-code', async (req, res) => {
    const userId = Number(req.body.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ error: 'Valid user ID is required.' });
    }

    try {
        let code = generatePairingCode();
        for (let i = 0; i < 5; i += 1) {
            const [rows] = await pool.execute('SELECT id FROM pairing_codes WHERE code = ?', [code]);
            if (rows.length === 0) break;
            code = generatePairingCode();
        }

        await pool.execute('DELETE FROM pairing_codes WHERE owner_user_id = ? AND status = "active"', [userId]);
        await pool.execute(
            'INSERT INTO pairing_codes (code, owner_user_id, status) VALUES (?, ?, "active")',
            [code, userId]
        );
        res.status(201).json({ code, message: 'Pairing code created.' });
    } catch (err) {
        res.status(500).json({ error: 'Database error.' });
    }
});

// Connect current user to code owner
app.post('/api/pairing/connect', async (req, res) => {
    const userId = Number(req.body.userId);
    const code = String(req.body.code || '').trim().toUpperCase();
    if (!Number.isInteger(userId) || userId <= 0 || !code) {
        return res.status(400).json({ error: 'Valid user ID and code are required.' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [codeRows] = await connection.execute(
            'SELECT id, owner_user_id, status FROM pairing_codes WHERE code = ? FOR UPDATE',
            [code]
        );
        if (codeRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Pairing code not found.' });
        }

        const pair = codeRows[0];
        if (pair.status !== 'active') {
            await connection.rollback();
            return res.status(400).json({ error: 'Pairing code has already been used.' });
        }
        if (Number(pair.owner_user_id) === userId) {
            await connection.rollback();
            return res.status(400).json({ error: 'You cannot use your own pairing code.' });
        }

        await connection.execute(
            'UPDATE users SET partner_user_id = ? WHERE id = ?',
            [userId, pair.owner_user_id]
        );
        await connection.execute(
            'UPDATE users SET partner_user_id = ? WHERE id = ?',
            [pair.owner_user_id, userId]
        );
        await connection.execute(
            `UPDATE pairing_codes
             SET status = 'connected', connected_user_id = ?, connected_at = NOW()
             WHERE id = ?`,
            [userId, pair.id]
        );

        const [rows] = await connection.execute(
            'SELECT id, email, gender, nickname, partner_nickname, relationship_date, partner_user_id FROM users WHERE id = ?',
            [userId]
        );

        await connection.commit();
        return res.json({
            message: 'Connected with your partner successfully.',
            user: mapUser(rows[0])
        });
    } catch (err) {
        await connection.rollback();
        return res.status(500).json({ error: 'Database error.' });
    } finally {
        connection.release();
    }
});

// Save or update user's latest drawing
app.post('/api/drawing/save', async (req, res) => {
    const userId = Number(req.body.userId);
    const imageData = String(req.body.imageData || '');

    if (!Number.isInteger(userId) || userId <= 0 || !imageData.trim()) {
        return res.status(400).json({ error: 'Valid user ID and drawing image are required.' });
    }

    try {
        await pool.execute(
            `INSERT INTO shared_drawings (user_id, image_data)
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE image_data = VALUES(image_data)`,
            [userId, imageData]
        );
        return res.status(201).json({ message: 'Drawing saved successfully.' });
    } catch (err) {
        return res.status(500).json({ error: 'Database error.' });
    }
});

// Get current user's latest drawing
app.get('/api/drawing/self/:userId', async (req, res) => {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ error: 'Invalid user ID.' });
    }

    try {
        const [rows] = await pool.execute(
            'SELECT image_data, updated_at FROM shared_drawings WHERE user_id = ?',
            [userId]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'No drawing found.' });
        }
        return res.json({ drawing: rows[0] });
    } catch (err) {
        return res.status(500).json({ error: 'Database error.' });
    }
});

// Get partner's latest drawing
app.get('/api/drawing/partner/:userId', async (req, res) => {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ error: 'Invalid user ID.' });
    }

    try {
        const [userRows] = await pool.execute(
            'SELECT partner_user_id FROM users WHERE id = ?',
            [userId]
        );
        if (userRows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const partnerUserId = Number(userRows[0].partner_user_id || 0);
        if (!partnerUserId) {
            return res.status(400).json({ error: 'User is not paired yet.' });
        }

        const [rows] = await pool.execute(
            'SELECT image_data, updated_at FROM shared_drawings WHERE user_id = ?',
            [partnerUserId]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'No partner drawing found yet.' });
        }
        return res.json({ drawing: rows[0] });
    } catch (err) {
        return res.status(500).json({ error: 'Database error.' });
    }
});

// Upload a shared slideshow photo for both paired users.
app.post('/api/slideshow/upload', async (req, res) => {
    const userId = Number(req.body.userId);
    const imageData = String(req.body.imageData || '');
    const caption = String(req.body.caption || '').trim();
    if (!Number.isInteger(userId) || userId <= 0 || !imageData.trim()) {
        return res.status(400).json({ error: 'Valid user ID and image are required.' });
    }

    try {
        const [userRows] = await pool.execute(
            'SELECT partner_user_id FROM users WHERE id = ?',
            [userId]
        );
        if (!userRows.length) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const partnerUserId = Number(userRows[0].partner_user_id || 0);
        if (!partnerUserId) {
            return res.status(400).json({ error: 'Pair with your partner before uploading shared photos.' });
        }

        const pairUserA = Math.min(userId, partnerUserId);
        const pairUserB = Math.max(userId, partnerUserId);
        await pool.execute(
            `INSERT INTO shared_slideshow_photos (pair_user_a, pair_user_b, uploaded_by, caption, image_data)
             VALUES (?, ?, ?, ?, ?)`,
            [pairUserA, pairUserB, userId, caption || null, imageData]
        );
        return res.status(201).json({ message: 'Photo added to shared slideshow.' });
    } catch (err) {
        console.error('Slideshow upload DB error:', err.message);
        if (err.code === 'ER_NET_PACKET_TOO_LARGE') {
            return res.status(413).json({ error: 'Image is too large. Please upload a smaller photo.' });
        }
        return res.status(500).json({ error: 'Database error.' });
    }
});

// Get shared slideshow photos for current user and partner.
app.get('/api/slideshow/:userId', async (req, res) => {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ error: 'Invalid user ID.' });
    }

    try {
        const [userRows] = await pool.execute(
            'SELECT partner_user_id FROM users WHERE id = ?',
            [userId]
        );
        if (!userRows.length) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const partnerUserId = Number(userRows[0].partner_user_id || 0);
        if (!partnerUserId) {
            return res.status(400).json({ error: 'User is not paired yet.' });
        }

        const pairUserA = Math.min(userId, partnerUserId);
        const pairUserB = Math.max(userId, partnerUserId);
        const [rows] = await pool.execute(
            `SELECT id, image_data, caption, uploaded_by, created_at
             FROM shared_slideshow_photos
             WHERE pair_user_a = ? AND pair_user_b = ?
             ORDER BY created_at DESC`,
            [pairUserA, pairUserB]
        );

        return res.json({ photos: rows });
    } catch (err) {
        console.error('Slideshow fetch DB error:', err.message);
        return res.status(500).json({ error: 'Database error.' });
    }
});

// Delete one slideshow photo (allowed for either partner in the pair).
app.delete('/api/slideshow/:photoId', async (req, res) => {
    const photoId = Number(req.params.photoId);
    const userId = Number(req.body.userId);
    if (!Number.isInteger(photoId) || photoId <= 0 || !Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ error: 'Valid photo ID and user ID are required.' });
    }

    try {
        const [userRows] = await pool.execute(
            'SELECT partner_user_id FROM users WHERE id = ?',
            [userId]
        );
        if (!userRows.length) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const partnerUserId = Number(userRows[0].partner_user_id || 0);
        if (!partnerUserId) {
            return res.status(400).json({ error: 'User is not paired yet.' });
        }

        const pairUserA = Math.min(userId, partnerUserId);
        const pairUserB = Math.max(userId, partnerUserId);
        const [result] = await pool.execute(
            `DELETE FROM shared_slideshow_photos
             WHERE id = ? AND pair_user_a = ? AND pair_user_b = ?`,
            [photoId, pairUserA, pairUserB]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Photo not found.' });
        }
        return res.json({ message: 'Photo removed from slideshow.' });
    } catch (err) {
        console.error('Slideshow delete DB error:', err.message);
        return res.status(500).json({ error: 'Database error.' });
    }
});

setupDatabase()
    .then(() => {
        if (mailTransporter) {
            mailTransporter.verify()
                .then(() => {
                    console.log('SMTP transporter is ready.');
                })
                .catch((err) => {
                    console.error('SMTP configuration check failed:', err.message);
                });
        } else {
            console.warn('SMTP is not configured. OTP emails will be disabled.');
        }

        httpServer.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Database setup failed:', err.message);
        process.exit(1);
    });
