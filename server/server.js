// server.js - SnugOS Dedicated API Server

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

// Create the Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Set up the database connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Function to create the users table if it doesn't exist
const initializeDatabase = async () => {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password_hash VARCHAR(100) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;
    try {
        await pool.query(createTableQuery);
        console.log('[DB] "users" table checked/created successfully.');
    } catch (err) {
        console.error('[DB] Error initializing database table:', err.stack);
    }
};

// === Middleware ===
app.use(express.json());
app.use(cors());

// === API Endpoints ===

// User Registration Endpoint
app.post('/api/register', async (request, response) => {
    try {
        const { username, password } = request.body;
        if (!username || !password || password.length < 6) {
            return response.status(400).json({ success: false, message: 'Username and a password of at least 6 characters are required.' });
        }

        // Hash the password for security
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username",
            [username, passwordHash]
        );

        response.status(201).json({ success: true, user: newUser.rows[0] });

    } catch (error) {
        console.error("[Register] Error:", error);
        if (error.code === '23505') { // Unique constraint violation
            return response.status(409).json({ success: false, message: 'Username already exists.' });
        }
        response.status(500).json({ success: false, message: 'Server error during registration.' });
    }
});

// User Login Endpoint
app.post('/api/login', async (request, response) => {
    try {
        const { username, password } = request.body;
        const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
        const user = result.rows[0];

        if (!user) {
            return response.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return response.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        // Create and sign a JSON Web Token (JWT)
        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        response.json({ success: true, token, user: { id: user.id, username: user.username } });

    } catch (error) {
        console.error("[Login] Error:", error);
        response.status(500).json({ success: false, message: 'Server error during login.' });
    }
});

// (Your existing YouTube endpoint can remain here)
app.post('/api/youtube', async (request, response) => {
    // ... insert your existing YouTube importer code here ...
});

// === Start the Server ===
app.listen(PORT, () => {
    console.log(`SnugOS server is listening on port ${PORT}`);
    initializeDatabase();
});
