// server.js - SnugOS Dedicated API Server with Profiles & Follows and General File Storage

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
            background_url TEXT,
            bio TEXT
        );
    `;
    const addBioColumnQuery = `
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
    `;
    // Rename followers table to friends if it exists, or create friends table
    const renameFollowersTableQuery = `
        ALTER TABLE followers RENAME TO friends;
    `;
    const renameFollowerIdColumnQuery = `
        ALTER TABLE friends RENAME COLUMN follower_id TO user_id;
    `;
    const renameFollowedIdColumnQuery = `
        ALTER TABLE friends RENAME COLUMN followed_id TO friend_id;
    `;
    const createFriendsTableQuery = `
        CREATE TABLE IF NOT EXISTS friends (
            user_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            friend_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, friend_id)
        );
    `;
    // Query to create the messages table
    const createMessagesTableQuery = `
        CREATE TABLE IF NOT EXISTS messages (
            id SERIAL PRIMARY KEY,
            sender_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            recipient_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            read BOOLEAN DEFAULT FALSE
        );
    `;
    // Query to create the user_files table for general file storage
    const createUserFilesTableQuery = `
        CREATE TABLE IF NOT EXISTS user_files (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            file_name VARCHAR(255) NOT NULL,
            s3_key TEXT NOT NULL UNIQUE,
            s3_url TEXT NOT NULL UNIQUE,
            mime_type VARCHAR(100),
            file_size INTEGER,
            is_public BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;

    try {
        await pool.query(createProfilesTableQuery);
        await pool.query(addBioColumnQuery);
        // Attempt to rename table/columns first, if they exist from previous deploys
        try {
            await pool.query(renameFollowersTableQuery);
            await pool.query(renameFollowerIdColumnQuery);
            await pool.query(renameFollowedIdColumnQuery);
            console.log('[DB] Renamed followers table to friends.');
        } catch (err) {
            // If rename fails (e.g., table doesn't exist, or columns already renamed), create the table
            console.log('[DB] Followers table/columns not found or already renamed. Creating friends table if not exists.');
            await pool.query(createFriendsTableQuery); // Create the new table if it doesn't exist under 'friends' name
        }
        await pool.query(createMessagesTableQuery);
        await pool.query(createUserFilesTableQuery); // Create the new user_files table
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
        const profileResult = await pool.query("SELECT id, username, created_at, background_url, bio FROM profiles WHERE id = $1", [userId]); // Include bio
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

app.put('/api/profiles/:username', authenticateToken, async (request, response) => {
    const { username } = request.params;
    const { bio } = request.body;

    if (typeof bio !== 'string') {
        return response.status(400).json({ success: false, message: "Bio must be a string." });
    }
    if (bio.length > 500) {
        return response.status(400).json({ success: false, message: "Bio cannot exceed 500 characters." });
    }

    try {
        const profileToUpdateResult = await pool.query("SELECT id, username FROM profiles WHERE username = $1", [username]);
        const profileToUpdate = profileToUpdateResult.rows[0];

        if (!profileToUpdate) {
            return response.status(404).json({ success: false, message: "Profile to update not found." });
        }

        if (request.user.id !== profileToUpdate.id) {
            return response.status(403).json({ success: false, message: "Unauthorized: You can only edit your own profile." });
        }

        const updateQuery = 'UPDATE profiles SET bio = $1 WHERE id = $2 RETURNING id, username, created_at, background_url, bio';
        const result = await pool.query(updateQuery, [bio, request.user.id]);
        const updatedProfile = result.rows[0];

        response.status(200).json({ success: true, message: "Profile updated successfully.", profile: { id: updatedProfile.id, username: updatedProfile.username, memberSince: updatedProfile.created_at, backgroundUrl: updatedProfile.background_url, bio: updatedProfile.bio } });

    } catch (error) {
        console.error("Error updating profile in DB:", error);
        response.status(500).json({ success: false, message: 'Server error during profile update.' });
    }
});


// === FRIEND SYSTEM ENDPOINTS ===

app.post('/api/profiles/:username/friend', authenticateToken, async (request, response) => {
    try {
        const userId = request.user.id; // The user who is adding the friend
        const friendUsername = request.params.username; // The username of the friend to add

        // Get the ID of the user to be added as a friend
        const friendResult = await pool.query("SELECT id FROM profiles WHERE username = $1", [friendUsername]);
        if (friendResult.rows.length === 0) {
            return response.status(404).json({ success: false, message: 'User to add as friend not found.' });
        }
        const friendId = friendResult.rows[0].id;

        if (userId === friendId) {
            return response.status(400).json({ success: false, message: 'You cannot add yourself as a friend.' });
        }

        // Insert the friend relationship (user_id adds friend_id)
        await pool.query(
            "INSERT INTO friends (user_id, friend_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            [userId, friendId]
        );

        response.json({ success: true, message: `You are now friends with ${friendUsername}.` });

    } catch (error) {
        console.error("[Add Friend] Error:", error);
        response.status(500).json({ success: false, message: 'Server error while trying to add friend.' });
    }
});

app.delete('/api/profiles/:username/friend', authenticateToken, async (request, response) => {
    try {
        const userId = request.user.id; // The user who is removing the friend
        const friendUsername = request.params.username; // The username of the friend to remove

        const friendResult = await pool.query("SELECT id FROM profiles WHERE username = $1", [friendUsername]);
        if (friendResult.rows.length === 0) {
            return response.status(404).json({ success: false, message: 'User to remove as friend not found.' });
        }
        const friendId = friendResult.rows[0].id;

        // Delete the friend relationship
        await pool.query(
            "DELETE FROM friends WHERE user_id = $1 AND friend_id = $2",
            [userId, friendId]
        );

        response.json({ success: true, message: `You have removed ${friendUsername} as a friend.` });

    } catch (error) {
        console.error("[Remove Friend] Error:", error);
        response.status(500).json({ success: false, message: 'Server error while trying to remove friend.' });
    }
});

// GET /api/profiles/:username/friend-status - Check if the current user is friends with someone
app.get('/api/profiles/:username/friend-status', authenticateToken, async (request, response) => {
    try {
        const userId = request.user.id; // The current logged-in user
        const checkFriendUsername = request.params.username; // The username whose friend status is being checked

        const checkFriendResult = await pool.query("SELECT id FROM profiles WHERE username = $1", [checkFriendUsername]);
        if (checkFriendResult.rows.length === 0) {
            return response.status(404).json({ success: false, message: 'User not found.' });
        }
        const checkFriendId = checkFriendResult.rows[0].id;

        const friendStatusResult = await pool.query(
            "SELECT 1 FROM friends WHERE user_id = $1 AND friend_id = $2",
            [userId, checkFriendId]
        );

        response.json({ success: true, isFriend: friendStatusResult.rows.length > 0 });
    } catch (error) {
        console.error("[Friend Status] Error:", error);
        response.status(500).json({ success: false, message: 'Server error while checking friend status.' });
    }
});


// === Messaging Endpoints ===

app.post('/api/messages', authenticateToken, async (request, response) => {
    const { recipientUsername, content } = request.body;
    const senderId = request.user.id;

    if (!recipientUsername || !content || content.trim() === '') {
        return response.status(400).json({ success: false, message: 'Recipient username and message content are required.' });
    }

    try {
        const recipientResult = await pool.query("SELECT id FROM profiles WHERE username = $1", [recipientUsername]);
        if (recipientResult.rows.length === 0) {
            return response.status(404).json({ success: false, message: 'Recipient not found.' });
        }
        const recipientId = recipientResult.rows[0].id;

        const insertMessageQuery = `
            INSERT INTO messages (sender_id, recipient_id, content)
            VALUES ($1, $2, $3) RETURNING *;
        `;
        const result = await pool.query(insertMessageQuery, [senderId, recipientId, content]);
        const newMessage = result.rows[0];

        response.status(201).json({ success: true, message: 'Message sent successfully.', messageData: newMessage });

    } catch (error) {
        console.error("[Messaging] Error sending message:", error);
        response.status(500).json({ success: false, message: 'Server error while sending message.' });
    }
});

// GET /api/messages/sent - Get messages sent by the current user
app.get('/api/messages/sent', authenticateToken, async (request, response) => {
    try {
        const userId = request.user.id;
        const messages = await pool.query(
            "SELECT m.id, s.username as sender_username, r.username as recipient_username, m.content, m.timestamp, m.read " +
            "FROM messages m " +
            "JOIN profiles s ON m.sender_id = s.id " +
            "JOIN profiles r ON m.recipient_id = r.id " +
            "WHERE m.sender_id = $1 ORDER BY m.timestamp DESC",
            [userId]
        );
        response.json({ success: true, messages: messages.rows });
    } catch (error) {
        console.error("[Messaging] Error fetching sent messages:", error);
        response.status(500).json({ success: false, message: 'Server error while fetching sent messages.' });
    }
});

// GET /api/messages/received - Get messages received by the current user
app.get('/api/messages/received', authenticateToken, async (request, response) => {
    try {
        const userId = request.user.id;
        const messages = await pool.query(
            "SELECT m.id, s.username as sender_username, r.username as recipient_username, m.content, m.timestamp, m.read " +
            "FROM messages m " +
            "JOIN profiles s ON m.sender_id = s.id " +
            "JOIN profiles r ON m.recipient_id = r.id " +
            "WHERE m.recipient_id = $1 ORDER BY m.timestamp DESC",
            [userId]
        );
        response.json({ success: true, messages: messages.rows });
    } catch (error) {
        console.error("[Messaging] Error fetching received messages:", error);
        response.status(500).json({ success: false, message: 'Server error while fetching received messages.' });
    }
});


// === General File Storage Endpoints ===

app.post('/api/files/upload', authenticateToken, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file provided for upload.' });
    }
    const userId = req.user.id;
    const { is_public } = req.body; // Expect 'true' or 'false' string from form-data

    try {
        const file = req.file;
        const s3Key = `user-files/${userId}/${Date.now()}-${file.originalname.replace(/ /g, '_')}`; // Use originalname and replace spaces
        
        const uploadParams = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: s3Key,
            Body: file.buffer,
            ContentType: file.mimetype,
            // ACL: 'public-read' // REMOVED: Managed by bucket policy now
        };

        const data = await s3.upload(uploadParams).promise(); // Upload to S3

        // Save file metadata to user_files table
        const insertFileQuery = `
            INSERT INTO user_files (user_id, file_name, s3_key, s3_url, mime_type, file_size, is_public)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, file_name, s3_url, mime_type, file_size, is_public, created_at;
        `;
        const result = await pool.query(insertFileQuery, [
            userId,
            file.originalname,
            s3Key,
            data.Location, // S3 URL
            file.mimetype,
            file.size,
            is_public === 'true' // Convert string 'true'/'false' to boolean
        ]);
        const uploadedFile = result.rows[0];

        res.status(201).json({ success: true, message: 'File uploaded and metadata saved.', file: uploadedFile });

    } catch (error) {
        console.error("[File Upload] Error:", error);
        res.status(500).json({ success: false, message: 'Server error during file upload.' });
    }
});

