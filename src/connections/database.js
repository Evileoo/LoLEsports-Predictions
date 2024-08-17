import Db from 'mysql2-async';

// Create Pool
const db = new Db({
    host: process.env.DBHOST,
    user: process.env.DBUSER,
    password: process.env.DBPASSWORD,
    database: process.env.DBNAME,
    connectionLimit: 50,
    skiptzfix: true
});

export { db };