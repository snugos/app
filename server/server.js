// server.js - SnugOS Dedicated API Server with Profiles, Projects, and more

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const multer = require('multer');
const AWS = require('aws-sdk');

// --- Configuration ---
const app = express();
const PORT = process.env.PORT || 3000;

// Set up database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Set up S3 connection for file storage
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

// Set up multer for in-memory file storage
const upload = multer({ storage: multer.memoryStorage() });

// --- Database Initialization ---
const initializeDatabase = async () => {
    // Query to create the 'profiles' table with new columns
    const createProfilesTableQuery = `
        CREATE TABLE IF NOT EXISTS profiles (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password_hash VARCHAR(100) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            background_url TEXT,
            bio TEXT,
            avatar_url TEXT
        );
    `;
    // Queries to add columns if they don't exist, for backward compatibility
    const alterTableQueries = [
        `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS background_url TEXT;`,
        `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;`,
        `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;`
    ];
    
    try {
        await pool.query(createProfilesTableQuery);
        for (const query of alterTableQueries) {
            await pool.query(query);
        }
        console.log('[DB] "profiles" table checked/created successfully.');
    } catch (err) {
        console.error('[DB] Error initializing database table:', err.stack);
    }
};

// --- Middleware ---
app.use(express.json({ limit: '50mb' })); // Increase body limit for project data
app.use(cors());

// Authentication Middleware to protect routes
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// === API Endpoints ===

// --- User Account Endpoints ---
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password || password.length < 6) {
            return res.status(400).json({ message: 'Username and a password of at least 6 characters are required.' });
        }
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const newUser = await pool.query(
            "INSERT INTO profiles (username, password_hash) VALUES ($1, $2) RETURNING id, username",
            [username, passwordHash]
        );
        res.status(201).json(newUser.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ message: 'Username already exists.' });
        }
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await pool.query("SELECT * FROM profiles WHERE username = $1", [username]);
        const user = result.rows[0];
        if (!user) return res.status(401).json({ message: 'Invalid credentials.' });

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials.' });

        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '30d' });
        res.json({ token, user: { id: user.id, username: user.username } });
    } catch (err) {
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// --- Profile Customization Endpoints ---
app.get('/api/profiles/me', authenticateToken, async (req, res) => {
    try {
        const profileResult = await pool.query("SELECT id, username, created_at, background_url, bio, avatar_url FROM profiles WHERE id = $1", [req.user.id]);
        res.json(profileResult.rows[0]);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching user profile.' });
    }
});

app.put('/api/profiles/me', authenticateToken, async (req, res) => {
    try {
        const { bio } = req.body; // Add other fields like social links later
        const updatedProfile = await pool.query(
            "UPDATE profiles SET bio = $1 WHERE id = $2 RETURNING id, username, bio",
            [bio, req.user.id]
        );
        res.json(updatedProfile.rows[0]);
    } catch (err) {
        res.status(500).json({ message: 'Error updating profile.' });
    }
});

app.put('/api/profiles/me/background', authenticateToken, upload.single('backgroundFile'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
    try {
        const fileName = `backgrounds/${req.user.id}-${Date.now()}-${req.file.originalname}`;
        const uploadParams = { Bucket: process.env.S3_BUCKET_NAME, Key: fileName, Body: req.file.buffer, ACL: 'public-read', ContentType: req.file.mimetype };
        const data = await s3.upload(uploadParams).promise();
        await pool.query("UPDATE profiles SET background_url = $1 WHERE id = $2", [data.Location, req.user.id]);
        res.json({ backgroundUrl: data.Location });
    } catch (err) {
        res.status(500).json({ message: 'Error uploading file.' });
    }
});

// --- Start the Server ---
app.listen(PORT, () => {
    console.log(`SnugOS server is listening on port ${PORT}`);
    initializeDatabase();
});
