const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'app_user',
    password: 'securepassword',
    database: 'my_app_db'
};

async function testConnection() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Successfully connected to the database.');

        // נסה לבצע שאילתה פשוטה
        const [rows] = await connection.execute('SELECT 1');
        console.log('Query executed successfully:', rows);
    } catch (error) {
        console.error('Error connecting to the database:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('Database connection closed.');
        }
    }
}

testConnection();