import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

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

    const response = NextResponse.redirect(redirectUrl);

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://plunoacxwgwsjayzwmdl.supabase.co";
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
            // IMPORTANTE: Define o cookie diretamente no objeto de resposta do redirecionamento
            // para que o navegador persista a sessão no redirect HTTP 307
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      return response;
    }

    console.error("[OAuth exchangeCodeForSession Error]:", exchangeError);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(
        exchangeError.message || "Erro ao validar sessão do Google."
      )}`
    );
  }

  // Se o código não veio na URL
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
