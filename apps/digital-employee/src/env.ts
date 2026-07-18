import path from 'path';
import dotenv from 'dotenv';
// Load from digital-employee's own .env (falls back to apps/api/.env for dev compat)
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../api/.env') }); // fallback — dev only
