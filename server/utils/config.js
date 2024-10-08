const config = {
    db: {
        host: 'localhost',
        user: 'app_user',
        password: 'katz741258',
        database: 'my_app_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    },
    port: 3001
};

module.exports = config;