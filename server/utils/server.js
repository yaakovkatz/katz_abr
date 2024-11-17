const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const cors = require('cors');
const config = require('./config');
const { validatePassword, validateEmail } = require('./validation');

const PORT = process.env.PORT || 3001;
const app = express();

app.use(cors({
    origin: ['https://katz-abr.onrender.com', 'http://localhost:3000', 'https://katz-abr-frontend.onrender.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    exposedHeaders: ['set-cookie']
}));

app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.json({ message: 'Server is running' });
});

const pool = new Pool(config.db);

// הרשמה
app.post('/register', async (req, res) => {
    const { email, password } = req.body;

    const emailErrors = validateEmail(email);
    const passwordErrors = validatePassword(password);

    if (emailErrors.length > 0 || passwordErrors.length > 0) {
        return res.status(400).json({
            errors: [...emailErrors, ...passwordErrors]
        });
    }

    try {
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                errors: ['כתובת האימייל כבר קיימת במערכת']
            });
        }

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
        res.status(500).json({ errors: ['שגיאה בהרשמה'] });
    }
});

// התחברות
app.post('/login', async (req, res) => {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            errors: ['נדרשים כתובת אימייל וסיסמה']
        });
    }

    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                errors: ['שם משתמש או סיסמה שגויים']
            });
        }

        const user = result.rows[0];
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
                'UPDATE users SET remember_token = $1 WHERE id = $2',
                [rememberToken, user.id]
            );
        }

        res.status(200).json({
            message: 'התחברות בוצעה בהצלחה',
            user: {
                id: user.id,
                email: user.email,
                rememberToken
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ errors: ['שגיאה בהתחברות'] });
    }
});

// בדיקת טוקן זכירה
app.post('/check-remember-token', async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ errors: ['טוקן לא נמצא'] });
    }

    try {
        const result = await pool.query(
            'SELECT id, email FROM users WHERE remember_token = $1',
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ errors: ['טוקן לא תקין'] });
        }

        res.json({
            message: 'טוקן תקין',
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Token check error:', error);
        res.status(500).json({ errors: ['שגיאה בבדיקת הטוקן'] });
    }
});

// שחזור סיסמה
app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        const result = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ errors: ['משתמש לא נמצא'] });
        }

        const resetToken = Math.random().toString(36).slice(-8);
        const expires = new Date();
        expires.setHours(expires.getHours() + 1);

        await pool.query(
            'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
            [resetToken, expires, result.rows[0].id]
        );

        res.json({
            message: 'קוד איפוס נשלח בהצלחה',
            token: resetToken
        });

    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ errors: ['שגיאה בתהליך שחזור הסיסמה'] });
    }
});

// איפוס סיסמה
app.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        const result = await pool.query(
            'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({
                errors: ['קוד איפוס לא תקין או שפג תוקפו']
            });
        }

        const passwordErrors = validatePassword(newPassword);
        if (passwordErrors.length > 0) {
            return res.status(400).json({ errors: passwordErrors });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query(
            'UPDATE users SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
            [hashedPassword, result.rows[0].id]
        );

        res.json({ message: 'סיסמה עודכנה בהצלחה' });

    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ errors: ['שגיאה בעדכון הסיסמה'] });
    }
});

// עדכון סיסמה
app.post('/update-password', async (req, res) => {
    const { userId, currentPassword, newPassword } = req.body;

    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                errors: ['משתמש לא נמצא']
            });
        }

        const match = await bcrypt.compare(currentPassword, result.rows[0].password);
        if (!match) {
            return res.status(401).json({
                errors: ['סיסמה נוכחית שגויה']
            });
        }

        const passwordErrors = validatePassword(newPassword);
        if (passwordErrors.length > 0) {
            return res.status(400).json({ errors: passwordErrors });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query(
            'UPDATE users SET password = $1 WHERE id = $2',
            [hashedPassword, userId]
        );

        res.json({ message: 'סיסמה עודכנה בהצלחה' });

    } catch (error) {
        console.error('Password update error:', error);
        res.status(500).json({ errors: ['שגיאה בעדכון הסיסמה'] });
    }
});

// נתוני דשבורד
app.get('/api/dashboard-data', async (req, res) => {
    const { userId } = req.query;

    try {
        const result = await pool.query(
            'SELECT * FROM dashboard_data WHERE user_id = $1',
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Dashboard data fetch error:', error);
        res.status(500).json({ errors: ['שגיאה בטעינת נתונים'] });
    }
});

// הוספת נתוני דשבורד
app.post('/api/dashboard-data', async (req, res) => {
    const { userId, name, email, phone, address, additionalInfo = null } = req.body;

    if (!userId || !name || !email || !phone || !address) {
        return res.status(400).json({
            errors: ['כל השדות חובה למילוי']
        });
    }

    try {
        const userExists = await pool.query(
            'SELECT id FROM users WHERE id = $1',
            [userId]
        );

        if (userExists.rows.length === 0) {
            return res.status(404).json({
                errors: ['משתמש לא נמצא']
            });
        }

        const result = await pool.query(
            'INSERT INTO dashboard_data (user_id, name, email, phone, address, additional_info) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [userId, name, email, phone, address, additionalInfo]
        );

        res.status(201).json({
            message: 'הנתונים נוספו בהצלחה',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Dashboard data insert error:', error);
        res.status(500).json({ errors: ['שגיאה בהוספת נתונים'] });
    }
});

// מחיקת נתוני דשבורד
app.delete('/api/dashboard-data/:id', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.query;

    try {
        await pool.query(
            'DELETE FROM dashboard_data WHERE id = $1 AND user_id = $2',
            [id, userId]
        );
        res.json({ message: 'נמחק בהצלחה' });
    } catch (error) {
        console.error('Dashboard data delete error:', error);
        res.status(500).json({ errors: ['שגיאה במחיקת נתונים'] });
    }
});

// עדכון נתוני דשבורד
app.put('/api/dashboard-data/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, phone, address, userId } = req.body;

    try {
        const record = await pool.query(
            'SELECT * FROM dashboard_data WHERE id = $1 AND user_id = $2',
            [id, userId]
        );

        if (record.rows.length === 0) {
            return res.status(403).json({
                errors: ['אין הרשאה לעדכן רשומה זו']
            });
        }

        const result = await pool.query(
            'UPDATE dashboard_data SET name = $1, email = $2, phone = $3, address = $4 WHERE id = $5 AND user_id = $6 RETURNING *',
            [name, email, phone, address, id, userId]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Dashboard data update error:', error);
        res.status(500).json({ errors: ['שגיאה בעדכון נתונים'] });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`השרת פועל בפורט ${PORT}`);
});