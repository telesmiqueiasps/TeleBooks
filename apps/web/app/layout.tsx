import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "../components/theme-provider";
import { AuthProvider } from "../components/auth/auth-provider";
import { PwaRegister } from "../components/pwa/pwa-register";
import { InstallPrompt } from "../components/pwa/install-prompt";
import "./globals.css";

export const metadata: Metadata = {
  title: "TeleBooks — Sua biblioteca, do seu jeito",
  description:
    "TeleBooks — Sua biblioteca, do seu jeito. Mais que livros, é sobre pessoas.",
  applicationName: "TeleBooks",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TeleBooks",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icone.ico?v=2" },
      { url: "/icone.png?v=2", type: "image/png" },
      { url: "/favicon.ico?v=2" },
    ],
    apple: [
      { url: "/apple-touch-icon.png?v=2", sizes: "180x180", type: "image/png" },
      { url: "/icone.png?v=2", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/icone.ico?v=2",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#007BFF" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0F1A" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="font-sans antialiased bg-background text-foreground selection:bg-blue-100 selection:text-blue-900 dark:selection:bg-blue-900/40 dark:selection:text-blue-100 min-h-screen">
        <ThemeProvider>
          <AuthProvider>
            {children}
            <PwaRegister />
            <InstallPrompt />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
