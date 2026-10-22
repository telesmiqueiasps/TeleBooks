import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const errorDescription = searchParams.get("error_description");
  const error = searchParams.get("error");

  // Se houver erro retornado pelo provedor OAuth (Google/Supabase)
  if (error || errorDescription) {
    console.error("[OAuth Callback Error]", error, errorDescription);
    const msg = errorDescription || error || "Falha na autenticação com o Google.";
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`);
  }

  if (code) {
    const cookieStore = await cookies();

    // Determina a URL final de redirecionamento
    let redirectUrl = `${origin}${next}`;
    const forwardedHost = request.headers.get("x-forwarded-host");
    const isLocalEnv = process.env.NODE_ENV === "development";
    if (!isLocalEnv && forwardedHost) {
      redirectUrl = `https://${forwardedHost}${next}`;
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://plunoacxwgwsjayzwmdl.supabase.co";
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_-6EwtyA5ZMDK1XaVkjW21A_r1rMfS_-";

    const cookiesToSetLater: { name: string; value: string; options: any }[] = [];

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookieOptions: {
        path: "/",
        sameSite: "lax",
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
              cookiesToSetLater.push({ name, value, options });
            });
          } catch {
            // Ignora em contexto não mutável
          }
        },
      },
    });

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      const response = NextResponse.redirect(redirectUrl);
      cookiesToSetLater.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
      });
      return response;
    }

    console.error("[OAuth exchangeCodeForSession Error]:", exchangeError);

    // Se o servidor não encontrou o code-verifier nos cookies HTTP
    // (ex: cross-domain proxy, Netlify serverless header stripping ou partitioning),
    // redireciona para a página cliente /auth/confirm para troca direta via browser storage/cookies.
    return NextResponse.redirect(
      `${origin}/auth/confirm?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`
    );
  }

  // Se o código não veio na URL
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
