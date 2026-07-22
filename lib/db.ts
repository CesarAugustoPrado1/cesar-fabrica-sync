// lib/db.ts
import { neon } from '@neondatabase/serverless';
import { DATABASE_URL } from './env';

export const sql = neon(DATABASE_URL);