import type { Metadata } from "next";
import { ClerkProvider, SignOutButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import {
  Store,
  Link2,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { cache } from "react";
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
  title: "ClickStream | Affiliate Marketing",
  description: "Affiliate Marketing SaaS",
};

// Cache user role lookup to avoid duplicate DB hits per request
const getUserRole = cache(async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role || null;
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();

  const userRole = userId ? await getUserRole(userId) : null;

  const dashboardConfig = userRole
    ? {
      merchant: {
        href: "/merchant",
        label: "Dashboard",
        icon: Store,
        color: "text-emerald-400",
      },
      affiliate: {
        href: "/affiliate",
        label: "Dashboard",
        icon: Link2,
        color: "text-[#5865F2]",
      },
      admin: {
        href: "/admin",
        label: "Dashboard",
        icon: ShieldCheck,
        color: "text-red-400",
      },
    }[userRole] || null
    : null;

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-[#1a1b1e] text-[#f2f3f5]`}
      >
        <ClerkProvider>
          <div className="flex flex-col min-h-screen cyber-grid">
            <header className="sticky top-0 z-50 glass-strong border-b border-white/5">
              <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <Link
                    href="/"
                    className="font-bold text-xl flex items-center gap-2.5 text-white hover:text-[#5865F2] transition-colors duration-300"
                  >
                    <div className="w-9 h-9 bg-gradient-to-br from-[#5865F2] to-[#7289DA] rounded-xl flex items-center justify-center glow-blurple">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <span className="tracking-tight">ClickStream</span>
                  </Link>
                  {dashboardConfig && (
                    <Link
                      href={dashboardConfig.href}
                      className={`text-sm font-medium flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-transparent hover:border-[#5865F2]/30 transition-all duration-300 ${dashboardConfig.color}`}
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
                          className="text-sm font-semibold bg-gradient-to-r from-[#5865F2] to-[#7289DA] text-white px-5 py-2 rounded-lg hover:opacity-90 transition-opacity glow-blurple"
                        >
                          Set Up Account
                        </Link>
                      )}
                      <div className="bg-white/5 rounded-lg p-1 border border-white/5">
                        <UserButton />
                      </div>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/sign-in"
                        className="text-sm font-medium text-[#949ba4] hover:text-white transition-colors px-4 py-2"
                      >
                        Sign In
                      </Link>
                      <Link
                        href="/sign-up"
                        className="text-sm font-semibold bg-gradient-to-r from-[#5865F2] to-[#7289DA] text-white px-5 py-2 rounded-lg hover:opacity-90 transition-opacity glow-blurple"
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
