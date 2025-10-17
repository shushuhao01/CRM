import 'reflect-metadata';
import dotenv from 'dotenv';

console.log('Loading environment...');
dotenv.config();

console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);

try {
  console.log('Importing database config...');
  const { initializeDatabase } = require('./src/config/database');
  
  console.log('Initializing database...');
  initializeDatabase().then(() => {
    console.log('Database initialized successfully');
    process.exit(0);
  }).catch((error: any) => {
    console.error('Database initialization failed:', error);
    process.exit(1);
  });
} catch (error: any) {
  console.error('Error importing or initializing:', error);
  process.exit(1);
}