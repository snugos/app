// server.js
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
    region: process.env.AWS_REGION,
    signatureVersion: 'v4'
});

// Multer storage: memoryStorage keeps files in buffer. For truly huge files,
// direct streaming to S3 or diskStorage might be needed, but this handles
// most common file sizes without explicit client-side limits.
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
            avatar_url TEXT
        );
    `;
    const addAvatarUrlColumnQuery = `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;`;

    const createUserFilesTableQuery = `
        CREATE TABLE IF NOT EXISTS user_files (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            path TEXT,
            file_name VARCHAR(255) NOT NULL,
            s3_key TEXT NOT NULL UNIQUE,
            s3_url TEXT NOT NULL UNIQUE,
            mime_type VARCHAR(100),
            file_size BIGINT,
            is_public BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;
    const addPathColumnQuery = `ALTER TABLE user_files ADD COLUMN IF NOT EXISTS path TEXT;`;
    const addIsPublicColumnQuery = `ALTER TABLE user_files ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;`;

    const createFriendsTableQuery = `
        CREATE TABLE IF NOT EXISTS friends (
            user_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            friend_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, friend_id)
        );
    `;
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

    try {
        await pool.query(createProfilesTableQuery);
        await pool.query(addAvatarUrlColumnQuery);
        await pool.query(createUserFilesTableQuery);
        await pool.query(addPathColumnQuery);
        await pool.query(addIsPublicColumnQuery);
        await pool.query(createFriendsTableQuery);
        await pool.query(createMessagesTableQuery);
        console.log('[DB] All tables checked/created successfully.');
    } catch (err) {
        console.error('[DB] Error initializing database tables:', err.stack);
    }
};

// Configure CORS to allow requests from your GitHub Pages domain
app.use(cors({
    origin: 'https://snugos.github.io', // Your GitHub Pages URL
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Specify allowed methods
    allowedHeaders: ['Content-Type', 'Authorization'] // Specify allowed headers
}));

app.use(express.json()); // This should be *after* cors setup for preflight requests

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
        const profileResult = await pool.query("SELECT id, username, created_at, background_url, bio, avatar_url FROM profiles WHERE id = $1", [userId]);
        if (profileResult.rows.length === 0) {
            return response.status(404).json({ success: false, message: 'Profile not found.' });
        }
        response.json({ success: true, profile: profileResult.rows[0] });
    } catch (error) {
        response.status(500).json({ success: false, message: 'Server error while fetching profile.' });
    }
});

app.put('/api/profile/settings', authenticateToken, async (req, res) => {
    const { avatar_url, background_url } = req.body;
    const userId = req.user.id;

    try {
        if (avatar_url) {
            await pool.query("UPDATE profiles SET avatar_url = $1 WHERE id = $2", [avatar_url, userId]);
        }
        if (background_url) {
            await pool.query("UPDATE profiles SET background_url = $1 WHERE id = $2", [background_url, userId]);
        }
        res.json({ success: true, message: "Profile settings updated." });
    } catch (error) {
        console.error("[Profile Settings Update] Error:", error);
        res.status(500).json({ success: false, message: 'Error updating settings.' });
    }
});

app.get('/api/profiles/:username', async (request, response) => {
    try {
        const { username } = request.params;
        const profileResult = await pool.query("SELECT id, username, created_at, background_url, bio, avatar_url FROM profiles WHERE username = $1", [username]);
        const profile = profileResult.rows[0];
        if (!profile) return response.status(404).json({ success: false, message: 'Profile not found.' });
        response.json({ success: true, profile: profile });
    } catch (error) {
        response.status(500).json({ success: false, message: 'Server error while fetching profile.' });
    }
});

app.put('/api/profiles/:username', authenticateToken, async (request, response) => {
    const { username } = request.params;
    const { bio } = request.body;

    if (request.user.username !== username) {
        return response.status(403).json({ success: false, message: "You can only edit your own profile." });
    }

    try {
        const updateQuery = 'UPDATE profiles SET bio = $1 WHERE id = $2 RETURNING id, username, bio';
        const result = await pool.query(updateQuery, [bio, request.user.id]);
        response.status(200).json({ success: true, profile: result.rows[0] });
    } catch (error) {
        response.status(500).json({ success: false, message: 'Server error during profile update.' });
    }
});

