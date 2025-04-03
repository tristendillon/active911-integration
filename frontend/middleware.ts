import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const { pathname } = request.nextUrl

  // Track pathname for debugging
  response.headers.set('X-PATHNAME', pathname)

  // Check for root access and redirect to /public
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/public', request.url))
  }

  // Handle direct access to dashboard paths
  // If someone tries to access /d/all or /d/[station] directly, redirect to the correct URL
  if (pathname.match(/^\/d\/(all|[^\/]+)$/)) {
    const segments = pathname.split('/')
    const lastSegment = segments[segments.length - 1]
    
    // Redirect to the appropriate public URL
    return NextResponse.redirect(new URL(`/public/d/${lastSegment}`, request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images/ (image files)
     * - public/ (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|images/).*)'
  ]
}