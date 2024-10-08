const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const cors = require('cors');
const config = require('./config');
const { validatePassword, validateEmail } = require('./validation');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// יצירת pool של חיבורים
const pool = mysql.createPool(config.db);

// נתיב להרשמה
app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    console.log('Registration attempt:', { email });

    // בדיקת תקינות
    const emailErrors = validateEmail(email);
    const passwordErrors = validatePassword(password);

    if (emailErrors.length > 0 || passwordErrors.length > 0) {
        console.log('Validation errors:', { emailErrors, passwordErrors });
        return res.status(400).json({
            errors: [...emailErrors, ...passwordErrors]
        });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        console.log('Connected to database');

        const [existingUsers] = await connection.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        console.log('Checked existing users:', { count: existingUsers.length });

        if (existingUsers.length > 0) {
            return res.status(400).json({
                errors: ['כתובת האימייל כבר קיימת במערכת']
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Password hashed');

        await connection.execute(
            'INSERT INTO users (email, password) VALUES (?, ?)',
            [email, hashedPassword]
        );
        console.log('User inserted successfully');

        res.status(201).json({ message: 'משתמש נרשם בהצלחה' });

    } catch (error) {
        console.error('Detailed error:', error);
        res.status(500).json({ errors: ['שגיאה בהרשמה'] });
    } finally {
        if (connection) connection.release();
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

    let connection;
    try {
        connection = await pool.getConnection();

        const [users] = await connection.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                errors: ['שם משתמש או סיסמה שגויים']
            });
        }

        const match = await bcrypt.compare(password, users[0].password);
        if (!match) {
            return res.status(401).json({
                errors: ['שם משתמש או סיסמה שגויים']
            });
        }

        let rememberToken = null;
        if (rememberMe) {
            rememberToken = Math.random().toString(36).slice(-16);
            await connection.execute(
                'UPDATE users SET remember_token = ? WHERE id = ?',
                [rememberToken, users[0].id]
            );
        }

        res.status(200).json({
            message: 'התחברות בוצעה בהצלחה',
            user: {
                id: users[0].id,
                email: users[0].email,
                rememberToken
            }
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ errors: ['שגיאה בהתחברות'] });
    } finally {
        if (connection) connection.release();
    }
});

// נתיב לבדיקת טוקן "זכור אותי"
app.post('/check-remember-token', async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({
            errors: ['טוקן לא נמצא']
        });
    }

    let connection;
    try {
        connection = await pool.getConnection();

        const [users] = await connection.execute(
            'SELECT id, email FROM users WHERE remember_token = ?',
            [token]
        );

        if (users.length === 0) {
            return res.status(401).json({
                errors: ['טוקן לא תקין']
            });
        }

        res.status(200).json({
            message: 'טוקן תקין',
            user: {
                id: users[0].id,
                email: users[0].email
            }
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ errors: ['שגיאה בבדיקת הטוקן'] });
    } finally {
        if (connection) connection.release();
    }
});

// נתיב לשחזור סיסמה
app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    let connection;

    try {
        connection = await pool.getConnection();

        const [users] = await connection.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(404).json({
                errors: ['משתמש לא נמצא']
            });
        }

        const resetToken = Math.random().toString(36).slice(-8);
        const expires = new Date();
        expires.setHours(expires.getHours() + 1);

        await connection.execute(
            'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
            [resetToken, expires, users[0].id]
        );

        res.json({
            message: 'קוד איפוס נשלח בהצלחה',
            token: resetToken
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ errors: ['שגיאה בתהליך שחזור הסיסמה'] });
    } finally {
        if (connection) connection.release();
    }
});

// נתיב לאיפוס סיסמה
app.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    let connection;

    try {
        connection = await pool.getConnection();

        const [users] = await connection.execute(
            'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
            [token]
        );

        if (users.length === 0) {
            return res.status(400).json({
                errors: ['קוד איפוס לא תקין או שפג תוקפו']
            });
        }

        const passwordErrors = validatePassword(newPassword);
        if (passwordErrors.length > 0) {
            return res.status(400).json({ errors: passwordErrors });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await connection.execute(
            'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
            [hashedPassword, users[0].id]
        );

        res.json({ message: 'סיסמה עודכנה בהצלחה' });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ errors: ['שגיאה בעדכון הסיסמה'] });
    } finally {
        if (connection) connection.release();
    }
});

// נתיב לעדכון סיסמה
app.post('/update-password', async (req, res) => {
    const { userId, currentPassword, newPassword } = req.body;
    let connection;

    try {
        connection = await pool.getConnection();

        const [users] = await connection.execute(
            'SELECT * FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                errors: ['משתמש לא נמצא']
            });
        }

        const match = await bcrypt.compare(currentPassword, users[0].password);
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

        await connection.execute(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, userId]
        );

        res.json({ message: 'סיסמה עודכנה בהצלחה' });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ errors: ['שגיאה בעדכון הסיסמה'] });
    } finally {
        if (connection) connection.release();
    }
});

// הפעלת השרת
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`השרת פועל בפורט ${PORT}`);
});