// --- Friend System Endpoints ---

app.post('/api/profiles/:username/friend', authenticateToken, async (request, response) => {
    try {
        const userId = request.user.id;
        const friendUsername = request.params.username;
        const friendResult = await pool.query("SELECT id FROM profiles WHERE username = $1", [friendUsername]);
        if (friendResult.rows.length === 0) return response.status(404).json({ success: false, message: 'User to add as friend not found.' });
        const friendId = friendResult.rows[0].id;
        if (userId === friendId) return response.status(400).json({ success: false, message: 'You cannot add yourself as a friend.' });
        await pool.query("INSERT INTO friends (user_id, friend_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [userId, friendId]);
        response.json({ success: true, message: `You are now friends with ${friendUsername}.` });
    } catch (error) {
        response.status(500).json({ success: false, message: 'Server error while trying to add friend.' });
    }
});

app.delete('/api/profiles/:username/friend', authenticateToken, async (request, response) => {
    try {
        const userId = request.user.id;
        const friendUsername = request.params.username;
        const friendResult = await pool.query("SELECT id FROM profiles WHERE username = $1", [friendUsername]);
        if (friendResult.rows.length === 0) return response.status(404).json({ success: false, message: 'User to remove as friend not found.' });
        const friendId = friendResult.rows[0].id;
        await pool.query("DELETE FROM friends WHERE user_id = $1 AND friend_id = $2", [userId, friendId]);
        response.json({ success: true, message: `You have removed ${friendUsername} as a friend.` });
    } catch (error) {
        response.status(500).json({ success: false, message: 'Server error while trying to remove friend.' });
    }
});

app.get('/api/profiles/:username/friend-status', authenticateToken, async (request, response) => {
    try {
        const userId = request.user.id;
        const checkFriendUsername = request.params.username;
        const checkFriendResult = await pool.query("SELECT id FROM profiles WHERE username = $1", [checkFriendUsername]);
        if (checkFriendResult.rows.length === 0) return response.status(404).json({ success: false, message: 'User not found.' });
        const checkFriendId = checkFriendResult.rows[0].id;
        const friendStatusResult = await pool.query("SELECT 1 FROM friends WHERE user_id = $1 AND friend_id = $2", [userId, checkFriendId]);
        response.json({ success: true, isFriend: friendStatusResult.rows.length > 0 });
    } catch (error) {
        response.status(500).json({ success: false, message: 'Server error while checking friend status.' });
    }
});

// --- Messaging Endpoints ---

app.post('/api/messages', authenticateToken, async (request, response) => {
    const { recipientUsername, content } = request.body;
    const senderId = request.user.id;
    if (!recipientUsername || !content) return response.status(400).json({ success: false, message: 'Recipient and content are required.' });
    try {
        const recipientResult = await pool.query("SELECT id FROM profiles WHERE username = $1", [recipientUsername]);
        if (recipientResult.rows.length === 0) return response.status(404).json({ success: false, message: 'Recipient not found.' });
        const recipientId = recipientResult.rows[0].id;
        const insertMessageQuery = `INSERT INTO messages (sender_id, recipient_id, content) VALUES ($1, $2, $3) RETURNING *;`;
        const result = await pool.query(insertMessageQuery, [senderId, recipientId, content]);
        response.status(201).json({ success: true, messageData: result.rows[0] });
    } catch (error) {
        response.status(500).json({ success: false, message: 'Server error while sending message.' });
    }
});

// --- File Storage Endpoints ---

app.post('/api/files/upload', authenticateToken, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file provided.' });
    const userId = req.user.id;
    const { is_public, path } = req.body;
    try {
        const file = req.file;
        const s3Key = `user-files/${userId}/${Date.now()}-${file.originalname.replace(/ /g, '_')}`;
        const uploadParams = { Bucket: process.env.S3_BUCKET_NAME, Key: s3Key, Body: file.buffer, ContentType: file.mimetype };
        const data = await s3.upload(uploadParams).promise();
        const insertFileQuery = `INSERT INTO user_files (user_id, path, file_name, s3_key, s3_url, mime_type, file_size, is_public) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;`;
        const result = await pool.query(insertFileQuery, [userId, path || '/', file.originalname, s3Key, data.Location, file.mimetype, file.size, is_public === 'true']);
        res.status(201).json({ success: true, file: result.rows[0] });
    } catch (error) {
        console.error("[File Upload] Error:", error);
        res.status(500).json({ success: false, message: 'Error uploading file.' });
    }
});

