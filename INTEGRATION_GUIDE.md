# ClickStream Integration Guide for Food Delivery App

This guide explains how to integrate your food delivery application (e.g., Foodpanda clone) with the ClickStream affiliate marketing system.

## Overview

ClickStream supports two tracking models:

| Model                   | Your App Changes Required | How It Works                                 |
| ----------------------- | ------------------------- | -------------------------------------------- |
| **PPC (Pay-Per-Click)** | ❌ None                   | ClickStream handles everything via redirects |
| **PPS (Pay-Per-Sale)**  | ✅ Add tracking script    | You report order completions to ClickStream  |

---

## Part 1: PPC Integration (Zero Code Changes)

**No modifications needed on your food delivery app!**

### How It Works

1. Merchant creates a PPC campaign in ClickStream targeting your app's URL (e.g., `https://yourfoodapp.com`)
2. Affiliates generate unique tracking links (e.g., `https://clickstream.com/r/abc123`)
3. When users click the affiliate link:
   - ClickStream logs the click
   - Sets a tracking cookie
   - Redirects to your app with `?ref=abc123` parameter
4. Your app works normally - no changes required

### What You Get

- Traffic attribution to affiliates
- No technical integration needed
- Works immediately

---

## Part 2: PPS Integration (Tracking Script Required)

For Pay-Per-Sale campaigns, you need to report order completions to ClickStream.

### Step 1: Add Environment Variable

Add to your food delivery app's `.env.local`:

```env
CLICKSTREAM_API_URL=https://your-clickstream-app.com
```

For local development:

```env
CLICKSTREAM_API_URL=http://localhost:3000
```

### Step 2: Create a Server Action for Conversion Tracking

Create a new file `app/actions/trackConversion.ts`:

```typescript
"use server";

interface ConversionPayload {
  ref: string; // Affiliate reference ID
  orderId: string; // Your unique order ID
  orderTotal: number; // Order total amount
}

export async function trackConversion(payload: ConversionPayload) {
  const { ref, orderId, orderTotal } = payload;

  if (!ref || !orderId || !orderTotal) {
    console.log("Missing conversion data, skipping tracking");
    return { success: false, message: "Missing data" };
  }

  try {
    const response = await fetch(
      `${process.env.CLICKSTREAM_API_URL}/api/conversions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref, orderId, orderTotal }),
      }
    );

    const result = await response.json();
    console.log("ClickStream conversion tracked:", result);
    return result;
  } catch (error) {
    console.error("ClickStream tracking failed:", error);
    // Don't throw - we don't want to break order flow if tracking fails
    return { success: false, message: "Tracking failed" };
  }
}
```

### Step 3: Get the Ref Parameter

The `ref` parameter comes from the URL when a user arrives via an affiliate link. You need to preserve it through the checkout flow.

#### Option A: URL Search Params (Recommended)

When users arrive via affiliate link, the URL will be:

```
https://yourfoodapp.com/?ref=abc123
```

Create a utility to capture and store this:

```typescript
// lib/affiliate.ts
"use client";

import { useEffect, useState } from "react";

export function useAffiliateRef() {
  const [ref, setRef] = useState<string | null>(null);

  useEffect(() => {
    // Check URL params first
    const urlParams = new URLSearchParams(window.location.search);
    const urlRef = urlParams.get("ref");

    if (urlRef) {
      // Store in sessionStorage for the checkout flow
      sessionStorage.setItem("cs_ref", urlRef);
      setRef(urlRef);
    } else {
      // Check sessionStorage (user navigated away and came back)
      const storedRef = sessionStorage.getItem("cs_ref");
      if (storedRef) setRef(storedRef);
    }

    // Also check cookie (set by ClickStream)
    const cookieMatch = document.cookie.match(/cs_ref=([^;]+)/);
    if (cookieMatch && !urlRef) {
      sessionStorage.setItem("cs_ref", cookieMatch[1]);
      setRef(cookieMatch[1]);
    }
  }, []);

  return ref;
}

export function getAffiliateRef(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("cs_ref");
}

export function clearAffiliateRef() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("cs_ref");
}
```

### Step 4: Capture Ref on App Load

In your root layout or main page component:

```typescript
// app/layout.tsx or app/page.tsx
"use client";

import { useAffiliateRef } from "@/lib/affiliate";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This captures the ref param on first load
  useAffiliateRef();

  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
```

### Step 5: Track Conversion on Order Completion

In your order confirmation/success page or server action:

```typescript
// app/actions/orders.ts (or wherever you handle order completion)
"use server";

import { trackConversion } from "./trackConversion";

