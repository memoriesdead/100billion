import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import { Toaster } from "sonner";
import ClientBody from "./ClientBody";
// import { AuthProvider } from "@/context/AuthContext"; // Removed redundant import
import Providers from "@/components/Providers"; // Import the new Providers component

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TikTok - Make Your Day",
  description: "TikTok - trends start here. On a device or on the web, viewers can watch and discover millions of personalized short videos.",
  icons: {
    icon: "/favicon.ico",
  },
};

// This helps suppress hydration warnings in development
export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-background antialiased" suppressHydrationWarning>
        {/* Wrap the main content with the Providers component */}
        <Providers>
          <ClientBody>{children}</ClientBody>
        </Providers>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
