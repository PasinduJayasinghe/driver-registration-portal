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

  if (isAdminPath && !isAdminLogin && !claims) {
    const loginUrl = url.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.searchParams.set("next", url.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminLogin && claims) {
    const dashboardUrl = url.clone();
    dashboardUrl.pathname = "/admin";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  return supabaseResponse;
}
