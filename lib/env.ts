// lib/env.ts
import * as dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno desde .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Verificar que DATABASE_URL esté definida
if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL no está definida en .env.local');
  console.error('📋 Asegurate de que el archivo .env.local exista y contenga DATABASE_URL');
  process.exit(1);
}

// Exportar la variable para usarla en otros archivos
export const DATABASE_URL = process.env.DATABASE_URL;