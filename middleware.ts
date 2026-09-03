import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();

  if (url.pathname.startsWith('/api')) {
    url.hostname = 'localhost';
    url.port = '5000';
  }

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/api/:path*'],
};
