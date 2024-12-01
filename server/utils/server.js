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
    origin: function(origin, callback) {
        // מאפשר גישה מכל פורט של localhost וגם מ-render
        if (!origin
            || origin.match(/http:\/\/localhost:[0-9]+/)
            || origin === 'https://katz-abr.onrender.com'
            || origin === 'https://katz-abr-backend.onrender.com') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
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


// הוסף את הנתיבים החדשים כאן \/
app.get('/api/dashboard-data', async (req, res) => {
    const { userId } = req.query;
    try {
        const result = await pool.query(
            'SELECT * FROM dashboard_data WHERE user_id = $1',
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ error: 'שגיאה בטעינת הנתונים' });
    }
});

app.post('/api/dashboard-data', async (req, res) => {
    console.log('התקבלה בקשה להוספת נתונים:', req.body);  // לוג חדש

    const { userId, name, email, phone, address } = req.body;

    // בדיקה שכל השדות קיימים
    console.log('ערכי השדות:', { userId, name, email, phone, address });  // לוג חדש

    try {
        const result = await pool.query(
            'INSERT INTO dashboard_data (user_id, name, email, phone, address) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [userId, name, email, phone, address]
        );
        console.log('הנתונים נוספו בהצלחה:', result.rows[0]);  // לוג חדש
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('שגיאה בהוספת נתונים לבסיס הנתונים:', error);  // לוג משופר
        res.status(500).json({ error: 'שגיאה בשמירת הנתונים' });
    }
});
// סוף הנתיבים החדשים /\

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