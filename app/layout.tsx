import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { getConfiguredAppOrigin } from "@/lib/runtime-config";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

const appOrigin = getConfiguredAppOrigin();

export const metadata: Metadata = {
  metadataBase: new URL(appOrigin),
  title: {
    default: "AI Coding Blog",
    template: "%s | AI Coding Blog",
  },
  description: "A modern blog about AI coding, machine learning, and software development",
  keywords: ["AI", "coding", "machine learning", "software development", "programming"],
  authors: [{ name: "AI Coding Blog" }],
  creator: "AI Coding Blog",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: appOrigin,
    title: "AI Coding Blog",
    description: "A modern blog about AI coding, machine learning, and software development",
    siteName: "AI Coding Blog",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Coding Blog",
    description: "A modern blog about AI coding, machine learning, and software development",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css"
        />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
