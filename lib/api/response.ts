import { NextRequest, NextResponse } from 'next/server';
import type { ApiErrorEnvelope, ApiSuccessEnvelope } from '@/lib/types';

const API_VERSION = 'v1';

export function apiSuccess<T>(data: T, status = 200) {
  const payload: ApiSuccessEnvelope<T> = { data, meta: { version: API_VERSION } };
  return NextResponse.json(payload, { status });
}

export function apiError(message: string, status: number, code?: string) {
  const payload: ApiErrorEnvelope = {
    error: {
      message,
      code: code ?? 'ERROR',
    },
    meta: { version: API_VERSION },
  };

  return NextResponse.json(payload, { status });
}

export function apiPaginated<T>(
  items: T[],
  pagination: { cursor?: string | null; hasMore: boolean; limit: number }
) {
  return NextResponse.json({
    data: items,
    pagination,
    meta: { version: API_VERSION },
  });
}

export function getRequestId(request: NextRequest) {
  return request.headers.get('x-request-id') ?? crypto.randomUUID();
}