// GET /api/files/my - Get all files owned by the current user
app.get('/api/files/my', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const query = "SELECT id, file_name, s3_url, mime_type, file_size, is_public, created_at FROM user_files WHERE user_id = $1 ORDER BY created_at DESC";
        const result = await pool.query(query, [userId]);
        res.json({ success: true, files: result.rows });
    } catch (error) {
        console.error("[File Listing] Error fetching user files:", error);
        res.status(500).json({ success: false, message: 'Server error while fetching your files.' });
    }
});

// PUT /api/files/:fileId - Update file metadata (e.g., is_public status)
app.put('/api/files/:fileId', authenticateToken, async (req, res) => {
    const fileId = req.params.fileId;
    const userId = req.user.id;
    const { is_public } = req.body; // Expect boolean from frontend

    if (typeof is_public !== 'boolean') {
        return res.status(400).json({ success: false, message: 'is_public must be a boolean.' });
    }

    try {
        const query = `
            UPDATE user_files
            SET is_public = $1
            WHERE id = $2 AND user_id = $3
            RETURNING id, file_name, is_public;
        `;
        const result = await pool.query(query, [is_public, fileId, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'File not found or unauthorized.' });
        }

        res.json({ success: true, message: 'File status updated.', file: result.rows[0] });

    } catch (error) {
        console.error("[File Update] Error updating file status:", error);
        res.status(500).json({ success: false, message: 'Server error while updating file status.' });
    }
});

