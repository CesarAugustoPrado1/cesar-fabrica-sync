import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const productos = await sql`SELECT * FROM productos LIMIT 10`;
    return NextResponse.json({ success: true, data: productos, count: productos.length });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}