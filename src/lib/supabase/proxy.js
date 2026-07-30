import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: getClaims() validates the JWT signature; never rely on getSession() in proxy.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;

  const url = request.nextUrl;
  const isAdminPath = url.pathname.startsWith("/admin");
  const isAdminLogin = url.pathname === "/admin/login";
  const isEmployeePath =
    url.pathname.startsWith("/clock") || url.pathname.startsWith("/history");

  if (isAdminPath && !isAdminLogin && !claims) {
    const loginUrl = url.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.searchParams.set("next", url.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isEmployeePath && !claims) {
    const loginUrl = url.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  // NOTE: whether a signed-in user is an admin or an employee is decided by
  // requireAdmin()/requireEmployee() in the layouts and server actions, which
  // query the database. The proxy runs on the Edge and deliberately does not,
  // so it can only enforce "is signed in" here. Authorization is never done in
  // this file.

  if (isAdminLogin && claims) {
    const dashboardUrl = url.clone();
    dashboardUrl.pathname = "/admin";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  return supabaseResponse;
}
