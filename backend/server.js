const express = require('express');
const mysql = require('mysql2/promise');  // שינוי כאן
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

// Create MySQL pool instead of PostgreSQL pool
const pool = mysql.createPool(config.db);

// Test database connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('Database connected successfully');
        connection.release();
    } catch (err) {
        console.error('Database connection error:', err);
    }
}
testConnection();

// Test route
app.get('/test', (req, res) => {
    res.json({ message: 'Server is working' });
});

// Routes
app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    console.log('Registration attempt:', { email });

    try {
        const emailErrors = validateEmail(email);
        const passwordErrors = validatePassword(password);

        if (emailErrors.length > 0 || passwordErrors.length > 0) {
            return res.status(400).json({
                errors: [...emailErrors, ...passwordErrors]
            });
        }

        // Check if user exists
        const [existingUsers] = await pool.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                errors: ['כתובת האימייל כבר קיימת במערכת']
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            'INSERT INTO users (email, password) VALUES (?, ?)',
            [email, hashedPassword]
        );

        res.status(201).json({
            message: 'משתמש נרשם בהצלחה',
            user: {
                id: result.insertId,
                email
            }
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
        const [users] = await pool.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                errors: ['שם משתמש או סיסמה שגויים']
            });
        }

        const user = users[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({
                errors: ['שם משתמש או סיסמה שגויים']
            });
        }

        let rememberToken = null;
        if (rememberMe) {
            rememberToken = Math.random().toString(36).slice(-16);
            await pool.query(
                'UPDATE users SET remember_token = ? WHERE id = ?',
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

        const [users] = await pool.query(
            'SELECT id, email FROM users WHERE remember_token = ?',
            [token]
        );

        if (users.length === 0) {
            return res.status(401).json({
                errors: ['טוקן לא תקין']
            });
        }

        res.json({
            message: 'טוקן תקין',
            user: users[0]
        });

    } catch (error) {
        console.error('Token verification error:', error);
        res.status(500).json({
            errors: ['שגיאה באימות הטוקן']
        });
    }
});

// Dashboard routes
app.get('/api/dashboard-data', async (req, res) => {
    const { userId } = req.query;
    try {
        const [rows] = await pool.query(
            'SELECT * FROM dashboard_data WHERE user_id = ?',
            [userId]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ error: 'שגיאה בטעינת הנתונים' });
    }
});

app.post('/api/dashboard-data', async (req, res) => {
    console.log('---------- התחלת בקשה חדשה ----------');
    console.log('1. התקבלה בקשה להוספת נתונים:', req.body);

    const { userId, name, email, phone, address } = req.body;

    // בדיקת שדות חובה
    if (!userId) {
        console.error('2. שגיאה: חסר userId:', { userId });
        return res.status(400).json({ error: 'חסר מזהה משתמש' });
    }

    if (!name || !email || !phone || !address) {
        console.error('2. שגיאה: חסרים שדות:', { name, email, phone, address });
        return res.status(400).json({ error: 'כל השדות הם חובה' });
    }

    console.log('2. כל השדות נמצאים:', { userId, name, email, phone, address });

    try {
        // בדיקה שהמשתמש קיים
        const [userRows] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
        console.log('3. בדיקת משתמש:', userRows);

        if (userRows.length === 0) {
            console.error('4. משתמש לא נמצא:', userId);
            return res.status(404).json({ error: 'משתמש לא נמצא' });
        }

        console.log('4. משתמש נמצא, מנסה להכניס נתונים');

        const [result] = await pool.query(
            'INSERT INTO dashboard_data (user_id, name, email, phone, address) VALUES (?, ?, ?, ?, ?)',
            [userId, name, email, phone, address]
        );

        console.log('5. הנתונים הוכנסו בהצלחה:', result);

        const [insertedRow] = await pool.query(
            'SELECT * FROM dashboard_data WHERE id = ?',
            [result.insertId]
        );

        console.log('6. שליפת הנתונים שהוכנסו:', insertedRow[0]);
        res.status(201).json(insertedRow[0]);

    } catch (error) {
        console.error('!!!! שגיאה !!!!');
        console.error('סוג השגיאה:', error.code);
        console.error('הודעת שגיאה:', error.message);
        console.error('מיקום השגיאה:', error.stack);

        res.status(500).json({
            error: 'שגיאה בשמירת הנתונים',
            details: error.message
        });
    }

    console.log('---------- סוף בקשה ----------\n');
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