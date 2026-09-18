import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_ROUTES = [
  "/dashboard",
  "/upload",
  "/content",
  "/settings",
  "/history",
  "/admin",
];

const CREATOR_ROUTES = [
  "/dashboard",
  "/content",
];

const ADMIN_ROUTES = [
  "/admin",
];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
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

  // Refresh the auth session on every request
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Check if this is a protected route
  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // For authenticated users on protected routes, check banned + role in one query
  if (user && isProtected) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin, is_creator, is_banned")
      .eq("id", user.id)
      .single();

    // Banned users get redirected to homepage on all protected routes
    if (profile?.is_banned) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("banned", "1");
      return NextResponse.redirect(url);
    }

    // Admin route check
    const isAdminRoute = ADMIN_ROUTES.some((route) =>
      pathname.startsWith(route)
    );
    if (isAdminRoute && !profile?.is_admin) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    // Creator route check
    const isCreatorRoute = CREATOR_ROUTES.some((route) =>
      pathname.startsWith(route)
    );
    if (isCreatorRoute && !profile?.is_creator) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
