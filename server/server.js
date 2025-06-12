// server.js - SnugOS Dedicated API Server with Profiles & Follows and General File Storage

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
            bio TEXT
        );
    `;
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
    
    try {
        await pool.query(createProfilesTableQuery);
        await pool.query(createUserFilesTableQuery);
        await pool.query(addPathColumnQuery);
        await pool.query(addIsPublicColumnQuery);
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

// --- User & Profile Endpoints (No changes here) ---
// ... (Your existing /register, /login, /profile endpoints)

// --- General File Storage Endpoints ---

app.post('/api/files/upload', authenticateToken, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file provided.' });
    }
    const userId = req.user.id;
    const { is_public, path } = req.body;

    try {
        const file = req.file;
        const s3Key = `user-files/${userId}/${Date.now()}-${file.originalname.replace(/ /g, '_')}`;
        
        const uploadParams = {
            Bucket: process.env.S3_BUCKET_NAME, Key: s3Key, Body: file.buffer, ContentType: file.mimetype,
        };
        const data = await s3.upload(uploadParams).promise();

        const insertFileQuery = `
            INSERT INTO user_files (user_id, path, file_name, s3_key, s3_url, mime_type, file_size, is_public)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;
        `;
        const result = await pool.query(insertFileQuery, [
            userId, path || '/', file.originalname, s3Key, data.Location, file.mimetype, file.size, is_public === 'true'
        ]);
        res.status(201).json({ success: true, file: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error during file upload.' });
    }
});

app.post('/api/folders', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { name, path } = req.body;
    if (!name) {
        return res.status(400).json({ success: false, message: 'Folder name is required.' });
    }
    try {
        const insertFolderQuery = `
            INSERT INTO user_files (user_id, path, file_name, s3_key, s3_url, mime_type, file_size, is_public)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;
        `;
        const result = await pool.query(insertFolderQuery, [
            userId, path || '/', name, `folder-${userId}-${Date.now()}-${name}`, '#', 'application/vnd.snugos.folder', 0, false
        ]);
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

/**
 * NEW ENDPOINT: Get all public files for the "Global" view.
 */
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

/**
 * NEW ENDPOINT: Toggle a file's public/private status.
 */
app.put('/api/files/:fileId/toggle-public', authenticateToken, async (req, res) => {
    const fileId = req.params.fileId;
    const userId = req.user.id;
    const { is_public } = req.body; // Expect new status: true or false

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
            return res.status(404).json({ success: false, message: 'File not found or you do not have permission to change it.' });
        }
        res.json({ success: true, message: 'File status updated.', file: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error updating file status.' });
    }
});


// ... (other endpoints like delete)

app.listen(PORT, () => {
    console.log(`SnugOS server is listening on port ${PORT}`);
    initializeDatabase();
});
