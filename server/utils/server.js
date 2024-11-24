const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const cors = require('cors');
const config = require('./config');
const { validatePassword, validateEmail } = require('./validation');

const PORT = process.env.PORT || 3001;
const app = express();


app.enable('trust proxy');


// Middleware
app.use(cors({
    origin: '*',  // זמני, לצורך בדיקה
    credentials: true
}));
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));


app.use((req, res, next) => {
    console.log('-------------------');
    console.log('Request URL:', req.url);
    console.log('Request Method:', req.method);
    console.log('Request Headers:', req.headers);
    console.log('Request Body:', req.body);
    console.log('-------------------');
    next();
});

// Debugging middleware
app.use((req, res, next) => {
    console.log('Request URL:', req.url);
    console.log('Request Method:', req.method);
    console.log('Request Body:', req.body);
    next();
});

// נתיב בדיקה
app.get('/test', (req, res) => {
    res.json({ message: 'Server is working' });
});

// Route ברירת מחדל
app.get('/', (req, res) => {
    res.json({ message: 'Server is running' });
});

// יצירת pool של חיבורים
const pool = new Pool(config.db);

// נתיב להרשמה
app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    console.log('Registration attempt:', { email });

    const emailErrors = validateEmail(email);
    const passwordErrors = validatePassword(password);

    if (emailErrors.length > 0 || passwordErrors.length > 0) {
        console.log('Validation errors:', { emailErrors, passwordErrors });
        return res.status(400).json({
            errors: [...emailErrors, ...passwordErrors]
        });
    }

    try {
        const existingUser = await pool.query(
            'SELECT * FROM users WHERE email = $1',
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
        console.error('Detailed error:', error);
        res.status(500).json({ errors: ['שגיאה בהרשמה'] });
    }
});

// נתיב להתחברות
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
        console.error('Error:', error);
        res.status(500).json({ errors: ['שגיאה בהתחברות'] });
    }
});

// נתיב לבדיקת טוקן "זכור אותי"
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
        console.error('Error:', error);
        res.status(500).json({ errors: ['שגיאה בבדיקת הטוקן'] });
    }
});

// נתיב לשחזור סיסמה
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
        console.error('Error:', error);
        res.status(500).json({ errors: ['שגיאה בתהליך שחזור הסיסמה'] });
    }
});

// נתיב לאיפוס סיסמה
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
        console.error('Error:', error);
        res.status(500).json({ errors: ['שגיאה בעדכון הסיסמה'] });
    }
});

// נתיב לעדכון סיסמה
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
        console.error('Error:', error);
        res.status(500).json({ errors: ['שגיאה בעדכון הסיסמה'] });
    }
});

// API נתוני דשבורד
app.get('/api/dashboard-data', async (req, res) => {
    const { userId } = req.query;

    try {
        const result = await pool.query(
            'SELECT * FROM dashboard_data WHERE user_id = $1',
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ errors: ['שגיאה בטעינת נתונים'] });
    }
});

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
        console.error('Error:', error);
        res.status(500).json({ errors: ['שגיאה בהוספת נתונים'] });
    }
});

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
        console.error('Error:', error);
        res.status(500).json({ errors: ['שגיאה במחיקת נתונים'] });
    }
});

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
        console.error('Error:', error);
        res.status(500).json({ errors: ['שגיאה בעדכון נתונים'] });
    }
});

const port = process.env.PORT || 10000;  // שינוי הפורט ברירת המחדל ל-10000
app.listen(port, () => {                 // הסרנו את ה-0.0.0.0
    console.log(`Server is running on port ${port}`);
});