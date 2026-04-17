import type { Metadata } from "next";
import { ClerkProvider, SignOutButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Home } from "lucide-react";
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
  title: "ClickStream",
  description: "Affiliate Marketing SaaS",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-zinc-50`}
      >
        <ClerkProvider>
          <div className="flex flex-col min-h-screen">
            <header className="border-b bg-white border-zinc-200">
              <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <Link
                  href="/"
                  className="font-bold text-xl flex items-center gap-2 text-zinc-900"
                >
                  <Home className="w-5 h-5" />
                  ClickStream
                </Link>
                <nav className="flex items-center gap-4">
                  {userId ? (
                    <>
                      <Link
                        href="/merchant"
                        className="text-sm font-medium hover:text-zinc-600"
                      >
                        Merchant
                      </Link>
                      <Link
                        href="/affiliate"
                        className="text-sm font-medium hover:text-zinc-600"
                      >
                        Affiliate
                      </Link>
                      <Link
                        href="/admin"
                        className="text-sm font-medium hover:text-red-600 text-red-500"
                      >
                        Admin
                      </Link>
                      <SignOutButton />
                    </>
                  ) : (
                    <>
                      <Link
                        href="/sign-in"
                        className="text-sm font-medium hover:text-zinc-600"
                      >
                        Sign In
                      </Link>
                      <Link
                        href="/sign-up"
                        className="text-sm font-medium bg-zinc-900 text-white px-4 py-2 rounded-md hover:bg-zinc-800"
                      >
                        Get Started
                      </Link>
                    </>
                  )}
                </nav>
              </div>
            </header>
            <main className="flex-1">{children}</main>
          </div>
        </ClerkProvider>
      </body>
    </html>
  );
}
