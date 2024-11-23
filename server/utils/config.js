const config = {
    db: {
        connectionString: process.env.DATABASE_URL || "postgresql://katz_user:katz741258@hardy-badger-4734.g8z.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full",
        ssl: {
            rejectUnauthorized: false  // בהתחלה נשים false כדי לבדוק שהכל עובד
        }
    }
};

module.exports = config;