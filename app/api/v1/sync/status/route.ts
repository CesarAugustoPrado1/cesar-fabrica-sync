import { withApiAuth } from '@/lib/api/middleware';
import { apiSuccess } from '@/lib/api/response';
import { getSyncStatus } from '@/lib/sync/runner';

export const GET = withApiAuth(async () => {
  const status = await getSyncStatus();
  return apiSuccess(status);
});
