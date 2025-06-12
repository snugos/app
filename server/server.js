// server.js - SnugOS Dedicated API Server

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const multer = require('multer');
const AWS = require('aws-sdk');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const upload = multer({ storage: multer.memoryStorage() });

const initializeDatabase = async () => {
    const createProfilesTableQuery = `
        CREATE TABLE IF NOT EXISTS profiles (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password_hash VARCHAR(100) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            background_url TEXT,
            bio TEXT,
            avatar_url TEXT -- NOTE: New column for the profile picture URL
        );
    `;
    // NOTE: Query to add the new column if the table already exists
    const addAvatarUrlColumnQuery = `
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    `;

    // ... (Your other table creation queries remain here)

    try {
        await pool.query(createProfilesTableQuery);
        await pool.query(addAvatarUrlColumnQuery); // Ensure the column exists
        console.log('[DB] Profiles table checked/updated successfully.');
        // ... (rest of your DB initialization)
    } catch (err) {
        console.error('[DB] Error initializing database tables:', err.stack);
    }
};

app.use(express.json());
app.use(cors());

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- User & Profile Endpoints ---

// ... (Your /register and /login endpoints remain unchanged)

// NOTE: New endpoint to handle avatar uploads
app.post('/api/profile/avatar', authenticateToken, upload.single('avatarFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    try {
        const file = req.file;
        const userId = req.user.id;
        const fileName = `avatars/${userId}-${Date.now()}-${file.originalname.replace(/ /g, '_')}`;

        const uploadParams = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: fileName,
            Body: file.buffer,
            ACL: 'public-read', // Make the avatar publicly viewable
            ContentType: file.mimetype
        };

        const data = await s3.upload(uploadParams).promise();
        const avatarUrl = data.Location;

        // Update the user's profile with the new URL
        await pool.query("UPDATE profiles SET avatar_url = $1 WHERE id = $2", [avatarUrl, userId]);

        res.json({ success: true, message: "Avatar updated successfully!", avatar_url: avatarUrl });

    } catch (error) {
        console.error("[Avatar Upload] Error:", error);
        res.status(500).json({ success: false, message: 'Error uploading file.' });
    }
});


// NOTE: Updated profile fetching endpoint to include avatar_url
app.get('/api/profiles/:username', async (request, response) => {
    try {
        const { username } = request.params;
        const profileResult = await pool.query("SELECT id, username, created_at, background_url, bio, avatar_url FROM profiles WHERE username = $1", [username]);
        const profile = profileResult.rows[0];
        
        if (!profile) {
            return response.status(404).json({ success: false, message: 'Profile not found.' });
        }
        
        response.json({ success: true, profile: profile });

    } catch (error) {
        response.status(500).json({ success: false, message: 'Server error while fetching profile.' });
    }
});

// ... (Your other endpoints for friends, files, etc. remain unchanged)

// === Start the Server ===
app.listen(PORT, () => {
    console.log(`SnugOS server is listening on port ${PORT}`);
    initializeDatabase();
});
