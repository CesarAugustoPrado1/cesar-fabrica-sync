import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Convertir el parámetro a número
    const erpId = parseInt(params.id);
    
    // Validar que sea un número válido
    if (isNaN(erpId)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'El ID debe ser un número válido' 
        },
        { status: 400 }
      );
    }

    // Buscar el producto por erp_id
    const result = await query(
      'SELECT * FROM productos WHERE erp_id = $1',
      [erpId]
    );

    // Verificar si existe
    if (result.rows.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Producto con erp_id ${erpId} no encontrado` 
        },
        { status: 404 }
      );
    }

    // Devolver el producto
    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
    
  } catch (error) {
    console.error('Error al obtener producto:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor' 
      },
      { status: 500 }
    );
  }
}