app.post('/api/folders', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { name, path } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Folder name is required.' });
    try {
        // Corrected s3_url generation to ensure uniqueness for folders
        const uniqueFolderId = `folder-${userId}-${Date.now()}-${name.replace(/ /g, '_')}`;
        const insertFolderQuery = `INSERT INTO user_files (user_id, path, file_name, s3_key, s3_url, mime_type, file_size, is_public) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;`;
        const result = await pool.query(insertFolderQuery, [userId, path || '/', name, uniqueFolderId, `snugos-folder-url/${uniqueFolderId}`, 'application/vnd.snugos.folder', 0, false]);
        res.status(201).json({ success: true, folder: result.rows[0] });
    } catch (error) {
        console.error("[Folder Creation] Error:", error); // Log the actual error for debugging
        if (error.code === '23505') { // PostgreSQL unique_violation error code
            return res.status(409).json({ success: false, message: 'A folder or file with that exact name already exists in this directory.' });
        }
        res.status(500).json({ success: false, message: 'Server error during folder creation.' });
    }
});

app.get('/api/files/my', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const path = req.query.path || '/';
        const query = `SELECT * FROM user_files WHERE user_id = $1 AND path = $2 ORDER BY mime_type, file_name ASC`;
        const result = await pool.query(query, [userId, path]);
        res.json({ success: true, items: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error fetching your files.' });
    }
});

