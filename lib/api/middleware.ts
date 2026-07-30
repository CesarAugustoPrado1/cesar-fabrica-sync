import { NextRequest } from 'next/server';
import { requireApiKey } from '@/lib/api/auth';

export function withApiAuth(
  handler: (request: NextRequest, context?: any) => Promise<Response>
) {
  return async (request: NextRequest, context?: any) => {
    const authError = requireApiKey(request);
    if (authError) return authError;
    return handler(request, context);
  };
}
