import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const erpId = parseInt(id);

    if (isNaN(erpId)) {
      return NextResponse.json(
        { success: false, error: 'El ID debe ser un número válido' },
        { status: 400 }
      );
    }

    const result = await sql`SELECT * FROM productos WHERE erp_id = ${erpId}`;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error('Error al obtener producto:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
