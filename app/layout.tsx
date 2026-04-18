import type { Metadata } from "next";
import { ClerkProvider, SignOutButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import {
  Home,
  Store,
  Link2,
  ShieldCheck,
  LayoutDashboard,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
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

  // Fetch the user's role so we only show the relevant dashboard link
  let userRole: string | null = null;
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    userRole = user?.role || null;
  }

  // Map role to dashboard config
  const dashboardConfig = userRole
    ? {
      merchant: {
        href: "/merchant",
        label: "Dashboard",
        icon: Store,
        color: "text-emerald-600",
      },
      affiliate: {
        href: "/affiliate",
        label: "Dashboard",
        icon: Link2,
        color: "text-blue-600",
      },
      admin: {
        href: "/admin",
        label: "Dashboard",
        icon: ShieldCheck,
        color: "text-red-600",
      },
    }[userRole] || null
    : null;

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-zinc-50`}
      >
        <ClerkProvider>
          <div className="flex flex-col min-h-screen">
            <header className="border-b bg-white border-zinc-200 sticky top-0 z-50">
              <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <Link
                    href="/"
                    className="font-bold text-xl flex items-center gap-2 text-zinc-900 hover:text-zinc-700 transition-colors"
                  >
                    <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
                      <Home className="w-4 h-4 text-white" />
                    </div>
                    ClickStream
                  </Link>
                  {dashboardConfig && (
                    <Link
                      href={dashboardConfig.href}
                      className={`text-sm font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-zinc-100 transition-colors ${dashboardConfig.color}`}
                    >
                      <dashboardConfig.icon className="w-4 h-4" />
                      {dashboardConfig.label}
                    </Link>
                  )}
                </div>
                <nav className="flex items-center gap-3">
                  {userId ? (
                    <>
                      {!userRole && (
                        <Link
                          href="/onboarding"
                          className="text-sm font-medium bg-zinc-900 text-white px-4 py-2 rounded-md hover:bg-zinc-800 transition-colors"
                        >
                          Set Up Account
                        </Link>
                      )}
                      <UserButton />
                    </>
                  ) : (
                    <>
                      <Link
                        href="/sign-in"
                        className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
                      >
                        Sign In
                      </Link>
                      <Link
                        href="/sign-up"
                        className="text-sm font-medium bg-zinc-900 text-white px-4 py-2 rounded-md hover:bg-zinc-800 transition-colors"
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
