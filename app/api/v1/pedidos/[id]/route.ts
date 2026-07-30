import { NextRequest } from 'next/server';
import { withApiAuth } from '@/lib/api/middleware';
import { apiError, apiSuccess } from '@/lib/api/response';
import { getPedidoById } from '@/lib/services/pedidos';

export const GET = withApiAuth(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const result = await getPedidoById(id);

  if (result.type === 'invalid') {
    return apiError(
      'Formato inválido. Use "division-tipo-numero" o solo el número',
      400,
      'INVALID_ID'
    );
  }

  if (result.type === 'not_found') {
    return apiError('Pedido no encontrado', 404, 'NOT_FOUND');
  }

  if (result.type === 'multiple') {
    return apiSuccess({ multiple: true, pedidos: result.pedidos });
  }

  return apiSuccess(result.pedido);
});
