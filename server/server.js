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
    // NEW: Add bio column if not exists
    const addBioColumnQuery = `
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
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
    try {
        await pool.query(createProfilesTableQuery);
        await pool.query(addBioColumnQuery); // Execute the query to add bio column
        await pool.query(createFollowersTableQuery);
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
// ... your /api/register, /api/login, /api/profile/me, etc. endpoints ...
app.post('/api/register', async (request, response) => {
    try {
        const { username, password } = request.body;
        if (!username || !password || password.length < 6) {
            return response.status(400).json({ success: false, message: 'Username and a password of at least 6 characters are required.' });
        }
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const newProfile = await pool.query("INSERT INTO profiles (username, password_hash) VALUES ($1, $2) RETURNING id, username", [username, passwordHash]);
        response.status(201).json({ success: true, user: newProfile.rows[0] });
    } catch (error) {
        if (error.code === '23505') {
            return response.status(409).json({ success: false, message: 'Username already exists.' });
        }
        response.status(500).json({ success: false, message: 'Server error during registration.' });
    }
});
app.post('/api/login', async (request, response) => {
    try {
        const { username, password } = request.body;
        const result = await pool.query("SELECT * FROM profiles WHERE username = $1", [username]);
        const profile = result.rows[0];
        if (!profile) return response.status(401).json({ success: false, message: 'Invalid credentials.' });
        const isMatch = await bcrypt.compare(password, profile.password_hash);
        if (!isMatch) return response.status(401).json({ success: false, message: 'Invalid credentials.' });
        const token = jwt.sign({ id: profile.id, username: profile.username }, process.env.JWT_SECRET, { expiresIn: '30d' });
        response.json({ success: true, token, user: { id: profile.id, username: profile.username } });
    } catch (error) {
        response.status(500).json({ success: false, message: 'Server error during login.' });
    }
});
app.get('/api/profile/me', authenticateToken, async (request, response) => {
    try {
        const userId = request.user.id;
        const profileResult = await pool.query("SELECT id, username, created_at, background_url FROM profiles WHERE id = $1", [userId]);
        const profile = profileResult.rows[0];
        if (!profile) return response.status(404).json({ success: false, message: 'Current user profile not found.' });
        response.json({ success: true, profile });
    } catch (error) {
        response.status(500).json({ success: false, message: 'Server error while fetching current user profile.' });
    }
});
app.put('/api/profile/background', authenticateToken, upload.single('backgroundFile'), async (request, response) => {
    if (!request.file) return response.status(400).json({ success: false, message: 'No file uploaded.' });
    try {
        const file = request.file;
        const userId = request.user.id;
        const fileName = `backgrounds/${userId}-${Date.now()}-${file.originalname}`;
        const uploadParams = { Bucket: process.env.S3_BUCKET_NAME, Key: fileName, Body: file.buffer, ACL: 'public-read', ContentType: file.mimetype };
        const data = await s3.upload(uploadParams).promise();
        const backgroundUrl = data.Location;
        await pool.query("UPDATE profiles SET background_url = $1 WHERE id = $2", [backgroundUrl, userId]);
        response.json({ success: true, backgroundUrl });
    } catch (error) {
        response.status(500).json({ success: false, message: 'Error uploading file.' });
    }
});
app.get('/api/profiles/:username', async (request, response) => {
    try {
        const { username } = request.params;
        // Also select the bio here
        const profileResult = await pool.query("SELECT id, username, created_at, background_url, bio FROM profiles WHERE username = $1", [username]);
        const profile = profileResult.rows[0];
        if (!profile) return response.status(404).json({ success: false, message: 'Profile not found.' });
        response.json({ success: true, profile: { id: profile.id, username: profile.username, memberSince: profile.created_at, backgroundUrl: profile.background_url, bio: profile.bio }, projects: [] });
    } catch (error) {
        response.status(500).json({ success: false, message: 'Server error while fetching profile.' });
    }
});

// === NEW: PUT /api/profiles/:username - Update Profile ===
app.put('/api/profiles/:username', authenticateToken, async (request, response) => {
    const { username } = request.params; // Get username from URL
    const { bio } = request.body; // Get bio from request body

    // --- Basic Validation ---
    if (typeof bio !== 'string') { // bio must be a string
        return response.status(400).json({ success: false, message: "Bio must be a string." });
    }
    // Limit bio length to prevent abuse (e.g., 500 characters)
    if (bio.length > 500) {
        return response.status(400).json({ success: false, message: "Bio cannot exceed 500 characters." });
    }

    try {
        // --- Authorization Check (Crucial for security) ---
        // Ensure the logged-in user (from token) matches the profile being edited
        const profileToUpdateResult = await pool.query("SELECT id, username FROM profiles WHERE username = $1", [username]);
        const profileToUpdate = profileToUpdateResult.rows[0];

        if (!profileToUpdate) {
            return response.status(404).json({ success: false, message: "Profile to update not found." });
        }

        if (request.user.id !== profileToUpdate.id) { // req.user.id comes from authenticateToken middleware
            return response.status(403).json({ success: false, message: "Unauthorized: You can only edit your own profile." });
        }

        // --- Database Update ---
        // Update the 'bio' column for the user's profile
        const updateQuery = 'UPDATE profiles SET bio = $1 WHERE id = $2 RETURNING id, username, created_at, background_url, bio';
        const result = await pool.query(updateQuery, [bio, request.user.id]); // Use request.user.id for security
        const updatedProfile = result.rows[0];

        // --- Send Success Response ---
        response.status(200).json({ success: true, message: "Profile updated successfully.", profile: { id: updatedProfile.id, username: updatedProfile.username, memberSince: updatedProfile.created_at, backgroundUrl: updatedProfile.background_url, bio: updatedProfile.bio } });

    } catch (error) {
        console.error("Error updating profile in DB:", error);
        response.status(500).json({ success: false, message: "Server error during profile update." });
    }
});

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
