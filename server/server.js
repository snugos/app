// server.js - SnugOS Dedicated API Server with Profiles & Follows

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
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
    // Original profiles table query
    const createProfilesTableQuery = `
        CREATE TABLE IF NOT EXISTS profiles (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password_hash VARCHAR(100) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            background_url TEXT
        );
    `;
    // NEW: Query to create the followers table
    const createFollowersTableQuery = `
        CREATE TABLE IF NOT EXISTS followers (
            follower_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            followed_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (follower_id, followed_id)
        );
    `;
    const alterProfilesTableQuery = `
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS background_url TEXT;
    `;
    try {
        await pool.query(createProfilesTableQuery);
        await pool.query(alterProfilesTableQuery);
        await pool.query(createFollowersTableQuery); // Create the new table
        console.log('[DB] All tables checked/created successfully.');
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

// --- Existing User & Profile Endpoints ---
// ... your /api/register, /api/login, /api/profile/me, /api/profiles/:username, etc. endpoints ...

// === NEW: FOLLOW SYSTEM ENDPOINTS ===

// POST /api/profiles/:username/follow - Follow a user
app.post('/api/profiles/:username/follow', authenticateToken, async (request, response) => {
    try {
        const followerId = request.user.id;
        const followedUsername = request.params.username;

        // Get the ID of the user to be followed
        const followedResult = await pool.query("SELECT id FROM profiles WHERE username = $1", [followedUsername]);
        if (followedResult.rows.length === 0) {
            return response.status(404).json({ success: false, message: 'User to follow not found.' });
        }
        const followedId = followedResult.rows[0].id;

        if (followerId === followedId) {
            return response.status(400).json({ success: false, message: 'You cannot follow yourself.' });
        }

        // Insert the follow relationship
        await pool.query(
            "INSERT INTO followers (follower_id, followed_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            [followerId, followedId]
        );

        response.json({ success: true, message: `You are now following ${followedUsername}.` });

    } catch (error) {
        console.error("[Follow] Error:", error);
        response.status(500).json({ success: false, message: 'Server error while trying to follow user.' });
    }
});

// DELETE /api/profiles/:username/follow - Unfollow a user
app.delete('/api/profiles/:username/follow', authenticateToken, async (request, response) => {
    try {
        const followerId = request.user.id;
        const followedUsername = request.params.username;

        const followedResult = await pool.query("SELECT id FROM profiles WHERE username = $1", [followedUsername]);
        if (followedResult.rows.length === 0) {
            return response.status(404).json({ success: false, message: 'User to unfollow not found.' });
        }
        const followedId = followedResult.rows[0].id;

        // Delete the follow relationship
        await pool.query(
            "DELETE FROM followers WHERE follower_id = $1 AND followed_id = $2",
            [followerId, followedId]
        );

        response.json({ success: true, message: `You have unfollowed ${followedUsername}.` });

    } catch (error) {
        console.error("[Unfollow] Error:", error);
        response.status(500).json({ success: false, message: 'Server error while trying to unfollow user.' });
    }
});

// GET /api/profiles/:username/follow-status - Check if the current user is following someone
app.get('/api/profiles/:username/follow-status', authenticateToken, async (request, response) => {
    try {
        const followerId = request.user.id;
        const followedUsername = request.params.username;

        const followedResult = await pool.query("SELECT id FROM profiles WHERE username = $1", [followedUsername]);
        if (followedResult.rows.length === 0) {
            return response.status(404).json({ success: false, message: 'User not found.' });
        }
        const followedId = followedResult.rows[0].id;

        const followStatusResult = await pool.query(
            "SELECT 1 FROM followers WHERE follower_id = $1 AND followed_id = $2",
            [followerId, followedId]
        );

        response.json({ success: true, isFollowing: followStatusResult.rows.length > 0 });
    } catch (error) {
        console.error("[Follow Status] Error:", error);
        response.status(500).json({ success: false, message: 'Server error while checking follow status.' });
    }
});


// === Start the Server ===
app.listen(PORT, () => {
    console.log(`SnugOS server is listening on port ${PORT}`);
    initializeDatabase();
});
