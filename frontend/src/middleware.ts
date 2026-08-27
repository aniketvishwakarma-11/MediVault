import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Identify Protected Route Portals
  const isPatientRoute = pathname.startsWith('/patient');
  const isDoctorRoute = pathname.startsWith('/doctor');
  const isAdminRoute = pathname.startsWith('/admin');
  const isAuthRoute = pathname === '/auth';

  // 2. Check Authentication Cookies
  const authCookie = request.cookies.get('medivault_auth')?.value;
  const isDemoCookie = request.cookies.get('medivault_is_demo')?.value;
  const roleCookie = request.cookies.get('medivault_role')?.value;

  // Check for any Supabase Auth session token cookies (sb-*-auth-token)
  const allCookies = request.cookies.getAll();
  const hasSupabaseCookie = allCookies.some(
    (c) => c.name.startsWith('sb-') && c.name.includes('auth-token')
  );

  const isAuthenticated = authCookie === 'true' || isDemoCookie === 'true' || hasSupabaseCookie;

  // 3. Unauthenticated access to Protected Portals -> Server-side redirect to /auth
  if ((isPatientRoute || isDoctorRoute || isAdminRoute) && !isAuthenticated) {
    const loginUrl = new URL('/auth', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Role-based Route Protection (Enforce Portal Access Boundaries)
  if (isAuthenticated && roleCookie) {
    // Patients cannot access /admin or /doctor
    if (roleCookie === 'patient') {
      if (isAdminRoute || isDoctorRoute) {
        return NextResponse.redirect(new URL('/patient/dashboard', request.url));
      }
    }

    // Doctors cannot access /admin
    if (roleCookie === 'doctor' && isAdminRoute) {
      return NextResponse.redirect(new URL('/doctor/dashboard', request.url));
    }
  }

  // 5. Already authenticated user visiting /auth -> Redirect directly to their dashboard
  if (isAuthRoute && isAuthenticated && roleCookie) {
    const targetDashboard =
      roleCookie === 'doctor'
        ? '/doctor/dashboard'
        : roleCookie === 'admin'
        ? '/admin/dashboard'
        : '/patient/dashboard';
    return NextResponse.redirect(new URL(targetDashboard, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all protected routes and auth route:
     * - /patient/:path*
     * - /doctor/:path*
     * - /admin/:path*
     * - /auth
     */
    '/patient/:path*',
    '/doctor/:path*',
    '/admin/:path*',
    '/auth',
  ],
};