// DELETE /api/files/:fileId - Delete a file (from DB and S3)
app.delete('/api/files/:fileId', authenticateToken, async (req, res) => {
    const fileId = req.params.fileId;
    const userId = req.user.id;

    try {
        // 1. Get file metadata to get S3 key
        const getFileQuery = "SELECT s3_key FROM user_files WHERE id = $1 AND user_id = $2";
        const fileResult = await pool.query(getFileQuery, [fileId, userId]);
        if (fileResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'File not found or unauthorized.' });
        }
        const s3Key = fileResult.rows[0].s3_key;

        // 2. Delete from S3
        const deleteS3Params = { Bucket: process.env.S3_BUCKET_NAME, Key: s3Key };
        await s3.deleteObject(deleteS3Params).promise();
        console.log(`[File Delete] Deleted from S3: ${s3Key}`);

        // 3. Delete metadata from DB
        const deleteDbQuery = "DELETE FROM user_files WHERE id = $1 AND user_id = $2";
        await pool.query(deleteDbQuery, [fileId, userId]);

        res.json({ success: true, message: 'File deleted successfully.' });

    } catch (error) {
        console.error("[File Delete] Error deleting file:", error);
        res.status(500).json({ success: false, message: 'Server error while deleting file.' });
    }
});


// === Start the Server ===
app.listen(PORT, () => {
    console.log(`SnugOS server is listening on port ${PORT}`);
    initializeDatabase();
});
