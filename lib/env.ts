// lib/env.ts
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

dotenv.config({ path: path.resolve(process.cwd(), '.env.local.example') });

export const DATABASE_URL = process.env.DATABASE_URL ?? '';
export const API_KEY = process.env.API_KEY ?? null;

export function getDatabaseUrl() {
  return DATABASE_URL || null;
}

export function ensureDatabaseConfigured() {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL no está definida. Crea un archivo .env.local con la URL de tu base de datos.');
  }

  return DATABASE_URL;
}

export function requireEnv() {
  if (!DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL no está definida en .env.local');
    console.error('📋 Asegurate de que el archivo .env.local exista y contenga DATABASE_URL');
    process.exit(1);
  }
}
