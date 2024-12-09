const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const cors = require('cors');
const config = require('./config');
const { validatePassword, validateEmail } = require('./validation');

const app = express();

// Basic Middleware
app.enable('trust proxy');
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// Logging Middleware
app.use((req, res, next) => {
    console.log('התקבלה בקשה:', {
        method: req.method,
        url: req.url,
        body: req.body,
        query: req.query,
        headers: req.headers
    });
    next();
});

// Database Connection
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

// Test Route
app.get('/test', (req, res) => {
    res.json({ message: 'Server is working' });
});

// Auth Routes
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

// Dashboard Routes
app.post('/api/dashboard-data', async (req, res) => {
    try {
        const user_id = 1; // ערך קבוע
        const { name, email, phone, address } = req.body;

        // בדיקת שדות חובה
        if (!name || !email || !phone || !address) {
            return res.status(400).json({ error: 'כל השדות הם חובה' });
        }

        const [result] = await pool.query(
            'INSERT INTO dashboard_data (user_id, name, email, phone, address) VALUES (?, ?, ?, ?, ?)',
            [user_id, name, email, phone, address]
        );

        const [insertedRow] = await pool.query(
            'SELECT * FROM dashboard_data WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json(insertedRow[0]);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'שגיאה בשמירת הנתונים' });
    }
});

app.put('/api/dashboard-data/:id', async (req, res) => {
    const { id } = req.params;
    const user_id = 1; // ערך קבוע
    const { name, email, phone, address } = req.body;

    try {
        const [result] = await pool.query(
            'UPDATE dashboard_data SET name = ?, email = ?, phone = ?, address = ? WHERE id = ? AND user_id = ?',
            [name, email, phone, address, id, user_id]
        );

        const [updatedRow] = await pool.query(
            'SELECT * FROM dashboard_data WHERE id = ?',
            [id]
        );

        res.json(updatedRow[0]);
    } catch (error) {
        console.error('Error updating data:', error);
        res.status(500).json({ error: 'שגיאה בעדכון הנתונים' });
    }
});

app.get('/api/dashboard-data', async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ error: 'Missing userId parameter' });
        }

        const [rows] = await pool.query(
            'SELECT * FROM dashboard_data WHERE user_id = ?',
            [userId]
        );

        res.json(rows);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'שגיאה בטעינת הנתונים' });
    }
});


app.delete('/api/dashboard-data/:id', async (req, res) => {
    const { id } = req.params;
    const user_id = 1; // ערך קבוע

    try {
        await pool.query(
            'DELETE FROM dashboard_data WHERE id = ? AND user_id = ?',
            [id, user_id]
        );
        res.json({ message: 'הנתון נמחק בהצלחה' });
    } catch (error) {
        console.error('Error deleting data:', error);
        res.status(500).json({ error: 'שגיאה במחיקת הנתונים' });
    }
});

// Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        errors: ['שגיאת שרת פנימית']
    });
});

// Start Server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
