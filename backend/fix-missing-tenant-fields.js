require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function fixMissingFields() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USERNAME || 'abc789',
    password: process.en
