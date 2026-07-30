import { NextRequest } from 'next/server';
import { withApiAuth } from '@/lib/api/middleware';
import { apiPaginated } from '@/lib/api/response';
import { listProductos } from '@/lib/services/pedidos';

export const GET = withApiAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);

  const result = await listProductos(limit, offset);

  return apiPaginated(result.items, {
    cursor: null,
    hasMore: result.offset + result.items.length < result.total,
    limit: result.limit,
  });
});
