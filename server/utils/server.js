const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const cors = require('cors');
const config = require('./config');
const { validatePassword, validateEmail } = require('./validation');

const app = express();

// Basic Middleware
app.enable('trust proxy');

app.use(cors({
    origin: [
        'http://localhost:3000',
        'https://katz-abr.onrender.com'  // הדומיין של הפרונט ברנדר
    ],
    credentials: true
}));



// Parsing middleware
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// Create database pool
const pool = new Pool(config.db);

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Database connected successfully');
    }
});

// Test route
app.get('/test', (req, res) => {
    res.json({ message: 'Server is working' });
});

// Routes
app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    console.log('Registration attempt:', { email });

    try {
        // Validation
        const emailErrors = validateEmail(email);
        const passwordErrors = validatePassword(password);

        if (emailErrors.length > 0 || passwordErrors.length > 0) {
            return res.status(400).json({
                errors: [...emailErrors, ...passwordErrors]
            });
        }

        // Check if user exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                errors: ['כתובת האימייל כבר קיימת במערכת']
            });
        }

        // Create user
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
            [email, hashedPassword]
        );

        res.status(201).json({
            message: 'משתמש נרשם בהצלחה',
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            errors: ['שגיאה בתהליך ההרשמה']
        });
    }
});

app.post('/login', async (req, res) => {
    const { email, password, rememberMe } = req.body;

    try {
        // Find user
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                errors: ['שם משתמש או סיסמה שגויים']
            });
        }

        // Check password
        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({
                errors: ['שם משתמש או סיסמה שגויים']
            });
        }

        // Handle remember me token
        let rememberToken = null;
        if (rememberMe) {
            rememberToken = Math.random().toString(36).slice(-16);
            await pool.query(
                'UPDATE users SET remember_token = $1 WHERE id = $2',
                [rememberToken, user.id]
            );
        }

        res.json({
            message: 'התחברות בוצעה בהצלחה',
            user: {
                id: user.id,
                email: user.email,
                rememberToken
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            errors: ['שגיאה בתהליך ההתחברות']
        });
    }
});

app.post('/check-remember-token', async (req, res) => {
    const { token } = req.body;

    try {
        if (!token) {
            return res.status(400).json({
                errors: ['טוקן לא נמצא']
            });
        }

        const result = await pool.query(
            'SELECT id, email FROM users WHERE remember_token = $1',
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                errors: ['טוקן לא תקין']
            });
        }

        res.json({
            message: 'טוקן תקין',
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Token verification error:', error);
        res.status(500).json({
            errors: ['שגיאה באימות הטוקן']
        });
    }
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        errors: ['שגיאת שרת פנימית']
    });
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});