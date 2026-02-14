import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { AppWrapper } from "@/components/AppWrapper";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProvePicks - Coming Soon",
  description: "The future of sports betting prediction markets",
  icons: {
    icon: "https://qiodxdkcvewvappuzuud.supabase.co/storage/v1/object/public/SPORTS/logos/Logo.jpg",
    apple: "https://qiodxdkcvewvappuzuud.supabase.co/storage/v1/object/public/SPORTS/logos/Logo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <AppWrapper>{children}</AppWrapper>
      </body>
    </html>
  );
}
