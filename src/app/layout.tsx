import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import CookieConsent from "@/components/privacy/CookieConsent";
import { ServiceWorkerProvider } from "@/components/providers/ServiceWorkerProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { ThemeProvider, ThemeToggle } from "@/components/providers/ThemeProvider";
import { HeaderBar } from "@/components/navigation/HeaderBar";
import { NativeProvider } from "@/components/providers/NativeProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Splintr - Interactive Stories",
  description: "Create and explore interactive branching video stories",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <AuthProvider>
            <ThemeProvider>
              <ToastProvider>
                <HeaderBar />
                {children}
                <CookieConsent />
                <ServiceWorkerProvider />
                <NativeProvider />
              </ToastProvider>
            </ThemeProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
