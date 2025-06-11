// server.js - SnugOS Dedicated API Server with Profiles & Backgrounds

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
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
    const createProfilesTableQuery = `
        CREATE TABLE IF NOT EXISTS profiles (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password_hash VARCHAR(100) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            background_url TEXT
        );
    `;
    const alterProfilesTableQuery = `
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS background_url TEXT;
    `;
    const createFollowersTableQuery = `
        CREATE TABLE IF NOT EXISTS followers (
            follower_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            followed_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (follower_id, followed_id)
        );
    `;
    try {
        await pool.query(createProfilesTableQuery);
        await pool.query(alterProfilesTableQuery);
        await pool.query(createFollowersTableQuery);
        console.log('[DB] All tables checked/created successfully.');
    } catch (err) {
        console.error('[DB] Error initializing database tables:', err.stack);
    }
};

// --- Middleware ---
app.use(express.json());
app.use(cors());

// Authentication Middleware to protect routes
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

    if (token == null) return res.sendStatus(401); // if there isn't any token

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // if token is no longer valid
        req.user = user;
        next();
    });
};

// === API Endpoints ===

// NEW: Keep-alive endpoint for the pinging service
app.get('/api/keep-alive', (request, response) => {
    response.json({ success: true, message: "Server is awake." });
});

// User Registration Endpoint
app.post('/api/register', async (request, response) => {
    try {
        const { username, password } = request.body;
        if (!username || !password || password.length < 6) {
            return response.status(400).json({ success: false, message: 'Username and a password of at least 6 characters are required.' });
        }
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newProfile = await pool.query(
            "INSERT INTO profiles (username, password_hash) VALUES ($1, $2) RETURNING id, username",
            [username, passwordHash]
        );

        response.status(201).json({ success: true, user: newProfile.rows[0] });

    } catch (error) {
        console.error("[Register] Error:", error);
        if (error.code === '23505') {
            return response.status(409).json({ success: false, message: 'Username already exists.' });
        }
        response.status(500).json({ success: false, message: 'Server error during registration.' });
    }
});

// User Login Endpoint
app.post('/api/login', async (request, response) => {
    try {
        const { username, password } = request.body;
        const result = await pool.query("SELECT * FROM profiles WHERE username = $1", [username]);
        const profile = result.rows[0];

        if (!profile) {
            return response.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, profile.password_hash);
        if (!isMatch) {
            return response.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const token = jwt.sign(
            { id: profile.id, username: profile.username },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        response.json({ success: true, token, user: { id: profile.id, username: profile.username } });

    } catch (error) {
        console.error("[Login] Error:", error);
        response.status(500).json({ success: false, message: 'Server error during login.' });
    }
});

// Secure endpoint to get the currently logged-in user's profile
app.get('/api/profile/me', authenticateToken, async (request, response) => {
    try {
        const userId = request.user.id;
        const profileResult = await pool.query(
            "SELECT id, username, created_at, background_url FROM profiles WHERE id = $1",
            [userId]
        );
        const profile = profileResult.rows[0];
        if (!profile) {
            return response.status(404).json({ success: false, message: 'Current user profile not found.' });
        }
        response.json({ success: true, profile });
    } catch (error) {
        console.error("[Get My Profile] Error:", error);
        response.status(500).json({ success: false, message: 'Server error while fetching current user profile.' });
    }
});

// Endpoint to update a user's background
app.put('/api/profile/background', authenticateToken, upload.single('backgroundFile'), async (request, response) => {
    if (!request.file) {
        return response.status(400).json({ success: false, message: 'No file uploaded.' });
    }
    try {
        const file = request.file;
        const userId = request.user.id;
        const fileName = `backgrounds/${userId}-${Date.now()}-${file.originalname}`;

        const uploadParams = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: fileName,
            Body: file.buffer,
            ACL: 'public-read',
            ContentType: file.mimetype
        };

        const data = await s3.upload(uploadParams).promise();
        const backgroundUrl = data.Location;

        await pool.query(
            "UPDATE profiles SET background_url = $1 WHERE id = $2",
            [backgroundUrl, userId]
        );
        response.json({ success: true, backgroundUrl });

    } catch (error) {
        console.error("[Background Upload] Error:", error);
        response.status(500).json({ success: false, message: 'Error uploading file.' });
    }
});

// Public Profile Endpoint
app.get('/api/profiles/:username', async (request, response) => {
    try {
        const { username } = request.params;
        const profileResult = await pool.query(
            "SELECT id, username, created_at, background_url FROM profiles WHERE username = $1",
            [username]
        );
        const profile = profileResult.rows[0];
        if (!profile) {
            return response.status(404).json({ success: false, message: 'Profile not found.' });
        }
        response.json({
            success: true,
            profile: {
                id: profile.id,
                username: profile.username,
                memberSince: profile.created_at,
                backgroundUrl: profile.background_url
            },
            projects: [] 
        });
    } catch (error) {
        console.error("[Get Profile] Error:", error);
        response.status(500).json({ success: false, message: 'Server error while fetching profile.' });
    }
});

// --- Start the Server ---
app.listen(PORT, () => {
    console.log(`SnugOS server is listening on port ${PORT}`);
    initializeDatabase();
});
