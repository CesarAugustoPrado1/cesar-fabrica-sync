import { NextRequest } from 'next/server';
import { API_KEY } from '../env';
import { apiError } from './response';

export function requireApiKey(request: NextRequest) {
  if (!API_KEY) {
    return null;
  }

  const header = request.headers.get('authorization');
  const apiKeyHeader = request.headers.get('x-api-key');

  const token =
    header?.startsWith('Bearer ') ? header.slice(7) : apiKeyHeader;

  if (!token || token !== API_KEY) {
    return apiError('No autorizado', 401, 'UNAUTHORIZED');
  }

  return null;
}
