const { Pool } = require('pg');
const config = require('./config');

// יצירת חיבור חדש עם הקונפיג
const pool = new Pool(config.db);

async function testConnection() {
    try {
        console.log('מנסה להתחבר לדאטאבייס...');

        const client = await pool.connect();
        console.log('התחבר בהצלחה!');

        const result = await client.query('SELECT NOW()');
        console.log('שאילתת בדיקה הצליחה:', result.rows[0]);

        client.release();
        console.log('החיבור נסגר בהצלחה');

        return true;
    } catch (err) {
        console.error('שגיאת התחברות:', {
            name: err.name,
            message: err.message,
            stack: err.stack,
            code: err.code
        });
        return false;
    } finally {
        await pool.end();
    }
}

testConnection()
    .then(success => {
        if (success) {
            console.log('כל הבדיקות עברו בהצלחה!');
        } else {
            console.log('היו שגיאות בבדיקת החיבור');
        }
        process.exit(0);
    });