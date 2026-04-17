import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MousePointerClick, ShoppingCart, Shield, BarChart3, Zap, Globe } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 font-sans">
      <main className="flex-1">
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-32 flex flex-col items-center justify-center text-center">
          <div className="inline-flex items-center gap-2 bg-zinc-100 px-4 py-2 rounded-full text-sm text-zinc-600 mb-8">
            <Zap className="w-4 h-4" />
            Launch your affiliate program in minutes
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-zinc-900 mb-6 sm:text-7xl">
            ClickStream
          </h1>
          <p className="max-w-2xl text-xl leading-8 text-zinc-600 mb-10">
            Affiliate marketing made simple. Launch PPC or PPS campaigns in minutes with zero technical overhead.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/sign-up">
              <Button size="lg" className="w-full sm:w-auto px-8">Get Started Free</Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="outline" className="w-full sm:w-auto px-8">Sign In</Button>
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-white py-24">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-4">Dual Tracking Metrics</h2>
            <p className="text-center text-zinc-600 mb-12 max-w-2xl mx-auto">Choose the payment model that works best for your business</p>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="bg-zinc-50 p-8 rounded-2xl border border-zinc-100 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                  <MousePointerClick className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-zinc-900">Pay-Per-Click (PPC)</h3>
                <p className="text-zinc-600 mb-4">Requires zero technical changes to the merchant's website. Track clicks and redirect instantly.</p>
                <ul className="text-sm text-zinc-500 space-y-2">
                  <li>• Instant setup</li>
                  <li>• No code required</li>
                  <li>• Real-time tracking</li>
                </ul>
              </div>
              <div className="bg-zinc-50 p-8 rounded-2xl border border-zinc-100 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-6">
                  <ShoppingCart className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-zinc-900">Pay-Per-Sale (PPS)</h3>
                <p className="text-zinc-600 mb-4">A low-code solution for merchants ready to track actual conversions. Simple copy-paste integration.</p>
                <ul className="text-sm text-zinc-500 space-y-2">
                  <li>• Commission-based</li>
                  <li>• Simple script integration</li>
                  <li>• Conversion validation</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="py-24">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Why Choose ClickStream?</h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="text-center">
                <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <Shield className="w-6 h-6 text-zinc-600" />
                </div>
                <h3 className="font-semibold mb-2">Fraud Protection</h3>
                <p className="text-sm text-zinc-500">Advanced duplicate click detection and conversion validation</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <BarChart3 className="w-6 h-6 text-zinc-600" />
                </div>
                <h3 className="font-semibold mb-2">Real-time Analytics</h3>
                <p className="text-sm text-zinc-500">Track clicks, conversions, and earnings in real-time</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <Globe className="w-6 h-6 text-zinc-600" />
                </div>
                <h3 className="font-semibold mb-2">Global Reach</h3>
                <p className="text-sm text-zinc-500">Support for affiliates and merchants worldwide</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <footer className="bg-zinc-900 text-zinc-400 py-12 text-center">
        <p>&copy; 2026 ClickStream. All rights reserved.</p>
        <p className="text-sm mt-2">Group Members: Qamar Raza, Abdullah Khalid, Muddasir Javed, Faris Ejaz</p>
      </footer>
    </div>
  );
}