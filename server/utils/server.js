            const express = require('express');
            const mysql = require('mysql2/promise');
            const bcrypt = require('bcrypt');
            const bodyParser = require('body-parser');
            const cors = require('cors');
            const config = require('./config');
            const { validatePassword, validateEmail } = require('./validation');


            const PORT = process.env.PORT || 3001;
            const app = express();

            // Middleware
            app.use(cors({
                origin: ['https://katz-abr.onrender.com', 'http://localhost:3000', 'https://katz-abr-frontend.onrender.com'],
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                allowedHeaders: ['Content-Type', 'Authorization'],
                credentials: true,
                exposedHeaders: ['set-cookie']
            }));


            // Route ברירת מחדל
            app.get('/', (req, res) => {
                res.json({ message: 'Server is running' });
            });

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
                    res.status(501).json({ errors: ['שגיאה בהרשמה'] });
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
                    res.status(502).json({ errors: ['שגיאה בהתחברות'] });
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
                    res.status(503).json({ errors: ['שגיאה בבדיקת הטוקן'] });
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
                        return res.status(419).json({
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
                    res.status(504).json({ errors: ['שגיאה בתהליך שחזור הסיסמה'] });
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
                    res.status(505).json({ errors: ['שגיאה בעדכון הסיסמה'] });
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
                        return res.status(420).json({
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
                    res.status(506).json({ errors: ['שגיאה בעדכון הסיסמה'] });
                } finally {
                    if (connection) connection.release();
                }
            });


            app.get('/api/dashboard-data', async (req, res) => {
                const { userId } = req.query;
                let connection;

                try {
                    connection = await pool.getConnection();
                    const [rows] = await connection.execute(
                        'SELECT * FROM dashboard_data WHERE user_id = ?',
                        [userId]
                    );
                    res.json(rows);
                } catch (error) {
                    console.error('Error:', error);
                    res.status(507).json({ errors: ['שגיאה בטעינת נתונים'] });
                } finally {
                    if (connection) connection.release();
                }
            });

            app.post('/api/dashboard-data', async (req, res) => {
                // לוג של המידע שמגיע
                console.log('Received request body:', req.body);

                const { userId, name, email, phone, address, additionalInfo = null } = req.body;

                // בדיקת תקינות
                if (!userId || !name || !email || !phone || !address) {
                    console.log('Missing required fields:', { userId, name, email, phone, address });
                    return res.status(401).json({
                        errors: ['כל השדות חובה למילוי']
                    });
                }

                if (!userId) {
                    console.log('Missing userId');
                    return res.status(400).json({
                        errors: ['חסר מזהה משתמש']
                    });
                }

                let connection;
                try {
                    connection = await pool.getConnection();
                    console.log('Database connection established');

                    // בדיקה שהמשתמש קיים
                    const [userExists] = await connection.execute(
                        'SELECT id FROM users WHERE id = ?',
                        [userId]
                    );

                    if (userExists.length === 0) {
                        console.log('User not found for ID:', userId);
                        return res.status(450).json({
                            errors: ['משתמש לא נמצא']
                        });
                    }

                    console.log('Found user, proceeding with insert');

                    // הכנסת הנתונים
                    const [result] = await connection.execute(
                        'INSERT INTO dashboard_data (user_id, name, email, phone, address, additional_info) VALUES (?, ?, ?, ?, ?, ?)',
                        [userId, name, email, phone, address, additionalInfo]
                    );

                    console.log('Insert successful:', result);

                    // קבלת הנתונים שנשמרו
                    const [newRow] = await connection.execute(
                        'SELECT * FROM dashboard_data WHERE id = ?',
                        [result.insertId]
                    );

                    res.status(201).json({
                        message: 'הנתונים נוספו בהצלחה',
                        data: newRow[0]
                    });
                } catch (error) {
                    console.error('Detailed error:', error);
                    res.status(508).json({ errors: ['שגיאה בהוספת נתונים'] });
                } finally {
                    if (connection) connection.release();
                }
            });
            app.delete('/api/dashboard-data/:id', async (req, res) => {
                const { id } = req.params;
                const { userId } = req.query;
                let connection;

                try {
                    connection = await pool.getConnection();
                    await connection.execute(
                        'DELETE FROM dashboard_data WHERE id = ? AND user_id = ?',
                        [id, userId]
                    );
                    res.json({ message: 'נמחק בהצלחה' });
                } catch (error) {
                    console.error('Error:', error);
                    res.status(509).json({ errors: ['שגיאה במחיקת נתונים'] });
                } finally {
                    if (connection) connection.release();
                }
            });


            app.put('/api/dashboard-data/:id', async (req, res) => {
                const { id } = req.params;
                const { name, email, phone, address, userId } = req.body;
                let connection;

                try {
                    connection = await pool.getConnection();

                    // בדיקה שהרשומה שייכת למשתמש
                    const [record] = await connection.execute(
                        'SELECT * FROM dashboard_data WHERE id = ? AND user_id = ?',
                        [id, userId]
                    );

                    if (record.length === 0) {
                        return res.status(403).json({
                            errors: ['אין הרשאה לעדכן רשומה זו']
                        });
                    }

                    // עדכון הנתונים
                    await connection.execute(
                        'UPDATE dashboard_data SET name = ?, email = ?, phone = ?, address = ? WHERE id = ? AND user_id = ?',
                        [name, email, phone, address, id, userId]
                    );

                    // קבלת הנתונים המעודכנים
                    const [updatedRecord] = await connection.execute(
                        'SELECT * FROM dashboard_data WHERE id = ?',
                        [id]
                    );

                    res.json(updatedRecord[0]);
                } catch (error) {
                    console.error('Error:', error);
                    res.status(500).json({ errors: ['שגיאה בעדכון נתונים'] });
                } finally {
                    if (connection) connection.release();
                }
            });
            // הפעלת השרת
            app.listen(PORT, '0.0.0.0', () => {
                console.log(`השרת פועל בפורט ${PORT}`);
            });