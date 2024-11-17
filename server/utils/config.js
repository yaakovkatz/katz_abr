const config = {
    db: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'app_user',
        password: process.env.DB_PASSWORD || 'katz741258',
        database: process.env.DB_NAME || 'my_app_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    }
};

module.exports = config;