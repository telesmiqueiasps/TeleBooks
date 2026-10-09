import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "../components/theme-provider";
import { AuthProvider } from "../components/auth/auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "TeleBooks — Sua biblioteca, do seu jeito",
  description:
    "TeleBooks — Sua biblioteca, do seu jeito. Mais que livros, é sobre pessoas.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icone.ico?v=2" },
      { url: "/icone.png?v=2", type: "image/png" },
      { url: "/favicon.ico?v=2" },
    ],
    apple: [
      { url: "/icone.png?v=2", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/icone.ico?v=2",
  },
};

export const viewport: Viewport = {
  themeColor: "#007BFF",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
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
      </head>
      <body className="font-sans antialiased bg-background text-foreground selection:bg-blue-100 selection:text-blue-900 dark:selection:bg-blue-900/40 dark:selection:text-blue-100">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
