import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validar formato "division-tipo-numero"
    const partes = id.split('-');
    if (partes.length !== 3) {
      return NextResponse.json(
        { error: 'Formato inválido. Use "division-tipo-numero"' },
        { status: 400 }
      );
    }
    const [divisionStr, tipo, numeroStr] = partes;
    const division = parseInt(divisionStr);
    const numero = parseInt(numeroStr);
    if (isNaN(division) || isNaN(numero)) {
      return NextResponse.json(
        { error: 'División y número deben ser números' },
        { status: 400 }
      );
    }

    // 1. Cabecera + cliente
    const cabeceraResult = await sql`
      SELECT 
        c.*,
        cl.nombre as cliente_nombre,
        cl.telefono as cliente_telefono,
        cl.email as cliente_email
      FROM notas_pedido_cabecera c
      LEFT JOIN clientes cl ON c.cliente_id = cl.id
      WHERE c.division = ${division}
        AND c.tipo = ${tipo}
        AND c.numero = ${numero}
    `;

    if (cabeceraResult.length === 0) {
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404 }
      );
    }

    const cabecera = cabeceraResult[0];

    // 2. Detalles con productos
    const detalles = await sql`
      SELECT 
        d.*,
        p.nombre as producto_nombre,
        p.codigo as producto_codigo,
        p.precio as producto_precio
      FROM notas_pedido_detalle d
      LEFT JOIN productos p ON d.articulo_id = p.id
      WHERE d.division = ${division}
        AND d.tipo = ${tipo}
        AND d.numero = ${numero}
      ORDER BY d.renglon ASC
    `;

    // 3. Respuesta estructurada
    const response = {
      pedido: {
        cabecera: {
          division: cabecera.division,
          tipo: cabecera.tipo,
          numero: cabecera.numero,
          fecha_emision: cabecera.fecha_emision,
          fecha_alta: cabecera.fecha_alta,
          estado_aprobacion: cabecera.estado_aprobacion,
          moneda: cabecera.moneda,
          condicion_pago: cabecera.condicion_pago,
          importe_bruto: cabecera.importe_bruto,
          importe_total: cabecera.importe_total,
          observacion: cabecera.observacion,
          clasificaciones: {
            c1: cabecera.clasificacion1,
            c2: cabecera.clasificacion2,
            c3: cabecera.clasificacion3,
            c4: cabecera.clasificacion4,
            c5: cabecera.clasificacion5,
            c6: cabecera.clasificacion6,
          }
        },
        cliente: {
          id: cabecera.cliente_id,
          nombre: cabecera.cliente_nombre,
          telefono: cabecera.cliente_telefono,
          email: cabecera.cliente_email,
        },
        detalles: detalles.map((d: any) => ({
          renglon: d.renglon,
          articulo: {
            id: d.articulo_id,
            codigo: d.producto_codigo,
            nombre: d.producto_nombre,
            precio: d.producto_precio,
          },
          cantidad_pedida: d.cantidad_pedida,
          precio_neto: d.precio_neto,
          unidad_medida: d.unidad_medida,
          subtotal: (d.cantidad_pedida || 0) * (d.precio_neto || 0),
        })),
        resumen: {
          total_items: detalles.length,
          importe_total: cabecera.importe_total,
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error en API:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
