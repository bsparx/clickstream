# ClickStream Integration Guide for Food Delivery App

This guide explains how to integrate a food delivery application (Foodpanda clone) with ClickStream affiliate marketing system. The food delivery app uses Next.js, PostgreSQL (Neon), and Clerk for authentication.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Architecture](#architecture)
4. [Step 1: Register as Merchant on ClickStream](#step-1-register-as-merchant-on-clickstream)
5. [Step 2: Create a Campaign](#step-2-create-a-campaign)
6. [Step 3: Integrate PPC Tracking](#step-3-integrate-ppc-tracking)
7. [Step 4: Integrate PPS Conversion Tracking](#step-4-integrate-pps-conversion-tracking)
8. [Step 5: Handle Affiliate Links](#step-5-handle-affiliate-links)
9. [Step 6: Order Confirmation Page Setup](#step-6-order-confirmation-page-setup)
10. [Step 7: Testing](#step-7-testing)
11. [Environment Variables](#environment-variables)
12. [Troubleshooting](#troubleshooting)
13. [API Reference](#api-reference)

---

## Overview

ClickStream supports two tracking models:

- **PPC (Pay-Per-Click)**: You pay affiliates for each valid click generated through their referral links. No code changes required on your food delivery app.
- **PPS (Pay-Per-Sale)**: You pay affiliates a commission percentage for each completed order. Requires adding a tracking script to your order confirmation page.

### Integration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        ClickStream Platform                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │   Merchant   │    │   Campaign   │    │  Affiliate Link  │  │
│  │   Account    │───▶│   (PPC/PPS)  │───▶│  (Unique Hash)   │  │
│  └──────────────┘    └──────────────┘    └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Food Delivery App                            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │  Affiliate   │    │   Order      │    │   Conversion     │  │
│  │  Link Click  │───▶│   Placed     │───▶│   Tracking API   │  │
│  └──────────────┘    └──────────────┘    └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### ClickStream Requirements

1. ClickStream application running (locally or deployed)
2. A merchant account on ClickStream
3. Sufficient balance in your ClickStream wallet

### Food Delivery App Requirements

1. Next.js application (App Router or Pages Router)
2. PostgreSQL database (Neon)
3. Clerk authentication integrated
4. Order management system with order confirmation page

---

## Architecture

### Data Flow

1. **Affiliate shares link**: Affiliate generates a unique tracking link from ClickStream
2. **User clicks link**: User is redirected through ClickStream's click engine to your food delivery app
3. **Click logged**: ClickStream logs the click with IP, timestamp, and user agent
4. **Cookie set**: A tracking cookie (`cs_ref`) is set with affiliate data including discount info
5. **User orders**: User places an order on your food delivery app
6. **Conversion reported**: Your app calls ClickStream's conversion API (PPS only)
7. **Payment processed**: ClickStream deducts from merchant, adds to affiliate

### Cookie Format

The `cs_ref` cookie contains a JSON object with the following structure:

```json
{
  "linkId": "clxyz123",
  "reward": 10,
  "type": "PPS"
}
```

- **linkId**: The unique affiliate link identifier
- **reward**: The discount/commission value (percentage for PPS, fixed amount for PPC)
- **type**: Campaign type ("PPC" or "PPS")

### Database Schema (Food Delivery App)

Your food delivery app should have these key tables:

```prisma
// schema.prisma for Food Delivery App

model Order {
  id              String   @id @default(cuid())
  userId          String
  totalAmount     Float
  status          String   // "pending", "confirmed", "delivered", "cancelled"
  affiliateRef    String?  // Store the ClickStream referral ID
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  user            User     @relation(fields: [userId], references: [id])
  orderItems      OrderItem[]
}

model OrderItem {
  id              String   @id @default(cuid())
  orderId         String
  menuItemId      String
  quantity        Int
  price           Float

  order           Order    @relation(fields: [orderId], references: [id])
}

model User {
  id              String   @id // Clerk User ID
  email           String
  name            String?
  orders          Order[]
}
```

---

## Step 1: Register as Merchant on ClickStream

1. Navigate to ClickStream application
2. Click "Get Started Free" or "Sign In"
3. Complete Clerk authentication
4. On the onboarding page, select **"I am a Merchant"**
5. You'll be redirected to the Merchant Dashboard

### Programmatic Registration (Optional)

If you want to automate merchant registration from your food delivery app:

```typescript
// lib/clickstream.ts

export async function registerAsMerchant(clerkUserId: string) {
  // This would require an API endpoint on ClickStream
  // For now, users must register manually through the UI
  console.log("User must register manually at ClickStream");
}
```

---

## Step 2: Create a Campaign

### Via ClickStream UI

1. Go to Merchant Dashboard → Campaigns tab
2. Fill in the campaign form:
   - **Target URL**: Your food delivery app URL (e.g., `https://yourfoodapp.com`)
   - **Campaign Type**: Choose PPC or PPS
   - **Reward Rate**:
     - For PPC: Amount per click (e.g., `$0.05`)
     - For PPS: Commission percentage (e.g., `5%`)
3. Click "Launch"

### Campaign Configuration Examples

#### PPC Campaign (Cost Per Click)

```
Target URL: https://yourfoodapp.com
Type: PPC
Reward: $0.05 per click
```

Use case: Drive traffic to your homepage or special offers page.

#### PPS Campaign (Commission Per Sale)

```
Target URL: https://yourfoodapp.com/restaurants
Type: PPS
Reward: 5% commission
```

Use case: Pay affiliates only when orders are completed.

---

## Step 3: Integrate PPC Tracking

PPC tracking requires **NO CODE CHANGES** to your food delivery app. Here's how it works:

### How PPC Works

1. Affiliate generates a link: `http://localhost:3000/r/clxyz123`
2. User clicks the link
3. ClickStream:
   - Logs the click
   - Validates it's not a duplicate (fraud detection)
   - Deducts from merchant's balance
   - Adds to affiliate's balance
   - Redirects user to your food delivery app
4. User lands on your site with no tracking code needed

### Testing PPC

1. Create a PPC campaign on ClickStream
2. Go to Affiliate Dashboard → Marketplace
3. Generate a link for your campaign
4. Click the link
5. Verify you're redirected to your food delivery app
6. Check ClickStream analytics to see the click recorded

---

## Step 4: Integrate PPS Conversion Tracking

PPS tracking requires adding a script to your **order confirmation page**. This is where conversions happen.

### Step 4.1: Get Tracking Script from ClickStream

1. Go to Merchant Dashboard → Tracking Scripts tab
2. Find your PPS campaign
3. Copy the provided JavaScript code

### Step 4.2: Create Tracking Script Component

Create a new component in your food delivery app:

```typescript
// components/ClickStreamTracker.tsx

"use client";

import { useEffect } from "react";

interface ClickStreamTrackerProps {
  orderId: string;
  orderTotal: number;
}

export function ClickStreamTracker({
  orderId,
  orderTotal,
}: ClickStreamTrackerProps) {
  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    const trackConversion = async () => {
      try {
        // Get referral ID from URL parameter or cookie
        const urlParams = new URLSearchParams(window.location.search);
        const ref = urlParams.get("ref") || getCookie("cs_ref");

        if (!ref) {
          console.log("No affiliate referral found");
          return;
        }

        // Check if already tracked (prevent duplicate tracking)
        const trackedKey = `cs_tracked_${orderId}`;
        if (localStorage.getItem(trackedKey)) {
          console.log("Conversion already tracked");
          return;
        }

        // Send conversion to ClickStream
        const response = await fetch("http://localhost:3000/api/conversions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ref,
            orderId,
            orderTotal,
          }),
        });

        const result = await response.json();

        if (response.ok) {
          console.log("Conversion tracked successfully:", result);
          localStorage.setItem(trackedKey, "true");
        } else {
          console.error("Conversion tracking failed:", result.error);
        }
      } catch (error) {
        console.error("Conversion tracking error:", error);
      }
    };

    trackConversion();
  }, [orderId, orderTotal]);

  // This component renders nothing visible
  return null;
}

// Helper function to get cookie value
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() || null;
  }
  return null;
}
```

### Step 4.3: Alternative - Inline Script Approach

If you prefer not to use a React component, you can add the script directly:

```typescript
// app/order-confirmation/page.tsx

"use client";

import { useEffect } from "react";
import Script from "next/script";

export default function OrderConfirmationPage({
  orderId,
  orderTotal,
}: {
  orderId: string;
  orderTotal: number;
}) {
  return (
    <>
      {/* Other order confirmation content */}

      <Script id="clickstream-tracker" strategy="afterInteractive">
        {`
          (function() {
            // Get referral from URL or cookie
            var urlParams = new URLSearchParams(window.location.search);
            var ref = urlParams.get('ref') || (function() {
              var match = document.cookie.match(/cs_ref=([^;]+)/);
              return match ? match[1] : null;
            })();

            if (ref) {
              // Check if already tracked
              var tracked = localStorage.getItem('cs_tracked_${orderId}');
              if (!tracked) {
                fetch('http://localhost:3000/api/conversions', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    ref: ref,
                    orderId: '${orderId}',
                    orderTotal: ${orderTotal}
                  })
                }).then(function(res) {
                  if (res.ok) {
                    localStorage.setItem('cs_tracked_${orderId}', 'true');
                    console.log('ClickStream: Conversion tracked');
                  }
                }).catch(function(err) {
                  console.error('ClickStream: Tracking failed', err);
                });
              }
            }
          })();
        `}
      </Script>
    </>
  );
}
```

### Step 4.4: Server-Side Conversion Tracking (Recommended)

For better reliability, track conversions server-side when the order status changes:

```typescript
// app/api/orders/[orderId]/confirm/route.ts

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await params;

    // Get the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Update order status to confirmed
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: "confirmed" },
    });

    // If order has an affiliate referral, track the conversion
    if (order.affiliateRef) {
      try {
        const conversionResponse = await fetch(
          "http://localhost:3000/api/conversions",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ref: order.affiliateRef,
              orderId: order.id,
              orderTotal: order.totalAmount,
            }),
          }
        );

        if (conversionResponse.ok) {
          console.log("Conversion tracked for order:", orderId);
        }
      } catch (error) {
        console.error("Failed to track conversion:", error);
        // Don't fail the order confirmation if tracking fails
      }
    }

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Order confirmation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

---

## Step 5: Handle Affiliate Links

When users click affiliate links, they're redirected to your food delivery app with a `ref` parameter. You need to capture and store this.

### Step 5.1: Create Middleware to Capture Referral

```typescript
// middleware.ts (Food Delivery App)

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Check for referral parameter
  const ref = request.nextUrl.searchParams.get("ref");

  if (ref) {
    // Store referral in cookie for 30 days
    response.cookies.set("cs_ref", ref, {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    console.log("Affiliate referral captured:", ref);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
```

### Step 5.2: Store Referral in Order

When a user places an order, include the affiliate referral:

```typescript
// app/api/orders/route.ts

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { items, totalAmount } = body;

    // Get affiliate referral from cookie
    const cookieStore = await cookies();
    const affiliateRef = cookieStore.get("cs_ref")?.value || null;

    // Create order with affiliate reference
    const order = await prisma.order.create({
      data: {
        userId,
        totalAmount,
        status: "pending",
        affiliateRef, // Store the ClickStream referral ID
        orderItems: {
          create: items.map((item: any) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: {
        orderItems: true,
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
```

---

## Step 6: Order Confirmation Page Setup

### Complete Example

```typescript
// app/order-confirmation/[orderId]/page.tsx

import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";
import { ClickStreamTracker } from "@/components/ClickStreamTracker";
import { CheckCircle, Package, MapPin, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const prisma = new PrismaClient();

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId, userId },
    include: {
      orderItems: true,
    },
  });

  if (!order) {
    redirect("/orders");
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* ClickStream Conversion Tracker - Only for confirmed orders */}
      {order.status === "confirmed" && (
        <ClickStreamTracker orderId={order.id} orderTotal={order.totalAmount} />
      )}

      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 mb-2">
          Order Confirmed!
        </h1>
        <p className="text-zinc-600">
          Thank you for your order. Your food is being prepared.
        </p>
      </div>

      {/* Order Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Order Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-zinc-600">Order ID</span>
              <span className="font-mono text-sm">{order.id}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-600">Status</span>
              <Badge
                variant={order.status === "confirmed" ? "default" : "secondary"}
              >
                {order.status}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-600">Total Amount</span>
              <span className="font-bold text-lg">
                ${order.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Items Ordered</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {order.orderItems.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center py-2 border-b last:border-0"
              >
                <div>
                  <p className="font-medium">Menu Item #{item.menuItemId}</p>
                  <p className="text-sm text-zinc-500">Qty: {item.quantity}</p>
                </div>
                <p className="font-semibold">
                  ${(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Delivery Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Delivery Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-zinc-600">
            <Clock className="w-4 h-4" />
            <span>Estimated delivery: 30-45 minutes</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Step 7: Testing

### Test PPC Integration

1. **Create PPC Campaign**:

   - Go to ClickStream Merchant Dashboard
   - Create campaign with target URL: `http://localhost:3001` (your food app)
   - Set reward: `$0.05` per click

2. **Generate Affiliate Link**:

   - Log in as an affiliate on ClickStream
   - Go to Marketplace
   - Generate link for your PPC campaign

3. **Test Click**:
   - Click the affiliate link
   - Verify redirect to your food app
   - Check ClickStream analytics for recorded click

### Test PPS Integration

1. **Create PPS Campaign**:

   - Go to ClickStream Merchant Dashboard
   - Create campaign with target URL: `http://localhost:3001`
   - Set reward: `5%` commission

2. **Add Tracking Script**:

   - Copy tracking script from ClickStream
   - Add to your order confirmation page

3. **Test Full Flow**:
   - Click affiliate link
   - Browse restaurants and add items to cart
   - Complete checkout
   - Verify order confirmation page loads
   - Check ClickStream analytics for conversion

### Test Commands

```bash
# Test conversion API directly
curl -X POST http://localhost:3000/api/conversions \
  -H "Content-Type: application/json" \
  -d '{
    "ref": "YOUR_LINK_ID",
    "orderId": "test-order-123",
    "orderTotal": 25.99
  }'
```

---

## Environment Variables

Add these to your food delivery app's `.env.local`:

```env
# ClickStream Configuration
NEXT_PUBLIC_CLICKSTREAM_URL=http://localhost:3000
CLICKSTREAM_API_URL=http://localhost:3000

# Your App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Database (Neon)
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

---

## Troubleshooting

### Issue: Conversions not tracking

**Check 1: Verify referral is captured**

```typescript
// Add this to your order creation API
console.log("Affiliate ref from cookie:", cookies().get("cs_ref")?.value);
```

**Check 2: Verify ClickStream API is accessible**

```bash
curl http://localhost:3000/api/conversions
# Should return 405 Method Not Allowed (GET not supported)
```

**Check 3: Check browser console for errors**

- Open DevTools → Console
- Look for CORS errors or network failures

### Issue: CORS errors

ClickStream's conversion API should accept requests from your food app. If you encounter CORS issues:

1. Verify your food app URL is correct
2. Check ClickStream's API route allows your origin
3. Test with curl to isolate the issue

### Issue: Duplicate conversion tracking

The tracking script uses localStorage to prevent duplicates. If you're still seeing duplicates:

1. Check that `orderId` is unique for each order
2. Verify localStorage is working in the browser
3. Add server-side duplicate detection (already in ClickStream)

### Issue: Cookie not being set

**Problem**: The `cs_ref` cookie isn't being set when users click affiliate links.

**Solution**:

1. Verify the ClickStream redirect includes the `ref` parameter
2. Check that your middleware is running
3. Ensure cookie settings allow the domain

```typescript
// Debug middleware
export function middleware(request: NextRequest) {
  console.log("Request URL:", request.url);
  console.log("Search params:", request.nextUrl.searchParams.toString());

  // Rest of middleware code...
}
```

---

## API Reference

### ClickStream Conversion API

**Endpoint**: `POST /api/conversions`

**Request Body**:

```json
{
  "ref": "string (required) - The affiliate link ID",
  "orderId": "string (required) - Unique order identifier",
  "orderTotal": "number (required) - Total order amount"
}
```

**Success Response** (200):

```json
{
  "success": true,
  "message": "Conversion recorded"
}
```

**Error Responses**:

400 - Validation Error:

```json
{
  "error": "Missing or invalid fields (ref, orderId, orderTotal)"
}
```

400 - Invalid Campaign:

```json
{
  "error": "Invalid link or campaign is not PPS/active"
}
```

400 - Duplicate:

```json
{
  "success": true,
  "message": "Conversion already recorded"
}
```

---

## Best Practices

### 1. Error Handling

Always wrap conversion tracking in try-catch and don't let tracking failures affect order processing:

```typescript
try {
  await trackConversion(orderId, total, ref);
} catch (error) {
  console.error("Tracking failed:", error);
  // Don't throw - order should still complete
}
```

### 2. Idempotency

Use unique order IDs to prevent duplicate conversions:

```typescript
// ClickStream automatically handles duplicate orderIds
// But your app should also check:
const existing = await prisma.conversion.findUnique({
  where: { orderId },
});
if (existing) return { success: true, message: "Already tracked" };
```

### 3. Asynchronous Tracking

Track conversions asynchronously to not block order confirmation:

```typescript
// Fire and forget - don't await
trackConversionAsync(orderData).catch(console.error);
```

### 4. Testing in Production

Use ClickStream's test mode (if available) or create test campaigns with low reward amounts.

---

## Support

For issues with:

- **ClickStream**: Check the ClickStream application logs
- **Integration**: Review this guide and check browser console
- **Database**: Verify Neon connection and schema migrations

---

## Reading Discount from Cookie

To display the discount information to users in your FoodPapa app, you need to read and parse the `cs_ref` cookie:

### Example: Discount Banner Component

```typescript
// components/AffiliateBanner.tsx
"use client";

import { useState, useEffect } from "react";
import { Gift, Tag, X } from "lucide-react";

interface AffiliateData {
  linkId: string;
  reward: number;
  type: "PPC" | "PPS";
}

export function AffiliateBanner() {
  const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(
    null
  );
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Read the cs_ref cookie
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split("=");
      if (name === "cs_ref" && value) {
        try {
          // Parse the JSON cookie value
          const data: AffiliateData = JSON.parse(decodeURIComponent(value));
          setAffiliateData(data);
          setIsVisible(true);
          console.log("[AffiliateBanner] Discount data:", data);
        } catch (e) {
          console.error("[AffiliateBanner] Failed to parse cookie:", e);
        }
        break;
      }
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible || !affiliateData) {
    return null;
  }

  // Format discount display based on campaign type
  const discountDisplay =
    affiliateData.type === "PPS"
      ? `${affiliateData.reward}% OFF`
      : `$${affiliateData.reward.toFixed(2)} OFF`;

  return (
    <div className="bg-linear-to-r from-orange-500 to-orange-600 text-white px-4 py-3 relative">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            <span className="font-semibold">Affiliate Discount Active!</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
            <Tag className="w-4 h-4" />
            <span className="text-sm font-bold">{discountDisplay}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm hidden md:block">
            You save {discountDisplay} on your order!
          </span>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Example: Apply Discount to Cart

```typescript
// lib/discount.ts

interface AffiliateData {
  linkId: string;
  reward: number;
  type: "PPC" | "PPS";
}

export function getAffiliateData(): AffiliateData | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "cs_ref" && value) {
      try {
        return JSON.parse(decodeURIComponent(value));
      } catch (e) {
        return null;
      }
    }
  }
  return null;
}

export function calculateDiscount(
  subtotal: number,
  affiliateData: AffiliateData | null
): number {
  if (!affiliateData) return 0;

  if (affiliateData.type === "PPS") {
    // Percentage discount
    return subtotal * (affiliateData.reward / 100);
  } else {
    // Fixed amount discount (PPC)
    return affiliateData.reward;
  }
}
```

### Example: Using Discount in Checkout

```typescript
// app/checkout/page.tsx

import { getAffiliateData, calculateDiscount } from "@/lib/discount";

export default function CheckoutPage() {
  const subtotal = 100.0; // Example subtotal
  const affiliateData = getAffiliateData();
  const discount = calculateDiscount(subtotal, affiliateData);
  const total = subtotal - discount;

  return (
    <div>
      <h1>Checkout</h1>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>

        {affiliateData && discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>
              Affiliate Discount (
              {affiliateData.type === "PPS"
                ? `${affiliateData.reward}%`
                : `$${affiliateData.reward}`}
              )
            </span>
            <span>-${discount.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between font-bold text-lg">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
```

---

## Quick Start Checklist

- [ ] Register as merchant on ClickStream
- [ ] Deposit funds to ClickStream wallet
- [ ] Create PPC or PPS campaign
- [ ] Add middleware to capture `ref` parameter
- [ ] Store `affiliateRef` in orders table
- [ ] Add conversion tracking to order confirmation (PPS only)
- [ ] Implement discount banner to show savings
- [ ] Apply discount to cart/checkout
- [ ] Test complete flow end-to-end
- [ ] Monitor ClickStream analytics

---

_Last Updated: March 2026_
_ClickStream Version: 1.0.0_