app.get('/api/files/public', authenticateToken, async (req, res) => {
    try {
        const path = req.query.path || '/';
        const query = `SELECT * FROM user_files WHERE is_public = TRUE AND path = $1 ORDER BY mime_type, file_name ASC`;
        const result = await pool.query(query, [path]);
        res.json({ success: true, items: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error fetching public files.' });
    }
});

app.put('/api/files/:fileId/toggle-public', authenticateToken, async (req, res) => {
    const fileId = req.params.fileId;
    const userId = req.user.id;
    const { is_public } = req.body;
    if (typeof is_public !== 'boolean') return res.status(400).json({ success: false, message: 'is_public must be a boolean.' });
    try {
        const query = `UPDATE user_files SET is_public = $1 WHERE id = $2 AND user_id = $3 RETURNING *;`;
        const result = await pool.query(query, [is_public, fileId, userId]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'File not found or you do not have permission.' });
        res.json({ success: true, message: 'File status updated.', file: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error updating file status.' });
    }
});

// New endpoint for moving files/folders
app.put('/api/files/:id/move', authenticateToken, async (req, res) => {
    const itemId = req.params.id;
    const userId = req.user.id;
    const { targetPath } = req.body; // The target path where the item should be moved

    if (!targetPath) {
        return res.status(400).json({ success: false, message: 'Target path is required.' });
    }

    try {
        const itemToMoveResult = await pool.query("SELECT id, user_id, path, file_name, mime_type FROM user_files WHERE id = $1", [itemId]);
        if (itemToMoveResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Item not found.' });
        }

        const itemToMove = itemToMoveResult.rows[0];
        if (itemToMove.user_id !== userId) {
            return res.status(403).json({ success: false, message: 'You do not have permission to move this item.' });
        }

        const isFolder = itemToMove.mime_type === 'application/vnd.snugos.folder';
        const currentItemFullPath = itemToMove.path + itemToMove.file_name + (isFolder ? '/' : '');
        const newParentPath = targetPath.endsWith('/') ? targetPath : `${targetPath}/`; // Ensure targetPath ends with a slash if it's a folder path

        // Validation 1: Prevent moving an item into its current parent (no-op)
        if (itemToMove.path === newParentPath) {
            return res.json({ success: true, message: 'Item is already in the target location.' });
        }

        // Validation 2: Prevent moving a folder into its own descendant
        if (isFolder && newParentPath.startsWith(currentItemFullPath)) {
            return res.status(400).json({ success: false, message: 'Cannot move a folder into its own subfolder.' });
        }

        // Validation 3: Check for name conflict at destination
        const conflictQuery = "SELECT id FROM user_files WHERE user_id = $1 AND path = $2 AND file_name = $3 AND id != $4";
        const conflictResult = await pool.query(conflictQuery, [userId, newParentPath, itemToMove.file_name, itemId]);
        if (conflictResult.rows.length > 0) {
            return res.status(409).json({ success: false, message: `An item with the name "${itemToMove.file_name}" already exists in the destination.` });
        }

        await pool.query('BEGIN'); // Start transaction

        // Update the item itself
        await pool.query("UPDATE user_files SET path = $1 WHERE id = $2 AND user_id = $3;", [newParentPath, itemId, userId]);

        // If it's a folder, update all its children recursively
        if (isFolder) {
            const oldPathPrefix = currentItemFullPath; // e.g., /parent/folder_name/
            const newPathPrefix = newParentPath + itemToMove.file_name + '/'; // e.g., /new_parent/folder_name/

            // Update children's paths
            const updateChildrenQuery = `
                UPDATE user_files
                SET path = $1 || SUBSTRING(path FROM LENGTH($2) + 1)
                WHERE user_id = $3 AND path LIKE $2 || '%';
            `;
            await pool.query(updateChildrenQuery, [newPathPrefix, oldPathPrefix, userId]);
        }

        await pool.query('COMMIT'); // Commit transaction
        res.json({ success: true, message: 'Item moved successfully.' });

    } catch (error) {
        await pool.query('ROLLBACK'); // Rollback transaction on error
        console.error("[Move Item] Error:", error);
        res.status(500).json({ success: false, message: 'Server error while moving item.' });
    }
});


app.delete('/api/files/:fileId', authenticateToken, async (req, res) => {
    const fileId = req.params.fileId;
    const userId = req.user.id;
    try {
        const getFileQuery = "SELECT user_id, s3_key FROM user_files WHERE id = $1";
        const fileResult = await pool.query(getFileQuery, [fileId]);
        if (fileResult.rows.length === 0) return res.status(404).json({ success: false, message: 'File not found.' });

        const fileOwnerId = fileResult.rows[0].user_id;
        const s3Key = fileResult.rows[0].s3_key;
        if (fileOwnerId !== userId) return res.status(403).json({ success: false, message: 'You do not have permission to delete this file.' });

        if (!s3Key.startsWith('folder-')) {
            await s3.deleteObject({ Bucket: process.env.S3_BUCKET_NAME, Key: s3Key }).promise();
        }
        await pool.query("DELETE FROM user_files WHERE id = $1", [fileId]);
        res.json({ success: true, message: 'File deleted successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error while deleting file.' });
    }
});

app.get('/api/files/:fileId/share-link', authenticateToken, async (req, res) => {
    const { fileId } = req.params;
    const userId = req.user.id;
    try {
        const fileQuery = await pool.query("SELECT user_id, s3_key, is_public FROM user_files WHERE id = $1", [fileId]);
        if (fileQuery.rows.length === 0) return res.status(404).json({ success: false, message: "File not found." });

        const file = fileQuery.rows[0];
        if (!file.is_public && file.user_id !== userId) {
            return res.status(403).json({ success: false, message: "You do not have permission to share this file." });
        }

        const params = { Bucket: process.env.S3_BUCKET_NAME, Key: file.s3_key, Expires: 3600 };
        const shareUrl = await s3.getSignedUrlPromise('getObject', params);
        res.json({ success: true, shareUrl: shareUrl });
    } catch (error) {
        console.error("[Share Link] Error:", error);
        res.status(500).json({ success: false, message: "Could not generate share link." });
    }
});

// --- Start the Server ---
app.listen(PORT, () => {
    console.log(`SnugOS server is listening on port ${PORT}`);
    initializeDatabase();
});
