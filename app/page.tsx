import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MousePointerClick, ShoppingCart, Shield, BarChart3, Zap, Globe, ChevronRight, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[#1a1b1e] font-sans">
      <main className="flex-1">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#5865F2]/10 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-[#5865F2]/20 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute top-40 right-1/4 w-72 h-72 bg-[#bd00ff]/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="container mx-auto px-4 py-32 flex flex-col items-center justify-center text-center relative z-10">
            <div className="inline-flex items-center gap-2 bg-[#232428] border border-[#5865F2]/30 px-4 py-2 rounded-full text-sm text-[#949ba4] mb-8 glow-blurple">
              <Sparkles className="w-4 h-4 text-[#5865F2]" />
              Launch your affiliate program in minutes
            </div>
            <h1 className="text-6xl font-bold tracking-tight text-white mb-6 sm:text-8xl text-glow-blurple">
              ClickStream
            </h1>
            <p className="max-w-2xl text-xl leading-8 text-[#949ba4] mb-10">
              Affiliate marketing made simple. Launch PPC or PPS campaigns in minutes with zero technical overhead.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/sign-up">
                <Button size="lg" className="w-full sm:w-auto px-8 bg-gradient-to-r from-[#5865F2] to-[#7289DA] hover:opacity-90 text-white border-0 glow-blurple h-12">
                  Get Started Free
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 border-white/10 hover:bg-white/5 hover:border-[#5865F2]/30 text-[#f2f3f5] h-12">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="relative py-24">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#5865F2]/5 to-transparent pointer-events-none" />
          <div className="container mx-auto px-4 relative z-10">
            <h2 className="text-3xl font-bold text-center mb-4 text-white">Dual Tracking Metrics</h2>
            <p className="text-center text-[#949ba4] mb-12 max-w-2xl mx-auto">Choose the payment model that works best for your business</p>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="bg-[#232428] p-8 rounded-2xl border border-white/5 hover:border-[#5865F2]/30 transition-all duration-300 hover:glow-blurple group">
                <div className="w-12 h-12 bg-[#5865F2]/20 rounded-xl flex items-center justify-center mb-6 border border-[#5865F2]/20 group-hover:scale-110 transition-transform">
                  <MousePointerClick className="w-6 h-6 text-[#5865F2]" />
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-white">Pay-Per-Click (PPC)</h3>
                <p className="text-[#949ba4] mb-4">Requires zero technical changes to the merchant's website. Track clicks and redirect instantly.</p>
                <ul className="text-sm text-[#949ba4] space-y-2">
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#5865F2]" /> Instant setup</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#5865F2]" /> No code required</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#5865F2]" /> Real-time tracking</li>
                </ul>
              </div>
              <div className="bg-[#232428] p-8 rounded-2xl border border-white/5 hover:border-[#00f0ff]/30 transition-all duration-300 hover:glow-cyan group">
                <div className="w-12 h-12 bg-[#00f0ff]/10 rounded-xl flex items-center justify-center mb-6 border border-[#00f0ff]/20 group-hover:scale-110 transition-transform">
                  <ShoppingCart className="w-6 h-6 text-[#00f0ff]" />
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-white">Pay-Per-Sale (PPS)</h3>
                <p className="text-[#949ba4] mb-4">A low-code solution for merchants ready to track actual conversions. Simple copy-paste integration.</p>
                <ul className="text-sm text-[#949ba4] space-y-2">
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#00f0ff]" /> Commission-based</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#00f0ff]" /> Simple script integration</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#00f0ff]" /> Conversion validation</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="py-24 relative">
          <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-[#bd00ff]/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="container mx-auto px-4 relative z-10">
            <h2 className="text-3xl font-bold text-center mb-12 text-white">Why Choose ClickStream?</h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="text-center bg-[#232428]/50 p-8 rounded-2xl border border-white/5 hover:border-[#5865F2]/20 transition-all duration-300">
                <div className="w-12 h-12 bg-[#232428] rounded-xl flex items-center justify-center mb-4 mx-auto border border-white/10">
                  <Shield className="w-6 h-6 text-[#5865F2]" />
                </div>
                <h3 className="font-semibold mb-2 text-white">Fraud Protection</h3>
                <p className="text-sm text-[#949ba4]">Advanced duplicate click detection and conversion validation</p>
              </div>
              <div className="text-center bg-[#232428]/50 p-8 rounded-2xl border border-white/5 hover:border-[#00f0ff]/20 transition-all duration-300">
                <div className="w-12 h-12 bg-[#232428] rounded-xl flex items-center justify-center mb-4 mx-auto border border-white/10">
                  <BarChart3 className="w-6 h-6 text-[#00f0ff]" />
                </div>
                <h3 className="font-semibold mb-2 text-white">Real-time Analytics</h3>
                <p className="text-sm text-[#949ba4]">Track clicks, conversions, and earnings in real-time</p>
              </div>
              <div className="text-center bg-[#232428]/50 p-8 rounded-2xl border border-white/5 hover:border-[#bd00ff]/20 transition-all duration-300">
                <div className="w-12 h-12 bg-[#232428] rounded-xl flex items-center justify-center mb-4 mx-auto border border-white/10">
                  <Globe className="w-6 h-6 text-[#bd00ff]" />
                </div>
                <h3 className="font-semibold mb-2 text-white">Global Reach</h3>
                <p className="text-sm text-[#949ba4]">Support for affiliates and merchants worldwide</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <footer className="border-t border-white/5 bg-[#1e1f22] py-12 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-[#5865F2] to-[#7289DA] rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-white">ClickStream</span>
        </div>
        <p className="text-[#949ba4]">&copy; 2026 ClickStream. All rights reserved.</p>
        <p className="text-sm mt-2 text-[#949ba4]/60">Group Members: Qamar Raza, Abdullah Khalid, Muddasir Javed, Faris Ejaz</p>
      </footer>
    </div>
  );
}
