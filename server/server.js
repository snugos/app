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
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS profiles (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password_hash VARCHAR(100) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            background_url TEXT
        );
    `;
    const alterTableQuery = `
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS background_url TEXT;
    `;
    try {
        await pool.query(createTableQuery);
        await pool.query(alterTableQuery);
        console.log('[DB] "profiles" table checked/created successfully.');
    } catch (err) {
        console.error('[DB] Error initializing database table:', err.stack);
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

// [Existing /api/register and /api/login endpoints remain here...]
// ...

// NEW: Endpoint to update a user's background
app.put('/api/profile/background', authenticateToken, upload.single('backgroundFile'), async (request, response) => {
    if (!request.file) {
        return response.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    try {
        const file = request.file;
        const userId = request.user.id; // Get user ID from the authenticated token
        const fileName = `backgrounds/${userId}-${Date.now()}-${file.originalname}`;

        const uploadParams = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: fileName,
            Body: file.buffer,
            ACL: 'public-read', // Make the file publicly accessible
            ContentType: file.mimetype
        };

        const data = await s3.upload(uploadParams).promise();
        const backgroundUrl = data.Location; // The public URL of the uploaded file

        // Save the URL to the user's profile in the database
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


// UPDATED: Public Profile Endpoint now includes background_url
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
                backgroundUrl: profile.background_url // Send the background URL
            },
            projects: [] 
        });

    } catch (error) {
        console.error("[Get Profile] Error:", error);
        response.status(500).json({ success: false, message: 'Server error while fetching profile.' });
    }
});

// ... your /api/register, /api/login, and /api/youtube endpoints ...

// === Start the Server ===
app.listen(PORT, () => {
    console.log(`SnugOS server is listening on port ${PORT}`);
    initializeDatabase();
});
