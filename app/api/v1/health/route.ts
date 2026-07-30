import { apiSuccess } from '@/lib/api/response';

export async function GET() {
  return apiSuccess({
    status: 'ok',
    service: 'cesar-fabrica-sync',
    timestamp: new Date().toISOString(),
  });
}
