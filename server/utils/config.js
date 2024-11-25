const config = {
    db: {
        connectionString: process.env.DATABASE_URL || "postgresql://katz_user:DrLkurNuFADYmhRzMlb24g@hardy-badger-3148.jxf.gcp-europe-west1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full",
        ssl: {
            rejectUnauthorized: false
        }
    }
};

module.exports = config;