import { NextRequest, NextResponse } from 'next/server';
import { DATABASE_URL } from '@/lib/env';
import { getPedidoById, toPedidoLegacyShape } from '@/lib/services/pedidos';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!DATABASE_URL) {
      return NextResponse.json(
        {
          error: 'La base de datos no está configurada.',
          detalle: 'Define DATABASE_URL en tu archivo .env.local para consultar pedidos.',
        },
        { status: 503 }
      );
    }

    const { id } = await params;
    const result = await getPedidoById(id);

    if (result.type === 'invalid') {
      return NextResponse.json(
        { error: 'Formato inválido. Use "division-tipo-numero" o solo el número' },
        { status: 400 }
      );
    }

    if (result.type === 'not_found') {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    if (result.type === 'multiple') {
      return NextResponse.json({
        multiple: true,
        pedidos: result.pedidos.map((pedido) => ({
          division: pedido.division,
          tipo: pedido.tipo,
          numero: pedido.numero,
          fecha_emision: pedido.fechaEmision,
          cliente: pedido.cliente,
          cliente_id: pedido.clienteId,
          importe_total: pedido.importeTotal,
          id_completo: pedido.id,
        })),
      });
    }

    return NextResponse.json(toPedidoLegacyShape(result.pedido));
  } catch (error) {
    console.error('❌ Error en API:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        detalle: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
