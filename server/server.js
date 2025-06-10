// server.js - SnugOS Dedicated API Server with Profiles

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

// Function to create the profiles table if it doesn't exist
const initializeDatabase = async () => {
    // UPDATED: Table is now named 'profiles'
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS profiles (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password_hash VARCHAR(100) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;
    try {
        await pool.query(createTableQuery);
        console.log('[DB] "profiles" table checked/created successfully.');
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
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // UPDATED: Insert into 'profiles' table
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
        // UPDATED: Select from 'profiles' table
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

// NEW: Public Profile Endpoint
app.get('/api/profiles/:username', async (request, response) => {
    try {
        const { username } = request.params;
        
        // Fetch the user's basic info. We exclude the password_hash for security.
        const profileResult = await pool.query(
            "SELECT id, username, created_at FROM profiles WHERE username = $1",
            [username]
        );

        const profile = profileResult.rows[0];

        if (!profile) {
            return response.status(404).json({ success: false, message: 'Profile not found.' });
        }

        // In the future, we will also fetch the user's public projects here.
        // For now, we just return the basic profile info.
        
        response.json({
            success: true,
            profile: {
                id: profile.id,
                username: profile.username,
                memberSince: profile.created_at
            },
            projects: [] // Placeholder for future project list
        });

    } catch (error) {
        console.error("[Get Profile] Error:", error);
        response.status(500).json({ success: false, message: 'Server error while fetching profile.' });
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
