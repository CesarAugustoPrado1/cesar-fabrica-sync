import { NextRequest } from 'next/server';
import { withApiAuth } from '@/lib/api/middleware';
import { apiError, apiSuccess } from '@/lib/api/response';
import { parsePedidoId, updateEstadoOperativo } from '@/lib/services/pedidos';

const ESTADOS_VALIDOS = new Set([
  'pendiente',
  'en_preparacion',
  'listo',
  'en_transito',
  'entregado',
  'cancelado',
]);

export const PATCH = withApiAuth(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const parsed = parsePedidoId(id);

  if (!parsed || parsed.division <= 0 || !parsed.tipo) {
    return apiError(
      'Use el ID completo division-tipo-numero para actualizar estado',
      400,
      'INVALID_ID'
    );
  }

  const body = await request.json();
  const estadoOperativo = body.estadoOperativo ?? body.estado_operativo;
  const notas = body.notas ?? null;
  const actualizadoPor = body.actualizadoPor ?? body.actualizado_por ?? null;

  if (!estadoOperativo || typeof estadoOperativo !== 'string') {
    return apiError('estadoOperativo es requerido', 400, 'VALIDATION_ERROR');
  }

  if (!ESTADOS_VALIDOS.has(estadoOperativo)) {
    return apiError(
      `estadoOperativo inválido. Valores: ${[...ESTADOS_VALIDOS].join(', ')}`,
      400,
      'VALIDATION_ERROR'
    );
  }

  const result = await updateEstadoOperativo({
    division: parsed.division,
    tipo: parsed.tipo,
    numero: parsed.numero,
    estadoOperativo,
    notas,
    actualizadoPor,
  });

  if (result.type === 'not_found') {
    return apiError('Pedido no encontrado', 404, 'NOT_FOUND');
  }

  return apiSuccess(result);
});
