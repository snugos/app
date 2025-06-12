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
    
    // Additional tables for friends and messages from original structure
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

app.post('/api/profile/avatar', authenticateToken, upload.single('avatarFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }
    try {
        const file = req.file;
        const userId = req.user.id;
        const fileName = `avatars/${userId}-${Date.now()}-${file.originalname.replace(/ /g, '_')}`;
        const uploadParams = {
            Bucket: process.env.S3_BUCKET_NAME, Key: fileName, Body: file.buffer, ACL: 'public-read', ContentType: file.mimetype
        };
        const data = await s3.upload(uploadParams).promise();
        await pool.query("UPDATE profiles SET avatar_url = $1 WHERE id = $2", [data.Location, userId]);
        res.json({ success: true, message: "Avatar updated successfully!", avatar_url: data.Location });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error uploading file.' });
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
        const insertFileQuery = `
            INSERT INTO user_files (user_id, path, file_name, s3_key, s3_url, mime_type, file_size, is_public)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;
        `;
        const result = await pool.query(insertFileQuery, [userId, path || '/', file.originalname, s3Key, data.Location, file.mimetype, file.size, is_public === 'true']);
        res.status(201).json({ success: true, file: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error during file upload.' });
    }
});

app.post('/api/folders', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { name, path } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Folder name is required.' });
    try {
        const insertFolderQuery = `
            INSERT INTO user_files (user_id, path, file_name, s3_key, s3_url, mime_type, file_size, is_public)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;
        `;
        const result = await pool.query(insertFolderQuery, [userId, path || '/', name, `folder-${userId}-${Date.now()}-${name}`, '#', 'application/vnd.snugos.folder', 0, false]);
        res.status(201).json({ success: true, folder: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error during folder creation.' });
    }
});

app.get('/api/files/my', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const path = req.query.path || '/';
        const query = `
            SELECT id, user_id, file_name, s3_url, mime_type, file_size, is_public, created_at 
            FROM user_files 
            WHERE user_id = $1 AND path = $2 
            ORDER BY mime_type, file_name ASC`;
        const result = await pool.query(query, [userId, path]);
        res.json({ success: true, items: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error fetching your files.' });
    }
});

app.get('/api/files/public', authenticateToken, async (req, res) => {
    try {
        const path = req.query.path || '/';
        const query = `
            SELECT id, user_id, file_name, s3_url, mime_type, file_size, is_public, created_at 
            FROM user_files 
            WHERE is_public = TRUE AND path = $1
            ORDER BY mime_type, file_name ASC`;
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
        const query = `
            UPDATE user_files SET is_public = $1 WHERE id = $2 AND user_id = $3 RETURNING id, file_name, is_public;
        `;
        const result = await pool.query(query, [is_public, fileId, userId]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'File not found or you do not have permission.' });
        res.json({ success: true, message: 'File status updated.', file: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error updating file status.' });
    }
});

// --- Start the Server ---
app.listen(PORT, () => {
    console.log(`SnugOS server is listening on port ${PORT}`);
    initializeDatabase();
});