export async function completeOrder(formData: FormData) {
  // Your existing order logic...
  const orderId = "ORD-" + Date.now(); // Your order ID
  const orderTotal = 45.99; // Order total from your database
  const affiliateRef = formData.get("ref") as string;

  // ... save order to database ...

  // Track conversion with ClickStream (if affiliate ref exists)
  if (affiliateRef) {
    await trackConversion({
      ref: affiliateRef,
      orderId,
      orderTotal,
    });
  }

  return { success: true, orderId };
}
```

### Step 6: Pass Ref Through Checkout Flow

In your checkout form, include the ref as a hidden field:

```typescript
// components/CheckoutForm.tsx
"use client";

import { getAffiliateRef } from "@/lib/affiliate";

export function CheckoutForm() {
  const handleSubmit = async (formData: FormData) => {
    // Add affiliate ref to form data
    const ref = getAffiliateRef();
    if (ref) {
      formData.set("ref", ref);
    }

    // Submit order...
  };

  return (
    <form action={handleSubmit}>
      {/* Your existing checkout fields */}
      <input type="hidden" name="ref" defaultValue={getAffiliateRef() || ""} />
      <button type="submit">Place Order</button>
    </form>
  );
}
```

---

## Part 3: Complete Integration Example

Here's a complete example showing the full flow:

### File Structure

```
your-food-app/
├── app/
│   ├── layout.tsx              # Capture ref on load
│   ├── page.tsx                # Homepage
│   ├── checkout/
│   │   └── page.tsx            # Checkout page
│   ├── order-success/
│   │   └── page.tsx            # Order confirmation (track here)
│   └── actions/
│       ├── orders.ts           # Order handling
│       └── trackConversion.ts  # ClickStream tracking
├── lib/
│   └── affiliate.ts            # Ref capture utilities
└── .env.local                  # CLICKSTREAM_API_URL
```

### app/order-success/page.tsx

```typescript
import { trackConversion } from "@/app/actions/trackConversion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ orderId?: string; total?: string; ref?: string }>;
}

export default async function OrderSuccessPage({ searchParams }: PageProps) {
  const { orderId, total, ref } = await searchParams;

  // Track conversion if we have all required data
  if (orderId && total && ref) {
    await trackConversion({
      ref,
      orderId,
      orderTotal: parseFloat(total),
    });
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <CardTitle>Order Confirmed!</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Your order #{orderId} has been placed successfully.
          </p>
          <p className="mt-2 font-semibold">Total: ${total}</p>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Part 4: Testing the Integration

### Test PPC (No Changes Needed)

1. Go to ClickStream → Create a PPC campaign with your app URL
2. As an affiliate, generate a tracking link
3. Click the link → You should be redirected to your app with `?ref=xxx`
4. Check ClickStream dashboard → Click should be recorded

### Test PPS (With Tracking Script)

1. Go to ClickStream → Create a PPS campaign with your app URL
2. As an affiliate, generate a tracking link
3. Click the link → Arrive at your app with `?ref=xxx`
4. Complete an order on your app
5. Check ClickStream dashboard → Conversion should be recorded

### Test Script (Manual)

You can manually test the conversion API:

```bash
curl -X POST http://localhost:3000/api/conversions \
  -H "Content-Type: application/json" \
  -d '{
    "ref": "YOUR_LINK_ID",
    "orderId": "TEST-001",
    "orderTotal": 25.99
  }'
```

Expected response:

```json
{
  "success": true,
  "message": "Conversion recorded"
}
```

---

## Part 5: API Reference

### POST /api/conversions

Record a conversion for a PPS campaign.

**Request Body:**

```json
{
  "ref": "string", // Required: Affiliate link ID
  "orderId": "string", // Required: Unique order identifier
  "orderTotal": 25.99 // Required: Order total (number)
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Conversion recorded"
}
```

**Error Response (400):**

```json
{
  "error": "Missing or invalid fields (ref, orderId, orderTotal)"
}
```

**Duplicate Response (200):**

```json
{
  "success": true,
  "message": "Conversion already recorded"
}
```

---

## Troubleshooting

| Issue                    | Solution                                            |
| ------------------------ | --------------------------------------------------- |
| Conversions not tracking | Ensure `ref` is being passed through checkout flow  |
| CORS errors              | Make sure `CLICKSTREAM_API_URL` is correct          |
| Duplicate conversions    | ClickStream automatically deduplicates by `orderId` |
| Cookie not set           | Check that PPS campaigns are active in ClickStream  |

---

## Summary

| Integration Type | Steps Required                                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| **PPC**          | None - just share your URL with ClickStream merchants                                                       |
| **PPS**          | 1. Add env var<br>2. Create tracking action<br>3. Capture ref param<br>4. Call tracking on order completion |

For questions or issues, refer to the ClickStream dashboard or contact the development team.
