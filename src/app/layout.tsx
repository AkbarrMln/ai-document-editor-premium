import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import StructuredData from "@/components/StructuredData";
import LazyChatWidget from "@/components/LazyChatWidget";

// Step 8: Font Optimization with display swap
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

// Viewport configuration for mobile optimization
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

// Step 2: Metadata API
export const metadata: Metadata = {
  metadataBase: new URL("https://portofolio-akbarr.vercel.app"),
  title: "Akbar Maulana - Web Developer Portfolio",
  description:
    "Portfolio Akbar Maulana, Web Developer Next.js & React. Fokus membangun produk digital yang cepat, bersih, dan memberikan pengalaman pengguna terbaik.",
  keywords: ["web developer", "next.js", "react", "portfolio", "frontend developer", "Akbar Maulana"],
  authors: [{ name: "Akbar Maulana" }],
  creator: "Akbar Maulana",
  openGraph: {
    type: "website",
    url: "https://portofolio-akbarr.vercel.app",
    title: "Akbar Maulana - Web Developer",
    description: "Portfolio personal web developer Next.js & React",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    siteName: "Akbar Maulana Portfolio",
    locale: "id_ID",
  },
  twitter: {
    card: "summary_large_image",
    title: "Akbar Maulana - Web Developer",
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
  alternates: {
    canonical: "https://portofolio-akbarr.vercel.app",
  },
};

import { AuthProvider } from "@/components/AuthProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <StructuredData />
        {/* Preconnect to external resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        {/* Set tema sebelum React hydration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => { try {
              const theme = localStorage.getItem('theme');
              const d = document.documentElement;
              if (theme === 'dark') {
                d.classList.add('dark');
              } else if (theme === 'light') {
                d.classList.remove('dark');
              } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                d.classList.add('dark');
              }
            } catch (e) {} })();`,
          }}
        />
        <AuthProvider>
          {children}
          <LazyChatWidget />
        </AuthProvider>
      </body>
    </html>
  );
}

