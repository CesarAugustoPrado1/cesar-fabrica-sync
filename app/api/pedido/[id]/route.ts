console.log('🔍 API pedido/[id] llamada con ID:', id);
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Si el id contiene guiones, asumimos formato "division-tipo-numero"
    let division: number | null = null;
    let tipo: string | null = null;
    let numero: number | null = null;

    if (id.includes('-')) {
      const partes = id.split('-');
      if (partes.length === 3) {
        const divisionStr = partes[0];
        tipo = partes[1];
        const numeroStr = partes[2];
        const divNum = parseInt(divisionStr);
        const numNum = parseInt(numeroStr);
        if (!isNaN(divNum) && !isNaN(numNum)) {
          division = divNum;
          numero = numNum;
        }
      }
    }

    // Si no se pudo parsear como formato completo, intentamos como número único
    if (division === null || numero === null) {
      const soloNumero = parseInt(id);
      if (!isNaN(soloNumero)) {
        numero = soloNumero;
        // Buscar por número sin division/tipo
        const pedidos = await sql`
          SELECT 
            c.division,
            c.tipo,
            c.numero,
            c.fecha_emision,
            c.fecha_alta,
            c.estado_aprobacion,
            c.moneda,
            c.condicion_pago,
            c.importe_bruto,
            c.importe_total,
            c.observacion,
            c.clasificacion1,
            c.clasificacion2,
            c.clasificacion3,
            c.clasificacion4,
            c.clasificacion5,
            c.clasificacion6,
            c.cliente_id,
            cl.nombre as cliente_nombre,
            cl.telefono as cliente_telefono,
            cl.email as cliente_email
          FROM notas_pedido_cabecera c
          LEFT JOIN clientes cl ON c.cliente_id = cl.id
          WHERE c.numero = ${numero}
          ORDER BY c.division, c.tipo
        `;

        if (pedidos.length === 0) {
          return NextResponse.json(
            { error: `No se encontró pedido con número ${numero}` },
            { status: 404 }
          );
        }

        // Si hay más de uno, devolvemos una lista para que el usuario elija
        if (pedidos.length > 1) {
          return NextResponse.json({
            multiple: true,
            pedidos: pedidos.map((p: any) => ({
              division: p.division,
              tipo: p.tipo,
              numero: p.numero,
              fecha_emision: p.fecha_emision,
              cliente: p.cliente_nombre,
              cliente_id: p.cliente_id,
              importe_total: p.importe_total,
              id_completo: `${p.division}-${p.tipo}-${p.numero}`
            }))
          });
        }

        // Si solo hay uno, lo procesamos igual que el caso de formato completo
        const cabecera = pedidos[0];
        division = cabecera.division;
        tipo = cabecera.tipo;
        numero = cabecera.numero;

        // Obtener detalles
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
      }

      return NextResponse.json(
        { error: 'Formato inválido. Use "division-tipo-numero" o solo el número' },
        { status: 400 }
      );
    }

    // --- Caso formato completo (division-tipo-numero) ---
    // Ya tenemos division, tipo, numero definidos
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
